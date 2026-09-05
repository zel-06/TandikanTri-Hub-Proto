import csv
import random

from django.db.models import Count, Sum
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsFinanceStaff
from audit.models import AuditLogEntry, log_action
from notifications.models import Notification, notify

from .models import Payment, Registration
from .serializers import PaymentSerializer, RegistrationCreateSerializer, RegistrationSerializer


class RegistrationCreateView(generics.CreateAPIView):
    serializer_class = RegistrationCreateSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        registration = serializer.save()
        notify(
            request.user, Notification.Kind.REGISTRATION, 'Registration Submitted',
            f'Your registration for {registration.event_category.event.title} is pending payment verification.',
        )
        return Response(RegistrationSerializer(registration).data, status=status.HTTP_201_CREATED)


class MyRegistrationsListView(generics.ListAPIView):
    serializer_class = RegistrationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Registration.objects.filter(user=self.request.user).select_related(
            'event_category', 'event_category__event', 'payment'
        ).prefetch_related('participants')


class PaymentQueueListView(generics.ListAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [IsFinanceStaff]

    def get_queryset(self):
        qs = Payment.objects.select_related('registration', 'registration__user').all()
        payment_status = self.request.query_params.get('status')
        if payment_status:
            qs = qs.filter(status=payment_status)
        return qs.order_by('-created_at')


@api_view(['POST'])
@permission_classes([IsFinanceStaff])
def verify_payment(request, pk):
    try:
        payment = Payment.objects.select_related('registration').get(pk=pk)
    except Payment.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    decision = request.data.get('decision')
    if decision not in ('verified', 'rejected'):
        return Response({'decision': 'Must be "verified" or "rejected".'}, status=status.HTTP_400_BAD_REQUEST)

    payment.status = decision
    payment.verified_by = request.user
    payment.verified_at = timezone.now()
    payment.save(update_fields=['status', 'verified_by', 'verified_at'])

    registration = payment.registration
    if decision == 'verified':
        registration.status = Registration.Status.CONFIRMED
        if not registration.bib_number:
            registration.bib_number = str(1000 + registration.id + random.randint(0, 8))
        registration.save(update_fields=['status', 'bib_number'])
    else:
        registration.status = Registration.Status.REJECTED
        registration.save(update_fields=['status'])

    log_action(
        request.user, AuditLogEntry.Module.FINANCE, f'Payment {decision}', target_description=str(registration),
    )
    notify(
        registration.user, Notification.Kind.PAYMENT,
        'Payment Verified' if decision == 'verified' else 'Payment Rejected',
        f'Your payment for {registration.event_category.event.title} has been {decision}.',
    )
    return Response(RegistrationSerializer(registration).data)


@api_view(['GET'])
@permission_classes([IsFinanceStaff])
def finance_report(request):
    verified_payments = Payment.objects.filter(status=Payment.Status.VERIFIED)
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    if date_from:
        verified_payments = verified_payments.filter(created_at__date__gte=date_from)
    if date_to:
        verified_payments = verified_payments.filter(created_at__date__lte=date_to)

    total_revenue = verified_payments.aggregate(total=Sum('amount'))['total'] or 0
    by_event = (
        verified_payments
        .values('registration__event_category__event__title')
        .annotate(revenue=Sum('amount'), registrations=Count('id'))
        .order_by('-revenue')
    )
    return Response({
        'total_revenue': total_revenue,
        'verified_payment_count': verified_payments.count(),
        'by_event': [
            {
                'event': row['registration__event_category__event__title'],
                'revenue': row['revenue'],
                'registrations': row['registrations'],
            }
            for row in by_event
        ],
    })


@api_view(['GET'])
@permission_classes([IsFinanceStaff])
def export_finance_report_csv(request):
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="finance_report.csv"'
    writer = csv.writer(response)
    writer.writerow(['Registration', 'Event', 'Category', 'Amount', 'Method', 'Status', 'Verified At'])
    for payment in Payment.objects.select_related(
        'registration', 'registration__event_category', 'registration__event_category__event'
    ):
        writer.writerow([
            payment.registration_id,
            payment.registration.event_category.event.title,
            payment.registration.event_category.name,
            payment.amount,
            payment.get_method_display(),
            payment.get_status_display(),
            payment.verified_at.isoformat() if payment.verified_at else '',
        ])
    return response
