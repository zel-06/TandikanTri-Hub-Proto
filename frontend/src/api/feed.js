import client from './client';

export const listPosts = () => client.get('/feed/posts/').then((r) => r.data);

export const createPost = (formData) => client.post('/feed/posts/', formData).then((r) => r.data);

export const updatePost = (id, formData) => client.patch(`/feed/posts/${id}/`, formData).then((r) => r.data);

export const deletePost = (id) => client.delete(`/feed/posts/${id}/`);

export const toggleLike = (id) => client.post(`/feed/posts/${id}/like/`).then((r) => r.data);
