/**
 * AuthContext.tsx
 *
 * Global auth state. Provides:
 *   - user profile (id, email, partyId)
 *   - JWT token (stored in localStorage)
 *   - login / signup / logout helpers
 *   - authFetch — drop-in replacement for fetch() that injects Bearer token
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { apiUrl } from '../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  role: 'ADMIN' | 'OPERATOR' | 'USER';
  partyId: string | null;
  onboardingStatus: 'pending' | 'approved' | 'rejected';
  sponsorId?: string | null;
  createdAt: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, invitationCode?: string) => Promise<{ message?: string }>;
  logout: () => void;
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
}

// ─── Context ──────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'cantonix_token';

// ─── Provider ─────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser]   = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(!!localStorage.getItem(TOKEN_KEY));

  // ── authFetch ────────────────────────────────────────────────────────────
  const authFetch = useCallback(
    (input: RequestInfo, init: RequestInit = {}): Promise<Response> => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const headers = new Headers(init.headers);
      if (storedToken) headers.set('Authorization', `Bearer ${storedToken}`);
      // Resolve relative paths through apiUrl
      const url = typeof input === 'string' && input.startsWith('/') ? apiUrl(input) : input;
      return fetch(url, { ...init, headers });
    },
    []
  );

  // ── Restore session on mount ─────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) { setIsLoading(false); return; }

    authFetch('/api/me')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: AuthUser) => setUser(data))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      })
      .finally(() => setIsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── signup ───────────────────────────────────────────────────────────────
  const signup = useCallback(async (email: string, password: string, invitationCode?: string) => {
    const res = await fetch(apiUrl('/api/auth/signup'), {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password, ...(invitationCode ? { invitationCode } : {}) }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Signup failed');

    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
    return { message: data.message };
  }, []);

  // ── login ────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(apiUrl('/api/auth/login'), {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Login failed');

    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  // ── logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, signup, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
