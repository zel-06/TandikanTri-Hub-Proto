import csv
import secrets

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import HttpResponse
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from audit.models import AuditLogEntry, log_action
from notifications.models import Notification, notify

from .models import User
from .permissions import IsOperationsStaff, IsSuperAdmin
from .serializers import (
    CustomTokenObtainPairSerializer,
    RegisterSerializer,
    StaffAccountCreateSerializer,
    UserListSerializer,
    UserSerializer,
)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


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
