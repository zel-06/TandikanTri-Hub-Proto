from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/send-verification-code/', views.send_verification_code, name='send-verification-code'),
    path('auth/verify-code/', views.verify_email_code, name='verify-email-code'),
    path('auth/google/', views.google_auth, name='google-auth'),
    path('auth/forgot-password/request-code/', views.request_password_reset_code, name='forgot-password-request-code'),
    path('auth/forgot-password/verify-code/', views.verify_password_reset_code, name='forgot-password-verify-code'),
    path('auth/forgot-password/reset/', views.reset_password, name='forgot-password-reset'),
    path('auth/login/', views.CustomTokenObtainPairView.as_view(), name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/me/', views.MeView.as_view(), name='me'),
    path('auth/change-password/', views.change_password, name='change-password'),
    path('auth/change-email/request/', views.request_email_change, name='request-email-change'),
    path('auth/change-email/confirm/', views.confirm_email_change, name='confirm-email-change'),

    path('users/', views.UserListView.as_view(), name='user-list'),
    path('users/export/', views.export_users_csv, name='user-export'),
    path('users/<int:pk>/verify-id/', views.verify_id, name='user-verify-id'),
    path('users/<int:pk>/status/', views.set_account_status, name='user-set-status'),

    path('staff-accounts/', views.StaffAccountListCreateView.as_view(), name='staff-account-list'),
    path('staff-accounts/<int:pk>/reset-password/', views.reset_staff_password, name='staff-account-reset-password'),
    path('staff-accounts/<int:pk>/status/', views.set_staff_account_status, name='staff-account-set-status'),
    path('staff-accounts/<int:pk>/', views.delete_staff_account, name='staff-account-delete'),
]
