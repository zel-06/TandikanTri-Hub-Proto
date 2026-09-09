from rest_framework.permissions import BasePermission

from .models import User


def _role_permission(*roles):
    class _RolePermission(BasePermission):
        def has_permission(self, request, view):
            return bool(
                request.user
                and request.user.is_authenticated
                and request.user.role in roles
            )

    return _RolePermission


IsSuperAdmin = _role_permission(User.Role.SUPER_ADMIN)
IsEventStaff = _role_permission(User.Role.SUPER_ADMIN, User.Role.EVENT_DIRECTOR)
IsFinanceStaff = _role_permission(User.Role.SUPER_ADMIN, User.Role.FINANCE_OFFICER)
IsOperationsStaff = _role_permission(User.Role.SUPER_ADMIN, User.Role.OPERATIONS_MANAGER)
IsAnyStaff = _role_permission(
    User.Role.SUPER_ADMIN,
    User.Role.EVENT_DIRECTOR,
    User.Role.FINANCE_OFFICER,
    User.Role.OPERATIONS_MANAGER,
)


class IsVerifiedUser(BasePermission):
    message = 'Your ID verification must be approved before you can register for an event.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.id_verification_status == User.VerificationStatus.APPROVED
        )
