from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from events.models import EventCategory
from events.serializers import EventCategorySerializer

from .models import Participant, Payment, Registration


class ParticipantSerializer(serializers.ModelSerializer):
    bib_number = serializers.CharField(source='registration.bib_number', read_only=True)
    status = serializers.CharField(source='registration.get_status_display', read_only=True)
    category = serializers.CharField(source='registration.event_category.name', read_only=True)
    distance = serializers.CharField(source='registration.event_category.event.distance', read_only=True)
    team_name = serializers.CharField(source='registration.team_name', read_only=True)
    email = serializers.EmailField(source='registration.email', read_only=True)
    mobile_number = serializers.CharField(source='registration.mobile_number', read_only=True)

    class Meta:
        model = Participant
        fields = [
            'id', 'role', 'full_name', 'date_of_birth', 'gender', 'nationality', 'shirt_size',
            'bib_number', 'status', 'category', 'distance', 'team_name', 'email', 'mobile_number',
        ]


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'id', 'method', 'amount', 'proof_of_payment', 'status', 'verified_by', 'verified_at', 'created_at',
        ]
        read_only_fields = ['amount', 'status', 'verified_by', 'verified_at']


class RegistrationSerializer(serializers.ModelSerializer):
    participants = ParticipantSerializer(many=True, read_only=True)
    payment = PaymentSerializer(read_only=True)
    event_category = EventCategorySerializer(read_only=True)
    athlete_name = serializers.CharField(source='user.get_full_name', read_only=True)

    class Meta:
        model = Registration
        fields = [
            'id', 'user', 'athlete_name', 'event_category', 'team_name', 'email', 'mobile_number', 'address',
            'emergency_contact_name', 'emergency_contact_phone', 'status', 'bib_number',
            'data_privacy_accepted', 'refund_policy_accepted', 'waiver_accepted', 'race_kit_policy_accepted',
            'participants', 'payment', 'created_at',
        ]


class RegistrationCreateSerializer(serializers.ModelSerializer):
    participants = ParticipantSerializer(many=True)

    class Meta:
        model = Registration
        fields = [
            'event_category', 'team_name', 'email', 'mobile_number', 'address',
            'emergency_contact_name', 'emergency_contact_phone',
            'data_privacy_accepted', 'refund_policy_accepted', 'waiver_accepted', 'race_kit_policy_accepted',
            'participants',
        ]

    def validate(self, attrs):
        category: EventCategory = attrs['event_category']
        if category.slots_left <= 0:
            raise serializers.ValidationError('This category is fully booked.')

        participants = attrs.get('participants', [])
        if len(participants) != category.participants_required:
            raise serializers.ValidationError(
                f'This category requires exactly {category.participants_required} participant(s).'
            )
        if category.is_relay:
            expected_roles = list(category.relay_roles)
            given_roles = [p.get('role', '') for p in participants]
            if sorted(given_roles) != sorted(expected_roles):
                raise serializers.ValidationError(f'Relay participants must fill roles: {expected_roles}.')

        for field in ('data_privacy_accepted', 'refund_policy_accepted', 'waiver_accepted', 'race_kit_policy_accepted'):
            if not attrs.get(field):
                raise serializers.ValidationError('All agreements must be accepted.')

        return attrs

    def create(self, validated_data):
        participants_data = validated_data.pop('participants')
        category = validated_data['event_category']

        with transaction.atomic():
            # Re-check capacity under a lock: validate() already did an optimistic
            # check, but that can go stale if other requests for this category are
            # racing with this one — this is the authoritative, race-proof check.
            locked_category = EventCategory.objects.select_for_update().get(pk=category.pk)
            if locked_category.slots_left <= 0:
                raise serializers.ValidationError('This category is fully booked.')

            registration = Registration.objects.create(
                user=self.context['request'].user,
                agreements_accepted_at=timezone.now(),
                **validated_data,
            )
            Participant.objects.bulk_create([
                Participant(registration=registration, **participant) for participant in participants_data
            ])
            # method is left blank — PayMongo's webhook fills it in once the athlete actually pays.
            Payment.objects.create(registration=registration, amount=category.fee)
        return registration
