from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', views.CustomTokenObtainPairView.as_view(), name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/me/', views.MeView.as_view(), name='me'),
    path('auth/change-password/', views.change_password, name='change-password'),

    path('users/', views.UserListView.as_view(), name='user-list'),
    path('users/export/', views.export_users_csv, name='user-export'),
    path('users/<int:pk>/verify-id/', views.verify_id, name='user-verify-id'),
    path('users/<int:pk>/status/', views.set_account_status, name='user-set-status'),

    path('staff-accounts/', views.StaffAccountListCreateView.as_view(), name='staff-account-list'),
    path('staff-accounts/<int:pk>/reset-password/', views.reset_staff_password, name='staff-account-reset-password'),
    path('staff-accounts/<int:pk>/status/', views.set_staff_account_status, name='staff-account-set-status'),
    path('staff-accounts/<int:pk>/', views.delete_staff_account, name='staff-account-delete'),
]
