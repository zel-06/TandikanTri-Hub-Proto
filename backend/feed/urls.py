from django.urls import path

from .views import CommunityPostDetailView, CommunityPostListCreateView, toggle_like

urlpatterns = [
    path('posts/', CommunityPostListCreateView.as_view(), name='community-post-list'),
    path('posts/<int:pk>/', CommunityPostDetailView.as_view(), name='community-post-detail'),
    path('posts/<int:pk>/like/', toggle_like, name='community-post-like'),
]
