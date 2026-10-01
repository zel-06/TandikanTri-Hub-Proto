from datetime import timedelta
from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone

from audit.models import AuditLogEntry

from .models import User
from .serializers import LOGIN_LOCKOUT_MINUTES, LOGIN_MAX_ATTEMPTS

LOGIN_URL = '/api/auth/login/'


# The real CACHES setting is a Postgres-backed DatabaseCache (needed so throttle counts
# are shared across Vercel's serverless instances) - its table isn't created in Django's
# throwaway test database, so these tests swap in a plain in-memory cache instead. That
# only affects request throttling, not the lockout logic itself, which is what's under test.
@override_settings(CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}})
class LoginLockoutTests(TestCase):
    def setUp(self):
        # The 'login' throttle scope's counters live in the cache, not the DB, so
        # TestCase's per-test transaction rollback doesn't reset them - without this,
        # requests from an earlier test method count against this one, since they all
        # share the same test-client IP.
        cache.clear()
        self.user = User(username='lockout_user', email='lockout_user@example.com', role=User.Role.ATHLETE)
        self.user.set_password('Str0ng!Passw0rd99')
        self.user.save()

    def _wrong_password(self):
        return self.client.post(
            LOGIN_URL, {'username': 'lockout_user', 'password': 'wrong'}, content_type='application/json',
        )

    def _correct_password(self):
        return self.client.post(
            LOGIN_URL, {'username': 'lockout_user', 'password': 'Str0ng!Passw0rd99'}, content_type='application/json',
        )

    def _lock_count(self):
        return AuditLogEntry.objects.filter(
            actor=self.user, module=AuditLogEntry.Module.SECURITY,
            action='Account locked after repeated failed logins',
        ).count()

    def test_first_lockout_after_five_wrong_passwords(self):
        for _ in range(LOGIN_MAX_ATTEMPTS - 1):
            response = self._wrong_password()
            self.assertEqual(response.status_code, 401)

        response = self._wrong_password()
        self.assertEqual(response.status_code, 400)
        self.assertIn('Too many failed attempts', str(response.data))

        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.lockout_until)
        self.assertEqual(self.user.failed_login_attempts, 0)
        self.assertEqual(self._lock_count(), 1)

    def test_login_is_blocked_during_the_lockout(self):
        for _ in range(LOGIN_MAX_ATTEMPTS):
            self._wrong_password()

        # Even the CORRECT password is rejected while genuinely locked.
        response = self._correct_password()
        self.assertEqual(response.status_code, 400)
        self.assertIn('Too many failed attempts', str(response.data))

    def test_second_lockout_after_the_first_expires(self):
        for _ in range(LOGIN_MAX_ATTEMPTS):
            self._wrong_password()
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.lockout_until)

        future = timezone.now() + timedelta(minutes=LOGIN_LOCKOUT_MINUTES + 1)
        with patch('django.utils.timezone.now', return_value=future):
            for _ in range(LOGIN_MAX_ATTEMPTS - 1):
                response = self._wrong_password()
                self.assertEqual(response.status_code, 401)

            response = self._wrong_password()
            self.assertEqual(response.status_code, 400)
            self.assertIn('Too many failed attempts', str(response.data))

        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.lockout_until)
        self.assertEqual(self.user.failed_login_attempts, 0)
        # One lockout from the first round, one from this second round.
        self.assertEqual(self._lock_count(), 2)

    def test_correct_password_after_expiry_logs_in_and_resets(self):
        for _ in range(LOGIN_MAX_ATTEMPTS):
            self._wrong_password()

        future = timezone.now() + timedelta(minutes=LOGIN_LOCKOUT_MINUTES + 1)
        with patch('django.utils.timezone.now', return_value=future):
            response = self._correct_password()
        self.assertEqual(response.status_code, 200)

        self.user.refresh_from_db()
        self.assertEqual(self.user.failed_login_attempts, 0)
        self.assertIsNone(self.user.lockout_until)

    def test_one_wrong_password_after_expiry_is_not_shown_as_locked(self):
        for _ in range(LOGIN_MAX_ATTEMPTS):
            self._wrong_password()

        future = timezone.now() + timedelta(minutes=LOGIN_LOCKOUT_MINUTES + 1)
        with patch('django.utils.timezone.now', return_value=future):
            response = self._wrong_password()

        self.assertEqual(response.status_code, 401)
        self.assertNotIn('Too many failed attempts', str(response.data))

    def test_unknown_account_always_gets_the_generic_message(self):
        response = self.client.post(
            LOGIN_URL, {'username': 'no_such_user_at_all', 'password': 'wrong'}, content_type='application/json',
        )
        self.assertEqual(response.status_code, 401)
        self.assertNotIn('Too many failed attempts', str(response.data))
