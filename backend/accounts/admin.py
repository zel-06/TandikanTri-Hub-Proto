from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class TandikanUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'role', 'id_verification_status', 'account_status', 'is_superuser']
    list_filter = ['role', 'id_verification_status', 'account_status']
    fieldsets = UserAdmin.fieldsets + (
        ('Tandikan Profile', {
            'fields': (
                'role', 'phone', 'street', 'city', 'barangay', 'province', 'postal_code',
                'id_document', 'id_verification_status', 'id_verification_note', 'account_status',
            ),
        }),
    )
