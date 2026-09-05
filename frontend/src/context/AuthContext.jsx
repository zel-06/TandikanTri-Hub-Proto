import { createContext, useContext, useEffect, useState } from 'react';
import * as authApi from '../api/auth';
import { clearTokens, setTokens } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const access = localStorage.getItem('access_token');
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

  async function login(username, password) {
    const data = await authApi.login(username, password);
    setTokens({ access: data.access, refresh: data.refresh });
    setUser(data.user);
    return data.user;
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
    <AuthContext.Provider value={{ user, loading, login, logout, refreshProfile, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
