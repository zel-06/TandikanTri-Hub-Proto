import client, { downloadFile } from './client';

export const listUsers = (params) => client.get('/users/', { params }).then((r) => r.data);

export const exportUsers = () => downloadFile('/users/export/', 'users.csv');

export const verifyUserId = (userId, decision, note) =>
  client.post(`/users/${userId}/verify-id/`, { decision, note }).then((r) => r.data);

export const setUserAccountStatus = (userId, statusValue) =>
  client.post(`/users/${userId}/status/`, { status: statusValue }).then((r) => r.data);

export const listStaffAccounts = () => client.get('/staff-accounts/').then((r) => r.data);

export const createStaffAccount = (data) =>
  client.post('/staff-accounts/', data).then((r) => r.data);

export const resetStaffPassword = (staffId) =>
  client.post(`/staff-accounts/${staffId}/reset-password/`).then((r) => r.data);

export const setStaffAccountStatus = (staffId, statusValue) =>
  client.post(`/staff-accounts/${staffId}/status/`, { status: statusValue }).then((r) => r.data);

export const deleteStaffAccount = (staffId) => client.delete(`/staff-accounts/${staffId}/`);
