"use client";

import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { AuthContextType, LoginCredentials, RegisterData, User } from '@/types';
import { logout as apiLogout, upsertProfile, getMe, upgradeOrganizer, forceTokenRefresh } from '../api/authApi';
import { signIn, signOut, signUp, getUser, getUserAttributes } from '@/lib/auth/cognito';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // SSR-safe initial state: server + first client render must match.
  // We hydrate from localStorage in an effect after mount.
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load canonical user from backend on mount if session exists
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let parsedStoredUser: User | null = null;
        try {
          const storedUser = localStorage.getItem('user');
          parsedStoredUser = storedUser ? (JSON.parse(storedUser) as User) : null;
        } catch {
          // Self-heal corrupted storage.
          try {
            localStorage.removeItem('user');
          } catch {}
          parsedStoredUser = null;
        }

        if (parsedStoredUser && !cancelled) setUser(parsedStoredUser);
        // Only fetch /users/me if there is an active Cognito session
        const current = await getUser();
        if (current) {
          const attrs = await getUserAttributes();
          // IMPORTANT: Do not fall back to email/username for `name`.
          // `User.name` should reflect the name the user set at registration.
          const profileEmail = parsedStoredUser?.email ?? attrs?.email;
          const profileName = parsedStoredUser?.name ?? attrs?.name;
          // Ensure backend user exists (covers DB wipes while Cognito session still valid)
          try {
            await upsertProfile({
              cognitoId: current.userId,
              ...(profileName ? { name: profileName } : {}),
              ...(profileEmail ? { email: profileEmail } : {}),
            });
          } catch {
            // ignore; getMe will surface auth issues if any
          }
          const me = await getMe();
          if (!cancelled && me) {
            setUser(me);
            localStorage.setItem('user', JSON.stringify(me));
          }
        }
      } catch {
        // ignore if not authenticated yet
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const { tokens } = await signIn(credentials.email, credentials.password);
    // Persist tokens (Amplify manages session but we expose for backend)
    const at = tokens?.accessToken?.toString();
    if (at) localStorage.setItem('accessToken', at);
    const idt = tokens?.idToken?.toString();
    if (idt) localStorage.setItem('idToken', idt);

    // Pull Cognito user
    const current = await getUser();
    if (!current) return; // Should not happen after successful signIn

    // Backend user bootstrap: always attempt upsert (covers fresh DB wipes)
    const provisional = JSON.parse(localStorage.getItem('user') || 'null') as User | null;
    const role: User['role'] = provisional?.role || 'user';
    const attrs = await getUserAttributes();
    // IMPORTANT: Prefer Cognito `name` (set at registration). Only if unavailable, fall back to a safe placeholder.
    // Never use email/username as the stored display name.
    const displayName = attrs?.name ?? provisional?.name ?? 'User';
    try {
      await upsertProfile({
        cognitoId: current.userId,
        ...(displayName ? { name: displayName } : {}),
        email: credentials.email,
      });
    } catch (e) {
      // Swallow; upsert handles create/update. If it fails we still fallback.
      console.warn('[Auth] upsertProfile failed', e);
    }

    // Load canonical profile (if backend has user now)
    try {
      const me = await getMe();
      setUser(me);
      localStorage.setItem('user', JSON.stringify(me));
    } catch {
      // Fallback minimal user (will be replaced later when profile endpoint works)
      const u: User = {
        id: 0,
        cognitoId: current.userId,
        name: displayName,
        email: credentials.email,
        role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as User;
      setUser(u);
      localStorage.setItem('user', JSON.stringify(u));
    }

    // Lightweight session cookie for middleware
    document.cookie = `session=1; path=/; SameSite=Lax`;
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const { username } = await signUp(data.name, data.email, data.password);
    try {
      const key = `pendingSignUpUsername:${data.email.toLowerCase()}`;
      localStorage.setItem(key, username);
    } catch {}
    // Default base role 'user' under new plan
    const existing = localStorage.getItem('user');
    let u: User | null = existing ? JSON.parse(existing) : null;
    if (!u) {
      u = {
        id: 0,
        cognitoId: '',
        name: data.name,
        email: data.email,
        role: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as User;
    } else {
      u.role = 'user';
    }
    localStorage.setItem('user', JSON.stringify(u));
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
      await signOut();
    } catch {}
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    // Clear session cookie
    document.cookie = 'session=; Max-Age=0; path=/;';
    setUser(null);
    // Redirect to home after logout for consistent UX
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const current = await getUser();
      if (!current) return;
      const me = await getMe();
      if (me) {
        setUser(me);
        localStorage.setItem('user', JSON.stringify(me));
      }
    } catch {}
  }, []);

  const performUpgradeToOrganizer = useCallback(async () => {
    if (!user || user.role !== 'user') return;
    const result = await upgradeOrganizer();

    // ADR-008 Phase 7: force token refresh so next requests carry updated cognito:groups
    if (result.requiresTokenRefresh) {
      await forceTokenRefresh();
    }

    // Update local user with new role from DB
    const updated = result.user;
    setUser(updated);
    localStorage.setItem('user', JSON.stringify(updated));
  }, [user]);

  const value = useMemo<AuthContextType>(() => ({
    user,
    loading,
    login,
    register,
    logout,
    refreshUser,
    isAuthenticated: !!user,
    isOrganizer: user?.role === 'organizer',
    isAttendee: user?.role === 'user', // deprecated alias for base role
    isUser: user?.role === 'user',
    isAdmin: user?.role === 'admin',
    upgradeToOrganizer: performUpgradeToOrganizer,
  }), [user, loading, login, register, logout, refreshUser, performUpgradeToOrganizer]);

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}
