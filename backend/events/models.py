from django.conf import settings
from django.db import models


class Event(models.Model):
    class Discipline(models.TextChoices):
        MARATHON = 'marathon', 'Marathon'
        DUATHLON = 'duathlon', 'Duathlon'
        TRIATHLON = 'triathlon', 'Triathlon'

    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        PUBLISHED = 'published', 'Published'

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    venue = models.CharField(max_length=200)
    date = models.DateField()
    time = models.TimeField(null=True, blank=True)
    discipline = models.CharField(max_length=20, choices=Discipline.choices)
    distance = models.CharField(
        max_length=200, blank=True, help_text='e.g. "3km swim - 180km bike - 42km run"'
    )
    hero_image = models.ImageField(upload_to='events/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['date']

    def __str__(self):
        return self.title


class EventCategory(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='categories')
    name = models.CharField(max_length=100)
    fee = models.DecimalField(max_digits=10, decimal_places=2)
    total_slots = models.PositiveIntegerField(default=0)
    is_relay = models.BooleanField(default=False)
    relay_roles = models.JSONField(default=list, blank=True, help_text='e.g. ["Swimmer","Cyclist","Runner"]')
    kit_inclusions = models.TextField(blank=True)
    registration_deadline = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name_plural = 'event categories'

    @property
    def filled_slots(self):
        return self.registrations.exclude(status='cancelled').count()

    @property
    def slots_left(self):
        return max(self.total_slots - self.filled_slots, 0)

    @property
    def participants_required(self):
        return len(self.relay_roles) if self.is_relay else 1

    def __str__(self):
        return f'{self.event.title} · {self.name}'
