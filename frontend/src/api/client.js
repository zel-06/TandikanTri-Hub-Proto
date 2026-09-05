import axios from 'axios';

export const API_BASE_URL = 'http://127.0.0.1:8000/api';

const client = axios.create({ baseURL: API_BASE_URL });

function getTokens() {
  return {
    access: localStorage.getItem('access_token'),
    refresh: localStorage.getItem('refresh_token'),
  };
}

export function setTokens({ access, refresh }) {
  if (access) localStorage.setItem('access_token', access);
  if (refresh) localStorage.setItem('refresh_token', refresh);
}

export function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

client.interceptors.request.use((config) => {
  const { access } = getTokens();
  if (access) config.headers.Authorization = `Bearer ${access}`;
  return config;
});

let refreshPromise = null;

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (response && response.status === 401 && !config._retried) {
      const { refresh } = getTokens();
      if (refresh) {
        config._retried = true;
        try {
          if (!refreshPromise) {
            refreshPromise = axios
              .post(`${API_BASE_URL}/auth/refresh/`, { refresh })
              .finally(() => {
                refreshPromise = null;
              });
          }
          const { data } = await refreshPromise;
          setTokens({ access: data.access });
          config.headers.Authorization = `Bearer ${data.access}`;
          return client(config);
        } catch {
          clearTokens();
        }
      }
    }
    return Promise.reject(error);
  }
);

export async function downloadFile(url, filename) {
  const response = await client.get(url, { responseType: 'blob' });
  const objectUrl = window.URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}

export default client;
