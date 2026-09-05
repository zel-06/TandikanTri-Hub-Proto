from django.urls import path

from . import views

urlpatterns = [
    path('', views.RegistrationCreateView.as_view(), name='registration-create'),
    path('mine/', views.MyRegistrationsListView.as_view(), name='registration-mine'),

    path('payments/', views.PaymentQueueListView.as_view(), name='payment-queue'),
    path('payments/<int:pk>/verify/', views.verify_payment, name='payment-verify'),

    path('finance/report/', views.finance_report, name='finance-report'),
    path('finance/report/export/', views.export_finance_report_csv, name='finance-report-export'),
]
