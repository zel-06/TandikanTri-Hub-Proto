import math
from datetime import timedelta

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import F, Q
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from audit.models import AuditLogEntry, log_action

from .models import User, calculate_age
from .otp import read_verification_token
from .validators import validate_password_complexity

LOGIN_MAX_ATTEMPTS = 5
LOGIN_LOCKOUT_MINUTES = 5


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    is_minor = serializers.BooleanField(read_only=True)
    has_password = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'phone', 'street', 'city', 'barangay', 'province', 'postal_code',
            'birthdate', 'is_minor', 'profile_picture', 'id_document', 'guardian_id_document',
            'id_verification_status', 'id_verification_note',
            'account_status', 'date_joined', 'has_password',
        ]
        read_only_fields = [
            'id', 'email', 'role', 'id_verification_status', 'id_verification_note',
            'account_status', 'date_joined',
        ]

    def get_has_password(self, obj):
        # False for Google-only accounts (set_unusable_password() at signup) - the
        # frontend uses this to prompt "set a password first" before letting them
        # into the verified email-change flow.
        return obj.has_usable_password()

    def update(self, instance, validated_data):
        old_picture_name = instance.profile_picture.name if instance.profile_picture else None
        old_id_name = instance.id_document.name if instance.id_document else None
        old_guardian_id_name = instance.guardian_id_document.name if instance.guardian_id_document else None

        instance = super().update(instance, validated_data)

        if old_picture_name:
            new_picture_name = instance.profile_picture.name if instance.profile_picture else None
            if old_picture_name != new_picture_name:
                try:
                    instance.profile_picture.storage.delete(old_picture_name)
                except Exception:
                    pass  # storage hiccup - the old file is just orphaned, not worth failing the request over

        new_id_name = instance.id_document.name if instance.id_document else None
        new_guardian_id_name = instance.guardian_id_document.name if instance.guardian_id_document else None
        id_changed = new_id_name != old_id_name or new_guardian_id_name != old_guardian_id_name

        # Covers both a first-time submission AND replacing an already-approved ID with a
        # different photo - either way the document on file has changed, so whatever staff
        # approved before no longer applies and it must go back through review.
        if id_changed and instance.has_required_verification_docs:
            instance.id_verification_status = User.VerificationStatus.PENDING
            instance.id_verification_note = ''
            instance.save(update_fields=['id_verification_status', 'id_verification_note'])
        return instance


class UserListSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='get_full_name', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'full_name', 'role',
            'id_document', 'guardian_id_document',
            'id_verification_status', 'account_status', 'date_joined',
        ]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=False)
    id_document = serializers.ImageField(required=True)
    birthdate = serializers.DateField(required=True)
    email_verification_token = serializers.CharField(write_only=True)
    terms_accepted = serializers.BooleanField(write_only=True)
    privacy_accepted = serializers.BooleanField(write_only=True)
    guardian_consent_name = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'first_name', 'last_name', 'phone',
            'street', 'city', 'barangay', 'province', 'postal_code',
            'birthdate', 'id_document', 'guardian_id_document',
            'password', 'password_confirm',
            'email_verification_token', 'terms_accepted', 'privacy_accepted',
            'guardian_consent_name',
        ]

    def validate(self, attrs):
        token = attrs.pop('email_verification_token')
        token_data = read_verification_token(token)
        verified_email = token_data.get('email') if token_data else None
        if not verified_email or verified_email != (attrs.get('email') or '').lower():
            raise serializers.ValidationError(
                {'email_verification_token': 'Email is not verified. Please verify your email again.'}
            )

        # send_verification_code already rejects an email already in use, but that check
        # and this create() happen far apart in time (the user fills out the rest of the
        # form in between) - re-check here to close that race instead of letting a
        # duplicate insert hit the DB's unique constraint and surface as a raw 500.
        if attrs.get('email') and User.objects.filter(email__iexact=attrs['email']).exists():
            raise serializers.ValidationError({'email': 'An account with this email already exists.'})

        password = attrs.pop('password', None)
        password_confirm = attrs.pop('password_confirm', None)
        if token_data.get('via') == 'google':
            # Email ownership was already proven via Google Sign-In - no password to set.
            attrs['_unusable_password'] = True
        else:
            if not password:
                raise serializers.ValidationError({'password': 'This field is required.'})
            if password != password_confirm:
                raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
            try:
                validate_password_complexity(password, username=attrs.get('username'), email=attrs.get('email'))
            except DjangoValidationError as exc:
                raise serializers.ValidationError({'password': list(exc.messages)})
            attrs['password'] = password

        if not attrs.pop('terms_accepted'):
            raise serializers.ValidationError({'terms_accepted': 'You must agree to the Terms and Conditions.'})
        if not attrs.pop('privacy_accepted'):
            raise serializers.ValidationError({'privacy_accepted': 'You must agree to the Privacy Policy.'})

        age = calculate_age(attrs.get('birthdate'))
        if age is not None and age < 18:
            if not attrs.get('guardian_id_document'):
                raise serializers.ValidationError(
                    {'guardian_id_document': 'A guardian or parent ID is required for applicants below 18 years old.'}
                )
            if not (attrs.get('guardian_consent_name') or '').strip():
                raise serializers.ValidationError(
                    {'guardian_consent_name': "The parent or guardian's typed full name is required as consent."}
                )
        return attrs

    def create(self, validated_data):
        unusable_password = validated_data.pop('_unusable_password', False)
        password = validated_data.pop('password', None)
        now = timezone.now()
        user = User(
            role=User.Role.ATHLETE,
            terms_accepted_at=now,
            privacy_accepted_at=now,
            **validated_data,
        )
        if unusable_password:
            user.set_unusable_password()
        else:
            user.set_password(password)
        if user.guardian_consent_name:
            user.guardian_consent_at = now
        user.id_verification_status = (
            User.VerificationStatus.PENDING if user.has_required_verification_docs
            else User.VerificationStatus.UNSUBMITTED
        )
        user.save()
        return user


