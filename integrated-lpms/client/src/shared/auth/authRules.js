import { ROLE_DESCRIPTIONS, getDefaultRouteForRole, normalizeRoleName } from '../navConfig.js';

export { ROLE_DESCRIPTIONS };

export const ALLOWED_EMAIL_DOMAIN = String(
  (import.meta.env && import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN) || 'unc.edu.ph'
).toLowerCase();

export const DOMAIN_MESSAGE = `Use your @${ALLOWED_EMAIL_DOMAIN} email address.`;

export const MIN_PASSWORD = 8;

export function newPasswordChecks(next, confirm) {
  return [
    { ok: next.length >= MIN_PASSWORD, label: `At least ${MIN_PASSWORD} characters` },
    { ok: next !== '' && next === confirm, label: 'Matches the confirmation' },
  ];
}

export function isAllowedEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  const at = e.lastIndexOf('@');
  if (at <= 0 || e.indexOf('@') !== at) return false;
  if (!/^[a-z0-9._%+-]+$/.test(e.slice(0, at))) return false;
  // Accept UNC domain plus any valid external email (e.g. external Industry Consultants)
  const domain = e.slice(at + 1);
  return domain === ALLOWED_EMAIL_DOMAIN || /^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain);
}

export function completeEmail(raw) {
  const e = String(raw || '').trim();
  if (!e || e.includes('@')) return e;
  return `${e}@${ALLOWED_EMAIL_DOMAIN}`;
}

export function homeFor(role) {
  return getDefaultRouteForRole(role);
}

export function safeNext(next, roles = []) {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return null;
  }
  const pathname = next.split(/[?#]/)[0];
  if (
    pathname === '/login' ||
    pathname === '/change-password' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname === '/set-password'
  ) {
    return null;
  }
  const normRoles = (roles || []).map(normalizeRoleName);
  if (pathname.startsWith('/vpaa') && !normRoles.includes('VPAA') && !normRoles.includes('Superuser')) return null;
  if (pathname.startsWith('/dean') && !normRoles.includes('Dean')) return null;
  if (pathname.startsWith('/program-head') && !normRoles.includes('Program Head')) return null;
  if (pathname.startsWith('/library') && !normRoles.includes('Director of Libraries')) return null;
  if (pathname.startsWith('/consultant') && !normRoles.includes('Industry Consultant')) return null;
  if (pathname.startsWith('/instructor') && !normRoles.includes('Instructor')) return null;
  return next;
}
