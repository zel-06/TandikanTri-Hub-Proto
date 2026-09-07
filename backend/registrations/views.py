import csv
import random

from django.conf import settings
from django.core.mail import send_mail
from django.db.models import Count, Sum
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsFinanceStaff
from audit.models import AuditLogEntry, log_action
from notifications.models import Notification, notify

from . import paymongo
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
            f'Your registration for {registration.event_category.event.title} is saved. '
            'Complete payment to confirm your slot.',
        )
        return Response(RegistrationSerializer(registration).data, status=status.HTTP_201_CREATED)


class MyRegistrationsListView(generics.ListAPIView):
    serializer_class = RegistrationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Registration.objects.filter(user=self.request.user).select_related(
            'event_category', 'event_category__event', 'payment'
        ).prefetch_related('participants')


class RegistrationDetailView(generics.RetrieveAPIView):
    serializer_class = RegistrationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Registration.objects.filter(user=self.request.user).select_related(
            'event_category', 'event_category__event', 'payment'
        ).prefetch_related('participants')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_checkout_session(request, pk):
    try:
        registration = Registration.objects.select_related(
            'payment', 'event_category', 'event_category__event'
        ).get(pk=pk, user=request.user)
    except Registration.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    payment = registration.payment
    if payment.status == Payment.Status.VERIFIED:
        return Response({'detail': 'This registration is already paid.'}, status=status.HTTP_400_BAD_REQUEST)

    frontend_url = settings.FRONTEND_URL.rstrip('/')
    session = paymongo.create_checkout_session(
        payment,
        success_url=f'{frontend_url}/payment-result?registration_id={registration.id}',
        cancel_url=f'{frontend_url}/payment-result?registration_id={registration.id}&cancelled=1',
    )
    payment.paymongo_checkout_id = session['id']
    payment.save(update_fields=['paymongo_checkout_id'])

    return Response({'checkout_url': session['attributes']['checkout_url']})


@api_view(['POST'])
@permission_classes([AllowAny])
def paymongo_webhook(request):
    if not paymongo.verify_webhook_signature(request.body, request.headers.get('Paymongo-Signature', '')):
        return Response(status=status.HTTP_400_BAD_REQUEST)

    event = request.data.get('data', {}).get('attributes', {})
    if event.get('type') == 'checkout_session.payment.paid':
        checkout_id = event.get('data', {}).get('id')
        try:
            payment = Payment.objects.select_related(
                'registration', 'registration__event_category', 'registration__event_category__event'
            ).get(paymongo_checkout_id=checkout_id)
        except Payment.DoesNotExist:
            return Response(status=status.HTTP_200_OK)

        if payment.status != Payment.Status.VERIFIED:
            payment.status = Payment.Status.VERIFIED
            payment.verified_at = timezone.now()
            payment.method = paymongo.get_payment_method_used(checkout_id) or payment.method
            payment.save(update_fields=['status', 'verified_at', 'method'])

            registration = payment.registration
            registration.status = Registration.Status.CONFIRMED
            if not registration.bib_number:
                registration.bib_number = str(1000 + registration.id + random.randint(0, 8))
            registration.save(update_fields=['status', 'bib_number'])

            event_title = registration.event_category.event.title
            message = (
                f'Your payment for {event_title} has been verified and your registration is confirmed. '
                f'Your bib number is {registration.bib_number}.'
            )
            notify(registration.user, Notification.Kind.PAYMENT, 'Payment Verified', message)
            send_mail(
                subject=f'Payment Confirmed — {event_title}',
                message=(
                    f'Hi {registration.user.get_full_name() or registration.user.username},\n\n{message}\n\n'
                    f'Amount paid: PHP {payment.amount}\n'
                    f'Category: {registration.event_category.name}\n\n'
                    '— Tandikan Tri-Hub'
                ),
                from_email=None,
                recipient_list=[registration.email],
                fail_silently=True,
            )
            log_action(
                None, AuditLogEntry.Module.FINANCE, 'Payment verified via PayMongo',
                target_description=str(registration),
            )

    return Response(status=status.HTTP_200_OK)


class PaymentQueueListView(generics.ListAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [IsFinanceStaff]

    def get_queryset(self):
        qs = Payment.objects.select_related('registration', 'registration__user').all()
        payment_status = self.request.query_params.get('status')
        if payment_status:
            qs = qs.filter(status=payment_status)
        return qs.order_by('-created_at')


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
