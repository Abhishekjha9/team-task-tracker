import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService';
import { tokenStorage } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Only "initializing" if there's a stored token to verify.
  const [initializing, setInitializing] = useState(() => Boolean(tokenStorage.get()));

  // Restore the session on page load by validating the stored token.
  useEffect(() => {
    if (!tokenStorage.get()) return;
    authService
      .me()
      .then(setUser)
      .catch(() => tokenStorage.clear())
      .finally(() => setInitializing(false));
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  // api.js fires this when any request comes back 401.
  useEffect(() => {
    window.addEventListener('auth:logout', logout);
    return () => window.removeEventListener('auth:logout', logout);
  }, [logout]);

  const handleAuth = ({ token, user: u }) => {
    tokenStorage.set(token);
    setUser(u);
    return u;
  };

  const login = useCallback((creds) => authService.login(creds).then(handleAuth), []);
  const signup = useCallback((data) => authService.signup(data).then(handleAuth), []);

  const value = useMemo(() => ({ user, initializing, login, signup, logout }), [user, initializing, login, signup, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
