from django.utils import timezone
from rest_framework import serializers

from events.models import EventCategory
from events.serializers import EventCategorySerializer

from .models import Participant, Payment, Registration


class ParticipantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Participant
        fields = ['id', 'role', 'full_name', 'date_of_birth', 'gender', 'nationality', 'shirt_size']


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
    payment_method = serializers.ChoiceField(choices=Payment.Method.choices, write_only=True)
    proof_of_payment = serializers.ImageField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = Registration
        fields = [
            'event_category', 'team_name', 'email', 'mobile_number', 'address',
            'emergency_contact_name', 'emergency_contact_phone',
            'data_privacy_accepted', 'refund_policy_accepted', 'waiver_accepted', 'race_kit_policy_accepted',
            'participants', 'payment_method', 'proof_of_payment',
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
        payment_method = validated_data.pop('payment_method')
        proof_of_payment = validated_data.pop('proof_of_payment', None)
        category = validated_data['event_category']

        registration = Registration.objects.create(
            user=self.context['request'].user,
            agreements_accepted_at=timezone.now(),
            **validated_data,
        )
        Participant.objects.bulk_create([
            Participant(registration=registration, **participant) for participant in participants_data
        ])
        Payment.objects.create(
            registration=registration,
            method=payment_method,
            amount=category.fee,
            proof_of_payment=proof_of_payment,
        )
        return registration
