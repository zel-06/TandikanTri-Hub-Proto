from django.contrib import admin

from .models import AuditLogEntry


@admin.register(AuditLogEntry)
class AuditLogEntryAdmin(admin.ModelAdmin):
    list_display = ['created_at', 'actor', 'module', 'action', 'target_description']
    list_filter = ['module']
