// Unified session adapter for verbatim Submissions Management pages & hooks.
// Preserves all original exports while delegating live auth & role state to the
// unified AuthContext (which syncs into localStorage 'user' / 'userId') and /api/auth.

import { normalizeRoleKey } from './approvalHelpers.js';
import { API_BASE as SHARED_API_BASE, getStoredToken, setStoredToken } from '../../../shared/api.js';

const SESSION_KEY = 'user';
const SESSION_ID_KEY = 'userId';
const SESSION_EVENT = 'lpsm-session-change';

export const isDemoMode = (env = {}) =>
  env?.DEV === true || String(env?.VITE_LPMS_DEMO_MODE || '') === '1';

const RUNTIME_ENV = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : { DEV: true };
export const DEMO_MODE = isDemoMode(RUNTIME_ENV);
export const DEMO_PASSWORD = '';

export const ROLES = [
  { key: 'instructor', label: 'Instructor', home: '/instructor/dashboard' },
  { key: 'program-head', label: 'Program Head', home: '/program-head/learning-plans' },
  { key: 'director-of-libraries', label: 'Director of Libraries', home: '/library/dashboard' },
  { key: 'industry-consultant', label: 'Industry Consultant', home: '/consultant/learning-plans' },
  { key: 'dean', label: 'Dean', home: '/dean/learning-plans' },
  { key: 'vpaa', label: 'VPAA', home: '/vpaa/approved-plans' },
  { key: 'superuser', label: 'Superuser', home: '/vpaa/user-accounts' },
];

export const registrationRoles = (demoMode = DEMO_MODE) =>
  demoMode ? ROLES.filter((role) => role.key !== 'superuser') : ROLES.filter((role) => role.key === 'instructor');

export const roleMeta = (roleKey = '') => ROLES.find((r) => r.key === normalizeRoleKey(roleKey) || r.key === roleKey) || null;

export const homeRouteForRole = (roleKey = '') => roleMeta(roleKey)?.home || '/';

const notify = () => {
  try {
    window.dispatchEvent(new Event(SESSION_EVENT));
  } catch {
    /* non-browser context */
  }
};

export const getSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const user = raw ? JSON.parse(raw) : null;
    if (!user || !user.role) return null;
    const role = normalizeRoleKey(user.role) || user.role;
    const roles = Array.isArray(user.roles) && user.roles.length
      ? [...new Set(user.roles.map((r) => normalizeRoleKey(r) || r).filter(Boolean))]
      : [role];
    return {
      ...user,
      role,
      roles,
      roleLabel: user.roleLabel || roleMeta(role)?.label || role,
    };
  } catch {
    return null;
  }
};

export const setSession = (user) => {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    localStorage.setItem(SESSION_ID_KEY, String(user?.id || 0));
  } catch (e) {
    console.error('Failed to persist session', e);
  }
  notify();
  return user;
};

const clearStoredSession = () => {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_ID_KEY);
  } catch {
    /* ignore */
  }
  notify();
};

export const expireSession = () => {
  setStoredToken('');
  clearStoredSession();
};

export const chooseRole = (roleKey) => {
  const session = getSession();
  if (!session || !session.roles.includes(roleKey)) return session;
  return setSession({ ...session, role: roleKey, roleLabel: roleMeta(roleKey)?.label || roleKey, pendingRoleChoice: false });
};

export const setActiveRole = (roleKey) => {
  const session = getSession();
  if (!session || !session.roles.includes(roleKey) || session.role === roleKey) return session;
  return setSession({ ...session, role: roleKey, roleLabel: roleMeta(roleKey)?.label || roleKey });
};

const authBase = () => `${SHARED_API_BASE || ''}/api/auth`;

const authHeaders = (extra = {}) => {
  const token = getStoredToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
};

