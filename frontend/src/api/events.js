import client, { downloadFile } from './client';

export const listEvents = () => client.get('/events/').then((r) => r.data);

export const getEvent = (id) => client.get(`/events/${id}/`).then((r) => r.data);

export const createEvent = (data) => client.post('/events/', data).then((r) => r.data);

export const updateEvent = (id, data) => client.patch(`/events/${id}/`, data).then((r) => r.data);

export const deleteEvent = (id) => client.delete(`/events/${id}/`);

export const createCategory = (eventId, data) =>
  client.post(`/events/${eventId}/categories/`, data).then((r) => r.data);

export const updateCategory = (categoryId, data) =>
  client.patch(`/event-categories/${categoryId}/`, data).then((r) => r.data);

export const deleteCategory = (categoryId) => client.delete(`/event-categories/${categoryId}/`);

export const listParticipants = (eventId) =>
  client.get(`/events/${eventId}/participants/`).then((r) => r.data);

export const exportParticipants = (eventId, eventTitle) =>
  downloadFile(`/events/${eventId}/participants/export/`, `${eventTitle}-participants.csv`);
