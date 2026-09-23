import { createContext, useContext, useEffect, useState } from 'react';
import * as authApi from '../api/auth';
import { checkAndConsumeSessionExpired, clearTokens, getTokens, setTokens } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    if (checkAndConsumeSessionExpired()) {
      setSessionExpired(true);
    }
    const { access } = getTokens();
    if (!access) {
      setLoading(false);
      return;
    }
    authApi
      .fetchMe()
      .then(setUser)
      .catch(() => clearTokens())
      .finally(() => setLoading(false));
  }, []);

  async function login(username, password, rememberMe) {
    const data = await authApi.login(username, password);
    setTokens({ access: data.access, refresh: data.refresh }, rememberMe);
    setUser(data.user);
    setSessionExpired(false);
    return data.user;
  }

  // Same as login(), but for callers that already have tokens + user data in hand
  // (e.g. after POST /auth/google/ returns account_exists: true).
  function loginWithTokens({ access, refresh, user: userData }, rememberMe) {
    setTokens({ access, refresh }, rememberMe);
    setUser(userData);
    setSessionExpired(false);
    return userData;
  }

  function logout() {
    clearTokens();
    setUser(null);
  }

  async function refreshProfile() {
    const me = await authApi.fetchMe();
    setUser(me);
    return me;
  }

  return (
    <AuthContext.Provider value={{ user, loading, sessionExpired, login, loginWithTokens, logout, refreshProfile, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
