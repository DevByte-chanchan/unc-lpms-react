/**
 * Roles and the email rule — mirrors server/utils/roles.js. Keep the two in step.
 * There is no HR Staff role: /role/hr-staff redirects to the VPAA's pages.
 */

export const ROLES = [
  'Instructor',
  'Program Head',
  'Dean',
  'VPAA',
  'Director of Libraries',
  'Industry Consultant',
];

export const ROLE_HOMES = {
  'Instructor':            '/',
  'Program Head':          '/role/program-head/course-offerings?page=Course%20Offerings',
  'Dean':                  '/role/dean?page=Faculty',
  'VPAA':                  '/role/ovpaa',
  'Director of Libraries': '/role/director-of-libraries/approval-course-table',
  'Industry Consultant':   '/role/industry-consultant/approval-course-table',
};

// One line each, for the "Continue as…" picker.
export const ROLE_DESCRIPTIONS = {
  'Instructor':            'Write syllabi and TOS for the courses assigned to you.',
  'Program Head':          'Manage your program’s courses, assignments and consultants.',
  'Dean':                  'Faculty, programs, and your department’s vision and mission.',
  'VPAA':                  'Academic terms, departments, university VMGO and accounts.',
  'Director of Libraries': 'Review the references in submitted syllabi.',
  'Industry Consultant':   'Review the syllabi of the courses you consult on.',
};

// The /role/:approver URL segment → the role that may open it.
export const SEGMENT_ROLES = {
  'program-head':          'Program Head',
  'dean':                  'Dean',
  'ovpaa':                 'VPAA',
  'hr-staff':              'VPAA',
  'director-of-libraries': 'Director of Libraries',
  'industry-consultant':   'Industry Consultant',
};

export const homeFor = (role) => ROLE_HOMES[role] || '/login';

/**
 * The role a path needs, or null when any signed-in user may open it.
 * /role/<segment>/… needs that segment's role (undefined for an unknown
 * segment, which nobody can open); everything else is Instructor.
 */
export function roleForPath(pathname) {
  const p = String(pathname || '/');
  if (p === '/change-password') return null;
  const m = p.match(/^\/role\/([^/?#]+)/);
  if (m) return SEGMENT_ROLES[m[1]];
  return 'Instructor';
}

/** A same-origin relative path (no //host, no scheme) that `roles` may open. */
export function safeNext(next, roles) {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null;
  const pathname = next.split(/[?#]/)[0];
  if (pathname === '/login' || pathname === '/change-password') return null;
  const needed = roleForPath(pathname);
  if (needed === undefined) return null;
  if (needed && !(roles || []).includes(needed)) return null;
  return next;
}

// --- Email domain ---------------------------------------------------------
export const ALLOWED_EMAIL_DOMAIN =
  String((import.meta.env && import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN) || 'unc.edu.ph').toLowerCase();

export const DOMAIN_MESSAGE = 'Use your @' + ALLOWED_EMAIL_DOMAIN + ' email address.';

/** Exact domain only, case-insensitive: no subdomains, no look-alikes. */
export function isAllowedEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  const at = e.lastIndexOf('@');
  if (at <= 0 || e.indexOf('@') !== at) return false;
  if (!/^[a-z0-9._%+-]+$/.test(e.slice(0, at))) return false;
  return e.slice(at + 1) === ALLOWED_EMAIL_DOMAIN;
}

/** "junar.danila" → "junar.danila@unc.edu.ph"; anything with an @ is left alone. */
export function completeEmail(raw) {
  const e = String(raw || '').trim();
  if (!e || e.includes('@')) return e;
  return e + '@' + ALLOWED_EMAIL_DOMAIN;
}
