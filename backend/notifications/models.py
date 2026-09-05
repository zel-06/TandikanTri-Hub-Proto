from django.conf import settings
from django.db import models


class Notification(models.Model):
    class Kind(models.TextChoices):
        REGISTRATION = 'registration', 'Registration'
        PAYMENT = 'payment', 'Payment'
        VERIFICATION = 'verification', 'Verification'
        SYSTEM = 'system', 'System'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.SYSTEM)
    title = models.CharField(max_length=150)
    body = models.CharField(max_length=500)
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user} · {self.title}'


def notify(user, kind, title, body):
    return Notification.objects.create(user=user, kind=kind, title=title, body=body)