class StaffAccountCreateSerializer(serializers.ModelSerializer):
    temp_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'role', 'temp_password']

    def validate_role(self, value):
        if value == User.Role.ATHLETE:
            raise serializers.ValidationError('Staff accounts must be assigned a staff role.')
        return value

    def validate_email(self, value):
        if value and User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value

    def create(self, validated_data):
        temp_password = validated_data.pop('temp_password')
        user = User(account_status=User.AccountStatus.ACTIVE, **validated_data)
        user.set_password(temp_password)
        user.save()
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    
    default_error_messages = {
        'no_active_account': 'Invalid username or password! Please try again.',
        }
        
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['full_name'] = user.get_full_name()
        return token

    def validate(self, attrs):
        login_input = attrs.get(self.username_field)
        matched_user = None
        if login_input:
            matched_user = User.objects.filter(
                Q(username__iexact=login_input) | Q(email__iexact=login_input)
            ).first()
            if matched_user:
                attrs[self.username_field] = matched_user.username

        # Per-account lockout, on top of the per-IP throttle - an unknown login_input
        # never has a matched_user, so it always falls through to the generic
        # no_active_account error below and reveals nothing about account existence.
        if matched_user and matched_user.lockout_until and matched_user.lockout_until > timezone.now():
            raise serializers.ValidationError(self._lockout_message(matched_user.lockout_until))

        try:
            data = super().validate(attrs)
        except AuthenticationFailed:
            if matched_user:
                # Gate the increment itself on "not already locked" - not just the later
                # lock-trigger step. Without this, a straggling concurrent request that
                # started before anyone was locked can still land its +1 AFTER another
                # request already set lockout_until and reset the counter to 0, dragging
                # the count back up even though the account is supposed to be locked.
                # Since each .update() is one atomic statement, Postgres serializes
                # concurrent UPDATEs to the same row - once lockout_until is set, every
                # later increment attempt's WHERE clause simply stops matching.
                rows = User.objects.filter(pk=matched_user.pk, lockout_until__isnull=True).update(
                    failed_login_attempts=F('failed_login_attempts') + 1
                )
                matched_user.refresh_from_db(fields=['failed_login_attempts', 'lockout_until'])
                if rows == 0:
                    # Already locked by a concurrent request before our increment landed.
                    raise serializers.ValidationError(self._lockout_message(matched_user.lockout_until)) from None
                if matched_user.failed_login_attempts >= LOGIN_MAX_ATTEMPTS:
                    lockout_until = timezone.now() + timedelta(minutes=LOGIN_LOCKOUT_MINUTES)
                    # Conditional UPDATE as a lock-free compare-and-swap: only the request that
                    # actually flips lockout_until from NULL gets rows_locked > 0, so under a
                    # burst of concurrent failures exactly one of them logs the audit entry -
                    # the rest just see lockout_until already set and report the same message.
                    rows_locked = User.objects.filter(pk=matched_user.pk, lockout_until__isnull=True).update(
                        lockout_until=lockout_until, failed_login_attempts=0,
                    )
                    if rows_locked:
                        log_action(
                            matched_user, AuditLogEntry.Module.SECURITY,
                            'Account locked after repeated failed logins', target_description=str(matched_user),
                        )
                    else:
                        matched_user.refresh_from_db(fields=['lockout_until'])
                        lockout_until = matched_user.lockout_until
                    raise serializers.ValidationError(self._lockout_message(lockout_until)) from None
            raise

        if matched_user and (matched_user.failed_login_attempts or matched_user.lockout_until):
            matched_user.failed_login_attempts = 0
            matched_user.lockout_until = None
            matched_user.save(update_fields=['failed_login_attempts', 'lockout_until'])

        if self.user.account_status == User.AccountStatus.SUSPENDED:
            raise serializers.ValidationError('This account has been suspended.')
        if self.user.account_status == User.AccountStatus.DELETED:
            raise serializers.ValidationError('This account no longer exists.')
        data['user'] = UserSerializer(self.user).data
        return data

    @staticmethod
    def _lockout_message(lockout_until):
        minutes = max(1, math.ceil((lockout_until - timezone.now()).total_seconds() / 60))
        return f'Too many failed attempts. Please try again in {minutes} minute{"s" if minutes != 1 else ""}.'
