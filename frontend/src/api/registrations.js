import client, { downloadFile } from './client';

export const submitRegistration = (formData) =>
  client.post('/registrations/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);

export const listMyRegistrations = () => client.get('/registrations/mine/').then((r) => r.data);

export const getRegistration = (id) => client.get(`/registrations/${id}/`).then((r) => r.data);

export const createCheckout = (registrationId) =>
  client.post(`/registrations/${registrationId}/checkout/`).then((r) => r.data);

export const listPaymentQueue = (status) =>
  client.get('/registrations/payments/', { params: status ? { status } : {} }).then((r) => r.data);

export const getFinanceReport = (params) =>
  client.get('/registrations/finance/report/', { params }).then((r) => r.data);

export const exportFinanceReport = () =>
  downloadFile('/registrations/finance/report/export/', 'finance_report.csv');
