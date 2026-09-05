from django.conf import settings
from django.db import models


class AuditLogEntry(models.Model):
    class Module(models.TextChoices):
        EVENTS = 'events', 'Events'
        FINANCE = 'finance', 'Finance'
        USERS = 'users', 'Users'
        SECURITY = 'security', 'Security'
        ROLES = 'roles', 'Roles'

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='audit_entries'
    )
    module = models.CharField(max_length=20, choices=Module.choices)
    action = models.CharField(max_length=255)
    target_description = models.CharField(max_length=255, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.actor} · {self.module} · {self.action}'


def log_action(actor, module, action, target_description='', **metadata):
    return AuditLogEntry.objects.create(
        actor=actor,
        module=module,
        action=action,
        target_description=target_description,
        metadata=metadata,
    )
