import csv

from django.http import HttpResponse
from rest_framework import generics
from rest_framework.decorators import api_view, permission_classes

from accounts.permissions import IsOperationsStaff

from .models import AuditLogEntry
from .serializers import AuditLogEntrySerializer


class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogEntrySerializer
    permission_classes = [IsOperationsStaff]

    def get_queryset(self):
        qs = AuditLogEntry.objects.select_related('actor').all()
        module = self.request.query_params.get('module')
        if module and module != 'all':
            qs = qs.filter(module=module)
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)
        return qs


@api_view(['GET'])
@permission_classes([IsOperationsStaff])
def export_audit_log_csv(request):
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="audit_log.csv"'
    writer = csv.writer(response)
    writer.writerow(['Timestamp', 'Administrator', 'Module', 'Action', 'Details'])
    for entry in AuditLogEntry.objects.select_related('actor').all():
        writer.writerow([
            entry.created_at.isoformat(),
            entry.actor.get_full_name() or entry.actor.username if entry.actor else 'System',
            entry.get_module_display(),
            entry.action,
            entry.target_description,
        ])
    return response
