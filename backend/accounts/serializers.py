from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='get_full_name', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'phone', 'street', 'city', 'barangay', 'province', 'postal_code',
            'id_document', 'id_verification_status', 'id_verification_note',
            'account_status', 'date_joined',
        ]
        read_only_fields = [
            'id', 'role', 'id_verification_status', 'id_verification_note',
            'account_status', 'date_joined',
        ]


class UserListSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='get_full_name', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'full_name', 'role',
            'id_verification_status', 'account_status', 'date_joined',
        ]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'first_name', 'last_name', 'phone',
            'street', 'city', 'barangay', 'province', 'postal_code',
            'id_document', 'password', 'password_confirm',
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password_confirm'):
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(role=User.Role.ATHLETE, **validated_data)
        user.set_password(password)
        if user.id_document:
            user.id_verification_status = User.VerificationStatus.PENDING
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
