from django.urls import path

from .views import NotificationListView, mark_all_read, mark_read

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification-list'),
    path('<int:pk>/read/', mark_read, name='notification-mark-read'),
    path('read-all/', mark_all_read, name='notification-mark-all-read'),
]
