import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { authApi } from '@/api/endpoints';
import { configureAuth } from '@/api/client';
import type { GuestSession, User } from '@/types/api';

/**
 * Holds the session for both principal kinds.
 *
 * A registered user's token is one value; a guest's token is stored per share
 * link, so a visitor can hold sessions for several links at once and a refresh
 * restores the right identity for whichever link they are on.
 *
 * Tokens live in localStorage. That is a deliberate, documented trade-off: it
 * is readable by XSS, but the app has no cross-site cookie flow, and the
 * alternative (httpOnly cookies) would need CSRF protection and a same-site
 * deployment topology that the split frontend/backend hosting does not have.
 */

const USER_TOKEN_KEY = 'pdfapp.user.token';
const GUEST_PREFIX = 'pdfapp.guest.';

interface StoredGuest {
  token: string;
  displayName: string;
  documentId: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  /** The token for the active context — guest token wins while on a share route. */
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  saveGuestSession: (shareToken: string, session: GuestSession) => void;
  getGuestSession: (shareToken: string) => StoredGuest | null;
  activateGuest: (shareToken: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readGuest(shareToken: string): StoredGuest | null {
  const raw = localStorage.getItem(GUEST_PREFIX + shareToken);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredGuest;
  } catch {
    localStorage.removeItem(GUEST_PREFIX + shareToken);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeShareToken, setActiveShareToken] = useState<string | null>(null);

  // The axios interceptor reads through this, so the *current* token is
  // resolved at request time rather than captured at render time.
  useEffect(() => {
    configureAuth(
      () => {
        if (activeShareToken) {
          const guest = readGuest(activeShareToken);
          if (guest) return guest.token;
        }
        return localStorage.getItem(USER_TOKEN_KEY);
      },
      () => {
        // 401: clear whichever credential was in play.
        if (activeShareToken) {
          localStorage.removeItem(GUEST_PREFIX + activeShareToken);
        } else {
          localStorage.removeItem(USER_TOKEN_KEY);
          setUser(null);
        }
      },
    );
  }, [activeShareToken]);

  // Restore a signed-in session on boot.
  useEffect(() => {
    const token = localStorage.getItem(USER_TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }
    authApi
      .me()
      .then(setUser)
      .catch(() => localStorage.removeItem(USER_TOKEN_KEY))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login({ email, password });
    localStorage.setItem(USER_TOKEN_KEY, result.access_token);
    setUser(result.user);
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const result = await authApi.signup({ name, email, password });
    localStorage.setItem(USER_TOKEN_KEY, result.access_token);
    setUser(result.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(USER_TOKEN_KEY);
    setUser(null);
  }, []);

  const saveGuestSession = useCallback((shareToken: string, session: GuestSession) => {
    const stored: StoredGuest = {
      token: session.access_token,
      displayName: session.display_name,
      documentId: session.document_id,
    };
    localStorage.setItem(GUEST_PREFIX + shareToken, JSON.stringify(stored));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      login,
      signup,
      logout,
      saveGuestSession,
      getGuestSession: readGuest,
      activateGuest: setActiveShareToken,
    }),
    [user, isLoading, login, signup, logout, saveGuestSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }
  return context;
}
