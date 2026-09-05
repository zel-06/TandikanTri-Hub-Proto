import client from './client';

export const login = (username, password) =>
  client.post('/auth/login/', { username, password }).then((r) => r.data);

export const register = (formData) =>
  client.post('/auth/register/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);

export const fetchMe = () => client.get('/auth/me/').then((r) => r.data);

export const updateMe = (data) => client.patch('/auth/me/', data).then((r) => r.data);

export const changePassword = (payload) =>
  client.post('/auth/change-password/', payload).then((r) => r.data);
