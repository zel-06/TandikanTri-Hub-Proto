from django.db.models import Sum
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import User
from audit.models import AuditLogEntry
from events.models import Event, EventCategory
from registrations.models import Payment, Registration


def _events_summary():
    rows = []
    for category in EventCategory.objects.select_related('event').all():
        fill_rate = round((category.filled_slots / category.total_slots) * 100) if category.total_slots else 0
        rows.append({
            'event': category.event.title,
            'category': category.name,
            'fill_rate': fill_rate,
            'filled_slots': category.filled_slots,
            'total_slots': category.total_slots,
        })
    return sorted(rows, key=lambda r: r['fill_rate'], reverse=True)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    user = request.user
    if user.role == User.Role.ATHLETE:
        return Response({'detail': 'No dashboard for athlete accounts.'}, status=403)

    data = {'role': user.role}

    if user.role in (User.Role.SUPER_ADMIN, User.Role.EVENT_DIRECTOR):
        data['events'] = {
            'total_events': Event.objects.count(),
            'published_events': Event.objects.filter(status=Event.Status.PUBLISHED).count(),
            'category_performance': _events_summary(),
        }

    if user.role in (User.Role.SUPER_ADMIN, User.Role.FINANCE_OFFICER):
        verified = Payment.objects.filter(status=Payment.Status.VERIFIED)
        data['finance'] = {
            'total_revenue': verified.aggregate(total=Sum('amount'))['total'] or 0,
            'pending_payments': Payment.objects.filter(status=Payment.Status.PENDING).count(),
        }

    if user.role in (User.Role.SUPER_ADMIN, User.Role.OPERATIONS_MANAGER):
        data['users'] = {
            'active_users': User.objects.filter(role=User.Role.ATHLETE, account_status='active').count(),
            'pending_id_verifications': User.objects.filter(
                role=User.Role.ATHLETE, id_verification_status='pending'
            ).count(),
            'suspended_accounts': User.objects.filter(role=User.Role.ATHLETE, account_status='suspended').count(),
        }
        data['recent_audit'] = list(
            AuditLogEntry.objects.select_related('actor').values(
                'module', 'action', 'target_description', 'created_at'
            )[:5]
        )

    if user.role == User.Role.SUPER_ADMIN:
        data['overview'] = {
            'active_users': User.objects.filter(role=User.Role.ATHLETE, account_status='active').count(),
            'total_revenue': data.get('finance', {}).get('total_revenue', 0),
            'race_registrations': Registration.objects.exclude(status=Registration.Status.CANCELLED).count(),
            'staff_admins': User.objects.exclude(role=User.Role.ATHLETE).count(),
        }

    return Response(data)
