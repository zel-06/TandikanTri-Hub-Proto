from datetime import date

from django.contrib.auth.models import AbstractUser
from django.db import models
from config.storage_backends import PublicMediaStorage, PrivateIDStorage


def calculate_age(birthdate):
    if not birthdate:
        return None
    today = date.today()
    return today.year - birthdate.year - ((today.month, today.day) < (birthdate.month, birthdate.day))


class User(AbstractUser):
    class Role(models.TextChoices):
        ATHLETE = 'athlete', 'Athlete'
        SUPER_ADMIN = 'super_admin', 'Super Admin'
        EVENT_DIRECTOR = 'event_director', 'Event Director'
        FINANCE_OFFICER = 'finance_officer', 'Finance Officer'
        OPERATIONS_MANAGER = 'operations_manager', 'Operations Manager'

    class VerificationStatus(models.TextChoices):
        UNSUBMITTED = 'unsubmitted', 'Unsubmitted'
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'

    class AccountStatus(models.TextChoices):
        ACTIVE = 'active', 'Active'
        SUSPENDED = 'suspended', 'Suspended'

    role = models.CharField(max_length=32, choices=Role.choices, default=Role.ATHLETE)

    phone = models.CharField(max_length=20, blank=True)
    street = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=120, blank=True)
    barangay = models.CharField(max_length=120, blank=True)
    province = models.CharField(max_length=120, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)

    birthdate = models.DateField(null=True, blank=True)

    id_document = models.ImageField(upload_to='id_documents/', storage=PrivateIDStorage(), blank=True, null=True)
    guardian_id_document = models.ImageField(
        upload_to='guardian_id_documents/', storage=PrivateIDStorage(), blank=True, null=True
    )
    id_verification_status = models.CharField(
        max_length=20, choices=VerificationStatus.choices, default=VerificationStatus.UNSUBMITTED
    )
    id_verification_note = models.CharField(max_length=255, blank=True)

    account_status = models.CharField(max_length=20, choices=AccountStatus.choices, default=AccountStatus.ACTIVE)

    terms_accepted_at = models.DateTimeField(null=True, blank=True)
    privacy_accepted_at = models.DateTimeField(null=True, blank=True)
    guardian_consent_name = models.CharField(max_length=255, blank=True)
    guardian_consent_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def is_staff_role(self):
        return self.role != self.Role.ATHLETE

    @property
    def is_minor(self):
        age = calculate_age(self.birthdate)
        return age is not None and age < 18

    @property
    def has_required_verification_docs(self):
        if not self.id_document:
            return False
        if self.is_minor and not self.guardian_id_document:
            return False
        return True

    def __str__(self):
        return self.get_full_name() or self.username


class EmailVerification(models.Model):
    """Tracks an OTP code sent to an email address before the account exists.

    Registration is split across a multi-step form; the account itself is only
    created on the final step, so there is no User yet to attach a code to.
    """

    email = models.EmailField(unique=True)
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.email
