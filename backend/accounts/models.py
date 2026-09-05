from django.contrib.auth.models import AbstractUser
from django.db import models


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

    id_document = models.ImageField(upload_to='id_documents/', blank=True, null=True)
    id_verification_status = models.CharField(
        max_length=20, choices=VerificationStatus.choices, default=VerificationStatus.UNSUBMITTED
    )
    id_verification_note = models.CharField(max_length=255, blank=True)

    account_status = models.CharField(max_length=20, choices=AccountStatus.choices, default=AccountStatus.ACTIVE)

    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def is_staff_role(self):
        return self.role != self.Role.ATHLETE

    def __str__(self):
        return self.get_full_name() or self.username
