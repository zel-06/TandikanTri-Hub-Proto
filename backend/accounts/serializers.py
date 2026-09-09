from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User, calculate_age


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    is_minor = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'phone', 'street', 'city', 'barangay', 'province', 'postal_code',
            'birthdate', 'is_minor', 'id_document', 'guardian_id_document',
            'id_verification_status', 'id_verification_note',
            'account_status', 'date_joined',
        ]
        read_only_fields = [
            'id', 'role', 'id_verification_status', 'id_verification_note',
            'account_status', 'date_joined',
        ]

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        if (
            instance.id_verification_status in (User.VerificationStatus.UNSUBMITTED, User.VerificationStatus.REJECTED)
            and instance.has_required_verification_docs
        ):
            instance.id_verification_status = User.VerificationStatus.PENDING
            instance.id_verification_note = ''
            instance.save(update_fields=['id_verification_status', 'id_verification_note'])
        return instance


class UserListSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='get_full_name', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'full_name', 'role',
            'id_document', 'guardian_id_document',
            'id_verification_status', 'account_status', 'date_joined',
        ]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    id_document = serializers.ImageField(required=True)
    birthdate = serializers.DateField(required=True)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'first_name', 'last_name', 'phone',
            'street', 'city', 'barangay', 'province', 'postal_code',
            'birthdate', 'id_document', 'guardian_id_document',
            'password', 'password_confirm',
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password_confirm'):
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        age = calculate_age(attrs.get('birthdate'))
        if age is not None and age < 18 and not attrs.get('guardian_id_document'):
            raise serializers.ValidationError(
                {'guardian_id_document': 'A guardian or parent ID is required for applicants below 18 years old.'}
            )
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(role=User.Role.ATHLETE, **validated_data)
        user.set_password(password)
        user.id_verification_status = (
            User.VerificationStatus.PENDING if user.has_required_verification_docs
            else User.VerificationStatus.UNSUBMITTED
        )
        user.save()
        return user


class StaffAccountCreateSerializer(serializers.ModelSerializer):
    temp_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'role', 'temp_password']

    def validate_role(self, value):
        if value == User.Role.ATHLETE:
            raise serializers.ValidationError('Staff accounts must be assigned a staff role.')
        return value

    def create(self, validated_data):
        temp_password = validated_data.pop('temp_password')
        user = User(account_status=User.AccountStatus.ACTIVE, **validated_data)
        user.set_password(temp_password)
        user.save()
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['full_name'] = user.get_full_name()
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        if self.user.account_status == User.AccountStatus.SUSPENDED:
            raise serializers.ValidationError('This account has been suspended.')
        data['user'] = UserSerializer(self.user).data
        return data
