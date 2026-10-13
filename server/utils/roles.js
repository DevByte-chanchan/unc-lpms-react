/**
 * Roles and the account email rule — the ONE list on the server.
 * Mirrored on the client in src/services/roles.js; keep the two in step.
 *
 * There is no HR Staff role: its pages belong to the VPAA.
 */

export const ROLES = Object.freeze([
  'Instructor',
  'Program Head',
  'Dean',
  'VPAA',
  'Director of Libraries',
  'Industry Consultant',
]);

export const ROLE_HOMES = Object.freeze({
  'Instructor':            '/',
  'Program Head':          '/role/program-head/course-offerings?page=Course%20Offerings',
  'Dean':                  '/role/dean?page=Faculty',
  'VPAA':                  '/role/ovpaa',
  'Director of Libraries': '/role/director-of-libraries/approval-course-table',
  'Industry Consultant':   '/role/industry-consultant/approval-course-table',
});

export const isRole = (r) => ROLES.includes(r);

/** Every entry is a known role, no duplicates, at least one. */
export function validRoles(roles) {
  return Array.isArray(roles) && roles.length > 0 &&
    roles.every(isRole) && new Set(roles).size === roles.length;
}

/** Sorted into the canonical order above, so the first role is predictable. */
export const sortRoles = (roles) => ROLES.filter((r) => roles.includes(r));

export const hasRole = (user, ...roles) =>
  !!user && Array.isArray(user.roles) && user.roles.some((r) => roles.includes(r));

// --- Email domain ---------------------------------------------------------
// Read on every call so tests (and a changed .env) don't need a restart.
export const allowedEmailDomain = () =>
  String(process.env.ALLOWED_EMAIL_DOMAIN || 'unc.edu.ph').trim().toLowerCase();

export const normalizeEmail = (s) => String(s || '').trim().toLowerCase();

/**
 * True only for <local>@<exact domain>, case-insensitive. Rejects subdomains
 * (x@sub.unc.edu.ph) and look-alikes (x@unc.edu.ph.evil.com).
 */
export function isAllowedEmail(email) {
  const e = normalizeEmail(email);
  const at = e.lastIndexOf('@');
  if (at <= 0 || e.indexOf('@') !== at) return false;
  const local = e.slice(0, at);
  if (!/^[a-z0-9._%+-]+$/.test(local)) return false;
  return e.slice(at + 1) === allowedEmailDomain();
}

/** A plausible address of any domain (shape only). */
export function isValidEmail(email) {
  const e = normalizeEmail(email);
  return /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(e);
}

/** ALLOW_EXTERNAL_CONSULTANT_EMAILS=true — read on every call, like the domain. */
export const externalConsultantEmailsAllowed = () =>
  ['1', 'true', 'yes', 'on'].includes(String(process.env.ALLOW_EXTERNAL_CONSULTANT_EMAILS || '').trim().toLowerCase());

/**
 * The email rule for an account with `roles`: a UNC address always passes;
 * any valid address passes only when the switch is on AND the roles are
 * exactly ['Industry Consultant'].
 */
export function isAllowedEmailForRoles(email, roles) {
  if (isAllowedEmail(email)) return true;
  if (!externalConsultantEmailsAllowed()) return false;
  const list = Array.isArray(roles) ? roles : [];
  return list.length === 1 && list[0] === 'Industry Consultant' && isValidEmail(email);
}

export const domainMessage = () => 'Use your @' + allowedEmailDomain() + ' email address.';
export const EXTERNAL_EMAIL_MESSAGE = 'This account uses a non-UNC email; give it a UNC address first.';
