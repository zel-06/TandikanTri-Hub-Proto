from django.urls import path

from . import views

urlpatterns = [
    path('', views.RegistrationCreateView.as_view(), name='registration-create'),
    path('mine/', views.MyRegistrationsListView.as_view(), name='registration-mine'),

    path('payments/', views.PaymentQueueListView.as_view(), name='payment-queue'),

    path('finance/report/', views.finance_report, name='finance-report'),
    path('finance/report/export/', views.export_finance_report_csv, name='finance-report-export'),

    path('webhooks/paymongo/', views.paymongo_webhook, name='paymongo-webhook'),
    path('<int:pk>/', views.RegistrationDetailView.as_view(), name='registration-detail'),
    path('<int:pk>/checkout/', views.create_checkout_session, name='registration-checkout'),
]
