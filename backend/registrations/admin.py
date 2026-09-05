from django.contrib import admin

from .models import Participant, Payment, Registration


class ParticipantInline(admin.TabularInline):
    model = Participant
    extra = 0


class PaymentInline(admin.StackedInline):
    model = Payment
    extra = 0


@admin.register(Registration)
class RegistrationAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'event_category', 'status', 'bib_number', 'created_at']
    list_filter = ['status']
    inlines = [ParticipantInline, PaymentInline]
