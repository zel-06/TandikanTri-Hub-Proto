from django.contrib import admin

from .models import Event, EventCategory


class EventCategoryInline(admin.TabularInline):
    model = EventCategory
    extra = 1


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ['title', 'event_type', 'date', 'venue', 'status']
    list_filter = ['event_type', 'status']
    inlines = [EventCategoryInline]
