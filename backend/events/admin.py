from django.contrib import admin

from .models import Event, EventCategory


class EventCategoryInline(admin.TabularInline):
    model = EventCategory
    extra = 1


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ['title', 'discipline', 'date', 'venue', 'status']
    list_filter = ['discipline', 'status']
    inlines = [EventCategoryInline]
