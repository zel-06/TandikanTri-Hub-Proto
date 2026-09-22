import axios from 'axios';

// Locally, Vite (5173) and Django (8000) run on different ports, so we need an
// absolute URL. In production, vercel.json rewrites /api/* to the backend service
// on the same domain, so a relative path keeps everything same-origin (no CORS needed).
export const API_BASE_URL = import.meta.env.DEV ? 'http://127.0.0.1:8000/api' : '/api';

const client = axios.create({ baseURL: API_BASE_URL });

const REMEMBER_KEY = 'remember_me';
// Marks that a non-remembered (session-only) login is active, so that returning after
// the tab/browser closes - which wipes sessionStorage - can be told apart from a
// first-time visitor and shown a "your session has expired" notice.
const HAD_SESSION_KEY = 'had_active_session';

function getStorage() {
  return localStorage.getItem(REMEMBER_KEY) === 'true' ? localStorage : sessionStorage;
}

export function getTokens() {
  const storage = getStorage();
  return {
    access: storage.getItem('access_token'),
    refresh: storage.getItem('refresh_token'),
  };
}

export function setTokens({ access, refresh }, rememberMe) {
  if (rememberMe !== undefined) {
    localStorage.setItem(REMEMBER_KEY, rememberMe ? 'true' : 'false');
    if (rememberMe) {
      localStorage.removeItem(HAD_SESSION_KEY);
    } else {
      localStorage.setItem(HAD_SESSION_KEY, 'true');
    }
  }
  const storage = getStorage();
  if (access) storage.setItem('access_token', access);
  if (refresh) storage.setItem('refresh_token', refresh);
}

export function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('refresh_token');
  localStorage.removeItem(HAD_SESSION_KEY);
}

// One-shot check, called on app load: were we in a non-remembered session that's now
// gone because the tab/browser was closed and reopened? Clears its own marker so it
// only reports true once per lapsed session.
export function checkAndConsumeSessionExpired() {
  const remembered = localStorage.getItem(REMEMBER_KEY) === 'true';
  const hadSession = localStorage.getItem(HAD_SESSION_KEY) === 'true';
  if (!remembered && hadSession && !sessionStorage.getItem('access_token')) {
    localStorage.removeItem(HAD_SESSION_KEY);
    return true;
  }
  return false;
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
