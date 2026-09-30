import client from './client';

export const login = (username, password) =>
  client.post('/auth/login/', { username, password }).then((r) => r.data);

export const register = (formData) =>
  client.post('/auth/register/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);

export const sendVerificationCode = (email) =>
  client.post('/auth/send-verification-code/', { email }).then((r) => r.data);

export const verifyEmailCode = (email, code) =>
  client.post('/auth/verify-code/', { email, code }).then((r) => r.data);

export const googleAuth = (credential) =>
  client.post('/auth/google/', { credential }).then((r) => r.data);

export const requestPasswordResetCode = (email) =>
  client.post('/auth/forgot-password/request-code/', { email }).then((r) => r.data);

export const verifyPasswordResetCode = (email, code) =>
  client.post('/auth/forgot-password/verify-code/', { email, code }).then((r) => r.data);

export const resetPassword = (resetToken, newPassword) =>
  client.post('/auth/forgot-password/reset/', { reset_token: resetToken, new_password: newPassword }).then((r) => r.data);

export const fetchMe = () => client.get('/auth/me/').then((r) => r.data);

export const updateMe = (data) => client.patch('/auth/me/', data).then((r) => r.data);

export const changePassword = (payload) =>
  client.post('/auth/change-password/', payload).then((r) => r.data);

export const requestEmailChange = (newEmail, currentPassword) =>
  client.post('/auth/change-email/request/', { new_email: newEmail, current_password: currentPassword }).then((r) => r.data);

export const confirmEmailChange = (newEmail, code) =>
  client.post('/auth/change-email/confirm/', { new_email: newEmail, code }).then((r) => r.data);

export const deleteMe = (password) =>
  client.delete('/auth/me/', { data: { password } }).then((r) => r.data);
