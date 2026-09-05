from django.conf import settings
from django.db import models

from events.models import EventCategory


class Registration(models.Model):
    class Status(models.TextChoices):
        PENDING_VERIFICATION = 'pending_verification', 'Pending Verification'
        CONFIRMED = 'confirmed', 'Confirmed'
        REJECTED = 'rejected', 'Rejected'
        CANCELLED = 'cancelled', 'Cancelled'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='registrations')
    event_category = models.ForeignKey(EventCategory, on_delete=models.CASCADE, related_name='registrations')

    team_name = models.CharField(max_length=150, blank=True)
    email = models.EmailField()
    mobile_number = models.CharField(max_length=20)
    address = models.CharField(max_length=255, blank=True)
    emergency_contact_name = models.CharField(max_length=150, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)

    data_privacy_accepted = models.BooleanField(default=False)
    refund_policy_accepted = models.BooleanField(default=False)
    waiver_accepted = models.BooleanField(default=False)
    race_kit_policy_accepted = models.BooleanField(default=False)
    agreements_accepted_at = models.DateTimeField(null=True, blank=True)

    status = models.CharField(max_length=25, choices=Status.choices, default=Status.PENDING_VERIFICATION)
    bib_number = models.CharField(max_length=20, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user} · {self.event_category}'


class Participant(models.Model):
    class Gender(models.TextChoices):
        MALE = 'male', 'Male'
        FEMALE = 'female', 'Female'

    class ShirtSize(models.TextChoices):
        XS = 'XS', 'XS'
        S = 'S', 'S'
        M = 'M', 'M'
        L = 'L', 'L'
        XL = 'XL', 'XL'
        XXL = '2XL', '2XL'

    registration = models.ForeignKey(Registration, on_delete=models.CASCADE, related_name='participants')
    role = models.CharField(max_length=50, blank=True, help_text='Relay role, e.g. Swimmer. Blank for solo.')
    full_name = models.CharField(max_length=150)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=10, choices=Gender.choices)
    nationality = models.CharField(max_length=80, default='Filipino')
    shirt_size = models.CharField(max_length=5, choices=ShirtSize.choices)

    def __str__(self):
        return self.full_name


class Payment(models.Model):
    class Method(models.TextChoices):
        GCASH = 'gcash', 'GCash'
        PALAWANPAY = 'palawanpay', 'PalawanPay'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        VERIFIED = 'verified', 'Verified'
        REJECTED = 'rejected', 'Rejected'

    registration = models.OneToOneField(Registration, on_delete=models.CASCADE, related_name='payment')
    method = models.CharField(max_length=20, choices=Method.choices)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    proof_of_payment = models.ImageField(upload_to='payment_proofs/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_payments'
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.registration} · {self.amount}'
