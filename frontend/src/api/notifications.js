import client from './client';

export const listNotifications = () => client.get('/notifications/').then((r) => r.data);

export const markNotificationRead = (id) => client.post(`/notifications/${id}/read/`).then((r) => r.data);

export const markAllNotificationsRead = () => client.post('/notifications/read-all/');
