import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthAPI, setStoredToken } from './api.js';
import { normalizeRoleName } from './navConfig.js';

const AuthContext = createContext({
  user: null,
  role: null,
  roles: [],
  activeRole: null,
  isAuthenticated: false,
  loading: true,
  login: async () => {},
  logout: async () => {},
  switchRole: async () => {},
  refresh: async () => {},
});

function hydrateUser(raw) {
  if (!raw) return null;
  const rawRoles = Array.isArray(raw.roles) ? raw.roles : [raw.activeRole || raw.role].filter(Boolean);
  const roles = [...new Set(rawRoles.map((r) => normalizeRoleName(r)).filter(Boolean))];
  const activeRole = normalizeRoleName(raw.activeRole || raw.role) || roles[0] || null;
  const nameParts = String(raw.name || '').trim().split(/\s+/);
  const firstName = raw.firstName || nameParts[0] || '';
  const lastName = raw.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
  const displayName = raw.display_name || raw.name || `${firstName} ${lastName}`.trim() || raw.email || '';
  return {
    ...raw,
    id: raw.id || raw.user_id,
    user_id: raw.user_id || raw.id,
    name: raw.name || displayName,
    display_name: displayName,
    firstName,
    lastName,
    roles,
    activeRole,
    role: activeRole,
  };
}

function toSubmissionsRoleKey(role) {
  const s = String(role || '').trim().toLowerCase();
  if (!s) return '';
  if (s === 'vpaa' || s.includes('vp for academic') || s.includes('ovpaa')) return 'vpaa';
  if (s.includes('dean')) return 'dean';
  if (s.includes('program head') || s === 'program-head' || s === 'program_head') return 'program-head';
  if (s.includes('librar')) return 'director-of-libraries';
  if (s.includes('consultant')) return 'industry-consultant';
  if (s.includes('super')) return 'superuser';
  if (s.includes('instructor') || s.includes('faculty')) return 'instructor';
  return s.replace(/[\s_]+/g, '-');
}

function syncSubmissionsSession(hydrated) {
  try {
    if (!hydrated) {
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
    } else {
      const role = toSubmissionsRoleKey(hydrated.activeRole || hydrated.role);
      const roles = [...new Set((hydrated.roles || [hydrated.activeRole]).map(toSubmissionsRoleKey).filter(Boolean))];
      const snap = {
        id: hydrated.id || hydrated.user_id || 0,
        name: hydrated.name || hydrated.display_name || hydrated.email || '',
        email: hydrated.email || '',
        role: role || roles[0] || '',
        roles: roles.length ? roles : (role ? [role] : []),
        roleLabel: hydrated.activeRole || hydrated.role || '',
        mustChangePassword: Boolean(hydrated.mustChangePassword || hydrated.must_change_password),
      };
      localStorage.setItem('user', JSON.stringify(snap));
      localStorage.setItem('userId', String(snap.id || 0));
    }
    window.dispatchEvent(new Event('lpsm-session-change'));
  } catch {
    // ignore storage errors
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await AuthAPI.me();
      const hydrated = hydrateUser(res?.user || null);
      setUser(hydrated);
      syncSubmissionsSession(hydrated);
    } catch {
      setUser(null);
      syncSubmissionsSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signIn = useCallback((rawUser, token) => {
    if (token) setStoredToken(token);
    const hydrated = hydrateUser(rawUser || null);
    setUser(hydrated);
    syncSubmissionsSession(hydrated);
    if (hydrated) window.dispatchEvent(new Event('auth:signed-in'));
    return hydrated;
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await AuthAPI.login(email, password);
    if (res?.token) setStoredToken(res.token);
    const hydrated = hydrateUser(res?.user || null);
    setUser(hydrated);
    syncSubmissionsSession(hydrated);
    if (hydrated) window.dispatchEvent(new Event('auth:signed-in'));
    return hydrated;
  }, []);

  const logout = useCallback(async () => {
    try {
      await AuthAPI.logout();
    } catch {
      // clear local session regardless
    }
    setStoredToken('');
    setUser(null);
    syncSubmissionsSession(null);
  }, []);

  const switchRole = useCallback(async (nextRole) => {
    const res = await AuthAPI.switchRole(nextRole);
    if (res?.token) setStoredToken(res.token);
    const hydrated = hydrateUser(res?.user || null);
    setUser(hydrated);
    syncSubmissionsSession(hydrated);
    return hydrated;
  }, []);

  const value = useMemo(
    () => ({
      user,
      role: user?.activeRole || null,
      roles: user?.roles || [],
      activeRole: user?.activeRole || null,
      isAuthenticated: Boolean(user),
      loading,
      login,
      signIn,
      logout,
      switchRole,
      setActiveRole: switchRole,
      refresh,
    }),
    [user, loading, login, signIn, logout, switchRole, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

// M2 Composition backward-compatible aliases
export const CurrentUserProvider = AuthProvider;
export const useCurrentUser = useAuth;
