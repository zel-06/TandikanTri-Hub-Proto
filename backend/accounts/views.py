import csv
import secrets

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from django.db import IntegrityError
from django.http import HttpResponse
from django.utils import timezone
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from audit.models import AuditLogEntry, log_action
from notifications.models import Notification, notify

from .models import EmailVerification, User
from .otp import (
    CODE_TTL_MINUTES,
    RESEND_COOLDOWN_SECONDS,
    code_expiry,
    generate_code,
    make_reset_token,
    make_verification_token,
    read_reset_email,
    send_password_reset_email,
    send_verification_email,
)
from .permissions import IsOperationsStaff, IsSuperAdmin
from .serializers import (
    CustomTokenObtainPairSerializer,
    RegisterSerializer,
    StaffAccountCreateSerializer,
    UserListSerializer,
    UserSerializer,
)
from .validators import validate_password_complexity


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


@api_view(['POST'])
@permission_classes([AllowAny])
def send_verification_code(request):
    email = (request.data.get('email') or '').strip().lower()
    if not email:
        return Response({'email': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        validate_email(email)
    except DjangoValidationError:
        return Response({'email': 'Enter a valid email address.'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(email__iexact=email).exists():
        return Response({'email': 'An account with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

    existing = EmailVerification.objects.filter(email=email).first()
    if existing:
        seconds_since_sent = (timezone.now() - existing.created_at).total_seconds()
        if seconds_since_sent < RESEND_COOLDOWN_SECONDS:
            wait = int(RESEND_COOLDOWN_SECONDS - seconds_since_sent)
            return Response(
                {'email': f'Please wait {wait}s before requesting a new code.', 'retry_after_seconds': wait},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        existing.delete()

    code = generate_code()
    try:
        record = EmailVerification.objects.create(email=email, code=code, expires_at=code_expiry())
    except IntegrityError:
        # Another request for the same email won the race between our cooldown check
        # and this insert (e.g. a double-click) - the unique constraint on email caught it.
        return Response(
            {'email': 'A verification code was just requested for this email. Please wait a moment and try again.'},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    try:
        send_verification_email(email, code)
    except Exception:
        record.delete()
        return Response(
            {'non_field': 'We could not send the verification email right now. Please try again shortly.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    return Response({
        'detail': 'Verification code sent.',
        'cooldown_seconds': RESEND_COOLDOWN_SECONDS,
        'expires_in_seconds': CODE_TTL_MINUTES * 60,
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_email_code(request):
    email = (request.data.get('email') or '').strip().lower()
    code = (request.data.get('code') or '').strip()

    try:
        record = EmailVerification.objects.get(email=email)
    except EmailVerification.DoesNotExist:
        return Response({'code': 'No verification code was sent to this email.'}, status=status.HTTP_400_BAD_REQUEST)

    if record.expires_at < timezone.now():
        return Response({'code': 'This code has expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)
    if record.code != code:
        return Response({'code': 'Incorrect verification code.'}, status=status.HTTP_400_BAD_REQUEST)

    record.is_verified = True
    record.verified_at = timezone.now()
    record.save(update_fields=['is_verified', 'verified_at'])

    return Response({'verification_token': make_verification_token(email)})


@api_view(['POST'])
@permission_classes([AllowAny])
def google_auth(request):
    credential = request.data.get('credential')
    if not credential:
        return Response({'credential': 'Missing Google credential.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        idinfo = google_id_token.verify_oauth2_token(
            credential, google_requests.Request(), settings.GOOGLE_CLIENT_ID
        )
    except ValueError:
        return Response({'credential': 'Invalid Google credential.'}, status=status.HTTP_400_BAD_REQUEST)

    if not idinfo.get('email_verified'):
        return Response({'credential': 'Google account email is not verified.'}, status=status.HTTP_400_BAD_REQUEST)

    email = idinfo['email'].lower()
    user = User.objects.filter(email__iexact=email).exclude(account_status=User.AccountStatus.DELETED).first()

    if user:
        if user.account_status == User.AccountStatus.SUSPENDED:
            return Response({'detail': 'This account has been suspended.'}, status=status.HTTP_403_FORBIDDEN)
        token = CustomTokenObtainPairSerializer.get_token(user)
        return Response({
            'account_exists': True,
            'access': str(token.access_token),
            'refresh': str(token),
            'user': UserSerializer(user).data,
        })

    return Response({
        'account_exists': False,
        'email_verification_token': make_verification_token(email, via='google'),
        'prefill': {
            'email': email,
            'first_name': idinfo.get('given_name', ''),
            'last_name': idinfo.get('family_name', ''),
        },
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def request_password_reset_code(request):
    email = (request.data.get('email') or '').strip().lower()
    if not email:
        return Response({'email': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        validate_email(email)
    except DjangoValidationError:
        return Response({'email': 'Enter a valid email address.'}, status=status.HTTP_400_BAD_REQUEST)

    # Always return the same generic response, whether or not an account exists for this
    # email, so the response can't be used to enumerate registered accounts.
    generic_response = Response({
        'detail': 'If an account exists for this email, a reset code has been sent.',
        'cooldown_seconds': RESEND_COOLDOWN_SECONDS,
        'expires_in_seconds': CODE_TTL_MINUTES * 60,
    })

    user = User.objects.filter(email__iexact=email).first()
    if not user:
        return generic_response

    existing = EmailVerification.objects.filter(email=email).first()
    if existing:
        seconds_since_sent = (timezone.now() - existing.created_at).total_seconds()
        if seconds_since_sent < RESEND_COOLDOWN_SECONDS:
            return generic_response
        existing.delete()

    code = generate_code()
    try:
        record = EmailVerification.objects.create(email=email, code=code, expires_at=code_expiry())
    except IntegrityError:
        return generic_response

    try:
        send_password_reset_email(email, code)
    except Exception:
        record.delete()
        return generic_response

    return generic_response


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_password_reset_code(request):
    email = (request.data.get('email') or '').strip().lower()
    code = (request.data.get('code') or '').strip()

    try:
        record = EmailVerification.objects.get(email=email)
    except EmailVerification.DoesNotExist:
        return Response({'code': 'Invalid or expired code.'}, status=status.HTTP_400_BAD_REQUEST)

    if record.expires_at < timezone.now() or record.code != code:
        return Response({'code': 'Invalid or expired code.'}, status=status.HTTP_400_BAD_REQUEST)

    record.is_verified = True
    record.verified_at = timezone.now()
    record.save(update_fields=['is_verified', 'verified_at'])

    return Response({'reset_token': make_reset_token(email)})


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    token = request.data.get('reset_token')
    new_password = request.data.get('new_password', '')

    email = read_reset_email(token)
    if not email:
        return Response(
            {'reset_token': 'This reset session has expired. Please request a new code.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        return Response(
            {'reset_token': 'This reset session has expired. Please request a new code.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        validate_password_complexity(new_password, username=user.username, email=user.email)
        validate_password(new_password, user=user)
    except DjangoValidationError as exc:
        return Response({'new_password': list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save(update_fields=['password'])
    EmailVerification.objects.filter(email=email).delete()

    log_action(user, AuditLogEntry.Module.SECURITY, 'Password reset via forgot password', target_description=str(user))
    return Response(status=status.HTTP_204_NO_CONTENT)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request):
        if not request.user.check_password(request.data.get('password', '')):
            return Response({'password': 'Incorrect password.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        log_action(user, AuditLogEntry.Module.SECURITY, 'Account self-deleted', target_description=str(user))

        # Soft-delete: the row stays so existing event registrations/payments keep a
        # valid FK to it, but the username/email are freed up for a fresh signup and
        # the password is made permanently unusable.
        user.username = f'deleted_user_{user.id}'
        user.email = ''
        user.account_status = User.AccountStatus.DELETED
        user.set_unusable_password()
        user.save(update_fields=['username', 'email', 'account_status', 'password'])

        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    current_password = request.data.get('current_password', '')
    new_password = request.data.get('new_password', '')
    if not request.user.check_password(current_password):
        return Response({'current_password': 'Incorrect password.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        validate_password(new_password, user=request.user)
    except DjangoValidationError as exc:
        return Response({'new_password': list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)
    request.user.set_password(new_password)
    request.user.save(update_fields=['password'])
    return Response(status=status.HTTP_204_NO_CONTENT)


class UserListView(generics.ListAPIView):
    """Pending ID verifications + full user directory, for Operations Manager / Super Admin."""

    serializer_class = UserListSerializer
    permission_classes = [IsOperationsStaff]

    def get_queryset(self):
        qs = User.objects.filter(role=User.Role.ATHLETE).order_by('-date_joined')
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                username__icontains=search
            ) | qs.filter(email__icontains=search) | qs.filter(first_name__icontains=search) | qs.filter(
                last_name__icontains=search
            )
        verification_status = self.request.query_params.get('verification_status')
        if verification_status:
            qs = qs.filter(id_verification_status=verification_status)
        account_status = self.request.query_params.get('account_status')
        if account_status:
            qs = qs.filter(account_status=account_status)
        return qs.distinct()


@api_view(['POST'])
@permission_classes([IsOperationsStaff])
def verify_id(request, pk):
    try:
        user = User.objects.get(pk=pk, role=User.Role.ATHLETE)
    except User.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    decision = request.data.get('decision')
    if decision not in ('approved', 'rejected'):
        return Response({'decision': 'Must be "approved" or "rejected".'}, status=status.HTTP_400_BAD_REQUEST)
    user.id_verification_status = decision
    user.id_verification_note = request.data.get('note', '')
    user.save(update_fields=['id_verification_status', 'id_verification_note'])

    log_action(
        request.user, AuditLogEntry.Module.USERS, f'ID verification {decision}', target_description=str(user),
    )
    notify(
        user, Notification.Kind.VERIFICATION,
        'ID Verification Approved' if decision == 'approved' else 'ID Verification Rejected',
        'Your identity document has been approved.' if decision == 'approved'
        else f'Your identity document was rejected. {user.id_verification_note}'.strip(),
    )
    return Response(UserSerializer(user).data)


@api_view(['POST'])
@permission_classes([IsOperationsStaff])
def set_account_status(request, pk):
    try:
        user = User.objects.get(pk=pk, role=User.Role.ATHLETE)
    except User.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    new_status = request.data.get('status')
    if new_status not in (User.AccountStatus.ACTIVE, User.AccountStatus.SUSPENDED):
        return Response({'status': 'Must be "active" or "suspended".'}, status=status.HTTP_400_BAD_REQUEST)
    user.account_status = new_status
    user.save(update_fields=['account_status'])
    log_action(
        request.user, AuditLogEntry.Module.SECURITY, f'Account {new_status}', target_description=str(user),
    )
    return Response(UserSerializer(user).data)


@api_view(['GET'])
@permission_classes([IsOperationsStaff])
def export_users_csv(request):
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="users.csv"'
    writer = csv.writer(response)
    writer.writerow(['Username', 'Full Name', 'Email', 'ID Verification', 'Account Status', 'Joined'])
    for user in User.objects.filter(role=User.Role.ATHLETE):
        writer.writerow([
            user.username, user.get_full_name(), user.email,
            user.id_verification_status, user.account_status, user.date_joined.isoformat(),
        ])
    return response


class StaffAccountListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsSuperAdmin]
    queryset = User.objects.exclude(role=User.Role.ATHLETE).order_by('-date_joined')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return StaffAccountCreateSerializer
        return UserListSerializer

    def perform_create(self, serializer):
        user = serializer.save()
        log_action(
            self.request.user, AuditLogEntry.Module.ROLES, 'Created staff account',
            target_description=f'{user} ({user.get_role_display()})',
        )


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def reset_staff_password(request, pk):
    try:
        user = User.objects.exclude(role=User.Role.ATHLETE).get(pk=pk)
    except User.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    temp_password = secrets.token_urlsafe(9)
    user.set_password(temp_password)
    user.save(update_fields=['password'])
    log_action(request.user, AuditLogEntry.Module.ROLES, 'Reset staff password', target_description=str(user))
    return Response({'temp_password': temp_password})


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def set_staff_account_status(request, pk):
    try:
        user = User.objects.exclude(role=User.Role.ATHLETE).get(pk=pk)
    except User.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    new_status = request.data.get('status')
    if new_status not in (User.AccountStatus.ACTIVE, User.AccountStatus.SUSPENDED):
        return Response({'status': 'Must be "active" or "suspended".'}, status=status.HTTP_400_BAD_REQUEST)
    user.account_status = new_status
    user.save(update_fields=['account_status'])
    action = 'Reactivated staff account' if new_status == User.AccountStatus.ACTIVE else 'Revoked staff account'
    log_action(request.user, AuditLogEntry.Module.ROLES, action, target_description=str(user))
    return Response(UserListSerializer(user).data)


@api_view(['DELETE'])
@permission_classes([IsSuperAdmin])
def delete_staff_account(request, pk):
    try:
        user = User.objects.exclude(role=User.Role.ATHLETE).get(pk=pk)
    except User.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    description = str(user)
    user.delete()
    log_action(request.user, AuditLogEntry.Module.ROLES, 'Deleted staff account', target_description=description)
    return Response(status=status.HTTP_204_NO_CONTENT)
