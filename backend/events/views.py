import csv

from django.http import HttpResponse
from rest_framework import generics, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsEventStaff
from audit.models import AuditLogEntry, log_action

from .models import Event, EventCategory
from .serializers import EventCategorySerializer, EventSerializer, EventWriteSerializer


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.prefetch_related('categories').all()
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsEventStaff()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return EventWriteSerializer
        return EventSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if not (self.request.user.is_authenticated and self.request.user.role != self.request.user.Role.ATHLETE):
            qs = qs.filter(status=Event.Status.PUBLISHED)
        return qs

    def perform_create(self, serializer):
        event = serializer.save(created_by=self.request.user)
        log_action(self.request.user, AuditLogEntry.Module.EVENTS, 'Created event', target_description=event.title)

    def perform_update(self, serializer):
        event = serializer.save()
        log_action(self.request.user, AuditLogEntry.Module.EVENTS, 'Edited event', target_description=event.title)

    def perform_destroy(self, instance):
        title = instance.title
        instance.delete()
        log_action(self.request.user, AuditLogEntry.Module.EVENTS, 'Deleted event', target_description=title)


class EventCategoryListCreateView(generics.ListCreateAPIView):
    serializer_class = EventCategorySerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsEventStaff()]
        return [IsAuthenticated()]

    def get_queryset(self):
        return EventCategory.objects.filter(event_id=self.kwargs['event_id'])

    def perform_create(self, serializer):
        category = serializer.save(event_id=self.kwargs['event_id'])
        log_action(
            self.request.user, AuditLogEntry.Module.EVENTS, 'Added event category',
            target_description=f'{category.event.title} · {category.name}',
        )


class EventCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = EventCategorySerializer
    permission_classes = [IsEventStaff]
    queryset = EventCategory.objects.all()

    def perform_update(self, serializer):
        category = serializer.save()
        log_action(
            self.request.user, AuditLogEntry.Module.EVENTS, 'Edited event category',
            target_description=f'{category.event.title} · {category.name}',
        )

    def perform_destroy(self, instance):
        description = f'{instance.event.title} · {instance.name}'
        instance.delete()
        log_action(self.request.user, AuditLogEntry.Module.EVENTS, 'Deleted event category', target_description=description)


@api_view(['GET'])
@permission_classes([IsEventStaff])
def event_participants(request, event_id):
    from registrations.models import Participant
    from registrations.serializers import ParticipantSerializer

    participants = Participant.objects.filter(
        registration__event_category__event_id=event_id
    ).select_related('registration', 'registration__event_category').order_by('registration__bib_number')
    return Response(ParticipantSerializer(participants, many=True).data)


@api_view(['GET'])
@permission_classes([IsEventStaff])
def export_participants_csv(request, event_id):
    from registrations.models import Participant

    event = Event.objects.get(pk=event_id)
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="{event.title}-participants.csv"'
    writer = csv.writer(response)
    writer.writerow(['Bib #', 'Name', 'Category', 'Role'])
    participants = Participant.objects.filter(
        registration__event_category__event_id=event_id
    ).select_related('registration', 'registration__event_category').order_by('registration__bib_number')
    for participant in participants:
        writer.writerow([
            participant.registration.bib_number or '',
            participant.full_name,
            participant.registration.event_category.name,
            participant.role or '',
        ])
    return response
