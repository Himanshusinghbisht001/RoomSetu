import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { getCurrentUser, login as apiLogin, logout as apiLogout, refresh } from './authApi.js';
import { tokenStore } from './tokenStore.js';
import type { LoginPayload, User } from '../types/auth.js';

// ── Context shape ─────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  /** True while the initial auth bootstrap is still in progress */
  loading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-fetches the current user from the server (e.g. after profile update) */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Bootstrap: on first render, attempt a silent token refresh using the
   * HttpOnly cookie that the backend may have already set.  If it succeeds,
   * we immediately fetch the current user so the UI can show the correct
   * authenticated state without requiring the user to log in again.
   */
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        await refresh();           // sets tokenStore if cookie is valid
        const me = await getCurrentUser();
        if (!cancelled) setUser(me);
      } catch {
        // No valid session — remain logged out (this is the normal cold-start path)
        tokenStore.clear();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void bootstrap();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const { user: loggedInUser } = await apiLogin(payload);
    setUser(loggedInUser);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await getCurrentUser();
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: user !== null,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