const postAuth = async (path, payload) => {
  try {
    const res = await fetch(`${authBase()}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(),
      body: JSON.stringify(payload || {}),
    });
    let data = null;
    try { data = await res.json(); } catch { data = null; }
    return { reachable: true, ok: res.ok, status: res.status, data };
  } catch {
    return { reachable: false, ok: false, status: 0, data: null };
  }
};

export const logout = () => {
  setStoredToken('');
  clearStoredSession();
  void postAuth('/logout', {});
};

export const login = async (email, password) => {
  const res = await postAuth('/login', { email, password });
  if (res.ok && res.data?.user) {
    if (res.data.token) setStoredToken(res.data.token);
    const u = res.data.user;
    const role = normalizeRoleKey(u.activeRole || u.role) || 'instructor';
    const roles = (Array.isArray(u.roles) ? u.roles : [role]).map((r) => normalizeRoleKey(r) || r);
    const user = setSession({
      id: u.id || u.user_id,
      name: u.name || u.display_name || u.email,
      email: u.email,
      role,
      roles,
      roleLabel: roleMeta(role)?.label || role,
      mustChangePassword: Boolean(u.mustChangePassword || u.must_change_password),
    });
    return { ok: true, user, source: 'server', chooseRole: false };
  }
  return { ok: false, error: res.data?.error || 'Incorrect email or password.', source: 'server' };
};

export const changePassword = async (currentPassword, newPassword) => {
  if (!currentPassword) return { ok: false, error: 'Enter your current password.' };
  if (String(newPassword || '').length < 8) return { ok: false, error: 'Password must be at least 8 characters.' };
  const res = await postAuth('/change-password', { currentPassword, newPassword });
  if (!res.reachable) return { ok: false, error: 'The server is not answering. Try again in a moment.' };
  if (!res.ok) return { ok: false, error: res.data?.error || 'Could not change the password.' };
  return { ok: true, user: setSession({ ...(getSession() || {}), mustChangePassword: false }) };
};

export const requestPasswordReset = async (email) => {
  const res = await postAuth('/forgot-password', { email });
  if (!res.reachable) return { ok: false, error: 'The server is not answering.' };
  if (!res.ok) return { ok: false, error: res.data?.error || 'Could not start password reset.' };
  return { ok: true, message: res.data?.message || '', devToken: res.data?.devToken || '' };
};

export const resetPassword = async ({ token, password } = {}) => {
  const res = await postAuth('/reset-password', { token, password });
  if (!res.reachable) return { ok: false, error: 'The server is not answering.' };
  if (!res.ok) return { ok: false, error: res.data?.error || 'This reset link is invalid or has expired.' };
  return { ok: true, user: getSession() };
};

export const lookupAccountLink = async (kind, token) => {
  try {
    const path = kind === 'invitation' ? `/invitations/${encodeURIComponent(token || '')}` : `/reset-password?token=${encodeURIComponent(token || '')}`;
    const res = await fetch(`${authBase()}${path}`, { credentials: 'include' });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, gone: res.status === 410, error: data?.error || 'This link does not work.' };
    return { ok: true, ...(data || {}) };
  } catch {
    return { ok: false, error: 'The server is not answering.' };
  }
};

export const acceptInvitation = async ({ token, password } = {}) => {
  const res = await postAuth(`/invitations/${encodeURIComponent(token || '')}/accept`, { password });
  if (!res.ok) return { ok: false, gone: res.status === 410, error: res.data?.error || 'Could not set the password.' };
  return { ok: true, user: getSession(), chooseRole: false };
};

export const requestInvitation = async () => ({
  ok: true,
  message: 'If that address has an account waiting to be set up, a new link has been sent.',
});

export const fetchPrivacyNotice = async () => null;
export const seedDemoAccounts = () => [];
export const listAccounts = () => [];
export const signup = async () => ({ ok: false, error: 'Accounts are provisioned by an administrator.' });
export const loginLocal = () => ({ ok: false, error: 'Use the unified login page.' });
export const signupLocal = () => ({ ok: false, error: 'Use the unified login page.' });
export const authMode = async () => 'server';
export const fetchDemoAccounts = async () => {
  try {
    const res = await fetch(`${authBase()}/demo-accounts`, { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    const accounts = Array.isArray(data?.accounts) ? data.accounts : (Array.isArray(data) ? data : []);
    return accounts.length ? { password: String(data?.password || ''), accounts } : null;
  } catch {
    return null;
  }
};

export const reconcileSession = async () => {
  const saved = getSession();
  return saved ? { status: 'server', user: saved } : { status: 'none', user: null };
};

export const nameForRoleWithSession = (session, rawRole, fallbackName = '') => {
  if (session?.name && normalizeRoleKey(session.role) === normalizeRoleKey(rawRole)) return session.name;
  return fallbackName;
};

export const roleFromPath = (pathname = '') => {
  const path = String(pathname || '');
  const roleMatch = /^\/role\/([^/?#]+)/.exec(path);
  if (roleMatch) return decodeURIComponent(roleMatch[1]);
  if (path.startsWith('/vpaa/')) return 'vpaa';
  if (path.startsWith('/dean/')) return 'dean';
  if (path.startsWith('/program-head/')) return 'program-head';
  if (path.startsWith('/library/')) return 'director-of-libraries';
  if (path.startsWith('/consultant/')) return 'industry-consultant';
  if (path.startsWith('/instructor/')) return 'instructor';
  return '';
};

const INSTRUCTOR_PATHS = ['/courses', '/offerings', '/revisions', '/references', '/topics', '/tlas', '/ilos', '/instructor'];
const isRootPath = (pathname = '') => (String(pathname).split(/[?#]/)[0].replace(/\/+$/, '') || '/') === '/';

export const isInstructorPath = (pathname = '') => {
  const path = String(pathname).split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  if (path === '/') return true;
  return INSTRUCTOR_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
};

export const roleToActivate = (session, pathname = '') => {
  if (!session?.role || !(session.roles || []).length) return '';
  if (isRootPath(pathname)) return '';
  const urlRole = roleFromPath(pathname);
  const needed = urlRole ? (roleMeta(urlRole) ? urlRole : '') : (isInstructorPath(pathname) ? 'instructor' : '');
  return needed && needed !== session.role && session.roles.includes(needed) ? needed : '';
};

export const actingRole = (session = getSession(), pathname = (typeof window === 'undefined' ? '' : window.location?.pathname || '')) => {
  if (!session?.role) return '';
  return roleToActivate(session, pathname) || session.role;
};

export const routeGuardRedirect = () => null;

export const onSessionChange = (handler) => {
  window.addEventListener(SESSION_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(SESSION_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
};

export default {
  ROLES,
  changePassword,
  registrationRoles,
  DEMO_PASSWORD,
  roleMeta,
  homeRouteForRole,
  seedDemoAccounts,
  listAccounts,
  getSession,
  setSession,
  login,
  signup,
  loginLocal,
  signupLocal,
  authMode,
  fetchDemoAccounts,
  fetchPrivacyNotice,
  requestPasswordReset,
  resetPassword,
  logout,
  nameForRoleWithSession,
  roleFromPath,
  routeGuardRedirect,
  onSessionChange,
};
