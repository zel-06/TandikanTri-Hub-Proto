from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register('events', views.EventViewSet, basename='event')

urlpatterns = [
    path('', include(router.urls)),
    path('events/<int:event_id>/categories/', views.EventCategoryListCreateView.as_view(), name='event-category-list'),
    path('event-categories/<int:pk>/', views.EventCategoryDetailView.as_view(), name='event-category-detail'),
    path('events/<int:event_id>/participants/', views.event_participants, name='event-participants'),
    path('events/<int:event_id>/participants/export/', views.export_participants_csv, name='event-participants-export'),
]
