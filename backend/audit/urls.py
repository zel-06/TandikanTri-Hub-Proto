from django.urls import path

from .views import AuditLogListView, export_audit_log_csv

urlpatterns = [
    path('logs/', AuditLogListView.as_view(), name='audit-log-list'),
    path('logs/export/', export_audit_log_csv, name='audit-log-export'),
]
