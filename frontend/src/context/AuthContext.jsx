import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { getMeApi, loginApi, registerApi } from "../api/auth";
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from "../api/client";

export const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState(() => readStoredUser());
  const [isInitializing, setIsInitializing] = useState(() =>
    Boolean(localStorage.getItem(TOKEN_STORAGE_KEY))
  );

  const persistSession = useCallback((nextToken, nextUser) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    let active = true;
    async function hydrateUser() {
      if (!token) {
        if (active) setIsInitializing(false);
        return;
      }
      try {
        const me = await getMeApi();
        if (active) {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(me));
          setUser(me);
        }
      } catch {
        if (active) clearSession();
      } finally {
        if (active) setIsInitializing(false);
      }
    }
    hydrateUser();
    return () => {
      active = false;
    };
  }, [token, clearSession]);

  useEffect(() => {
    const handleUnauthorized = () => clearSession();
    window.addEventListener("besmart:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("besmart:unauthorized", handleUnauthorized);
  }, [clearSession]);

  const login = useCallback(
    async (credentials) => {
      const data = await loginApi(credentials);
      persistSession(data.access_token, data.user);
      return data.user;
    },
    [persistSession]
  );

  const register = useCallback(
    async (payload) => {
      const data = await registerApi(payload);
      persistSession(data.access_token, data.user);
      return data.user;
    },
    [persistSession]
  );

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token && user),
      isInitializing,
      login,
      register,
      logout,
    }),
    [token, user, isInitializing, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

