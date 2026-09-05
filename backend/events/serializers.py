from rest_framework import serializers

from .models import Event, EventCategory


class EventCategorySerializer(serializers.ModelSerializer):
    filled_slots = serializers.IntegerField(read_only=True)
    slots_left = serializers.IntegerField(read_only=True)
    participants_required = serializers.IntegerField(read_only=True)
    event_title = serializers.CharField(source='event.title', read_only=True)

    class Meta:
        model = EventCategory
        fields = [
            'id', 'event', 'event_title', 'name', 'fee', 'total_slots', 'filled_slots', 'slots_left',
            'is_relay', 'relay_roles', 'kit_inclusions', 'registration_deadline', 'participants_required',
        ]
        read_only_fields = ['event']


class EventSerializer(serializers.ModelSerializer):
    categories = EventCategorySerializer(many=True, read_only=True)

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'venue', 'date', 'time', 'discipline', 'distance',
            'hero_image', 'status', 'categories', 'created_at', 'updated_at',
        ]


class EventWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'venue', 'date', 'time', 'discipline', 'distance',
            'hero_image', 'status',
        ]
