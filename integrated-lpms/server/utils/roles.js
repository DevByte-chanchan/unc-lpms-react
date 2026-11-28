'use strict';

/**
 * Unified Role Normalization Layer
 * Reconciles all 3 modules:
 *  - Canonical Title Case (DB + M1 + M2): 'VPAA', 'Dean', 'Program Head', 'Director of Libraries', 'Instructor', 'Industry Consultant', 'Superuser'
 *  - Kebab-case (M3 routes / RBAC / X-LPMS-Role): 'vpaa', 'dean', 'program-head', 'director-of-libraries', 'instructor', 'industry-consultant', 'superuser'
 *  - Workflow / Comment UPPER_SNAKE (M2 + M3 logs/comments): 'VPAA', 'DEAN', 'PROGRAM_HEAD', 'LIBRARY_DIRECTOR', 'INSTRUCTOR', 'INDUSTRY_CONSULTANT', 'SUPERUSER'
 */

const ROLES = Object.freeze({
  VPAA: 'VPAA',
  DEAN: 'Dean',
  PROGRAM_HEAD: 'Program Head',
  DIRECTOR_OF_LIBRARIES: 'Director of Libraries',
  INSTRUCTOR: 'Instructor',
  INDUSTRY_CONSULTANT: 'Industry Consultant',
  SUPERUSER: 'Superuser',
});

const CANONICAL_ROLES = Object.freeze([
  ROLES.INSTRUCTOR,
  ROLES.PROGRAM_HEAD,
  ROLES.DEAN,
  ROLES.VPAA,
  ROLES.DIRECTOR_OF_LIBRARIES,
  ROLES.INDUSTRY_CONSULTANT,
  ROLES.SUPERUSER,
]);

const ROLE_PRIORITY = Object.freeze([
  ROLES.SUPERUSER,
  ROLES.VPAA,
  ROLES.DEAN,
  ROLES.PROGRAM_HEAD,
  ROLES.DIRECTOR_OF_LIBRARIES,
  ROLES.INDUSTRY_CONSULTANT,
  ROLES.INSTRUCTOR,
]);

const CANONICAL_TO_KEBAB = Object.freeze({
  [ROLES.VPAA]: 'vpaa',
  [ROLES.DEAN]: 'dean',
  [ROLES.PROGRAM_HEAD]: 'program-head',
  [ROLES.DIRECTOR_OF_LIBRARIES]: 'director-of-libraries',
  [ROLES.INSTRUCTOR]: 'instructor',
  [ROLES.INDUSTRY_CONSULTANT]: 'industry-consultant',
  [ROLES.SUPERUSER]: 'superuser',
});

const CANONICAL_TO_WORKFLOW = Object.freeze({
  [ROLES.VPAA]: 'VPAA',
  [ROLES.DEAN]: 'DEAN',
  [ROLES.PROGRAM_HEAD]: 'PROGRAM_HEAD',
  [ROLES.DIRECTOR_OF_LIBRARIES]: 'LIBRARY_DIRECTOR',
  [ROLES.INSTRUCTOR]: 'INSTRUCTOR',
  [ROLES.INDUSTRY_CONSULTANT]: 'INDUSTRY_CONSULTANT',
  [ROLES.SUPERUSER]: 'SUPERUSER',
});

const ALIAS_MAP = {
  vpaa: ROLES.VPAA,
  ovpaa: ROLES.VPAA,
  'hr-staff': ROLES.VPAA,
  'hr staff': ROLES.VPAA,
  'vice president for academic affairs': ROLES.VPAA,

  dean: ROLES.DEAN,

  'program head': ROLES.PROGRAM_HEAD,
  'program-head': ROLES.PROGRAM_HEAD,
  program_head: ROLES.PROGRAM_HEAD,
  programhead: ROLES.PROGRAM_HEAD,
  chair: ROLES.PROGRAM_HEAD,

  'director of libraries': ROLES.DIRECTOR_OF_LIBRARIES,
  'director-of-libraries': ROLES.DIRECTOR_OF_LIBRARIES,
  director_of_libraries: ROLES.DIRECTOR_OF_LIBRARIES,
  'library director': ROLES.DIRECTOR_OF_LIBRARIES,
  'library-director': ROLES.DIRECTOR_OF_LIBRARIES,
  library_director: ROLES.DIRECTOR_OF_LIBRARIES,
  librarian: ROLES.DIRECTOR_OF_LIBRARIES,

  instructor: ROLES.INSTRUCTOR,
  faculty: ROLES.INSTRUCTOR,
  teacher: ROLES.INSTRUCTOR,

  'industry consultant': ROLES.INDUSTRY_CONSULTANT,
  'industry-consultant': ROLES.INDUSTRY_CONSULTANT,
  industry_consultant: ROLES.INDUSTRY_CONSULTANT,
  consultant: ROLES.INDUSTRY_CONSULTANT,

  superuser: ROLES.SUPERUSER,
  super_user: ROLES.SUPERUSER,
  admin: ROLES.SUPERUSER,
};

function toCanonicalRole(raw) {
  if (!raw) return null;
  const cleaned = String(raw).trim().toLowerCase().replace(/\s+/g, ' ');
  return ALIAS_MAP[cleaned] || null;
}

function toKebabRole(raw) {
  const c = toCanonicalRole(raw);
  return c ? CANONICAL_TO_KEBAB[c] : null;
}

function toWorkflowRole(raw) {
  const c = toCanonicalRole(raw);
  return c ? CANONICAL_TO_WORKFLOW[c] : null;
}

function normalizeRoleList(raw) {
  let list = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        list = Array.isArray(parsed) ? parsed : [trimmed];
      } catch {
        list = [trimmed];
      }
    } else if (trimmed) {
      list = trimmed.split(',').map((s) => s.trim());
    }
  }
  const seen = new Set();
  const result = [];
  for (const item of list) {
    const canon = toCanonicalRole(item);
    if (canon && !seen.has(canon)) {
      seen.add(canon);
      result.push(canon);
    }
  }
  return result.length ? result : [ROLES.INSTRUCTOR];
}

function pickDefaultActiveRole(roles, preferred) {
  const normalized = normalizeRoleList(roles);
  const pref = toCanonicalRole(preferred);
  if (pref && normalized.includes(pref)) return pref;
  for (const r of ROLE_PRIORITY) {
    if (normalized.includes(r)) return r;
  }
  return normalized[0] || ROLES.INSTRUCTOR;
}

function deriveRolesFromPosition(position) {
  const p = String(position || '').trim().toLowerCase();
  if (p.includes('program head') || p === 'chair') {
    return [ROLES.PROGRAM_HEAD, ROLES.INSTRUCTOR];
  }
  if (p === 'dean') return [ROLES.DEAN];
  if (p.includes('vpaa')) return [ROLES.VPAA];
  if (p.includes('librar')) return [ROLES.DIRECTOR_OF_LIBRARIES];
  if (p.includes('consultant')) return [ROLES.INDUSTRY_CONSULTANT];
  return [ROLES.INSTRUCTOR];
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isAllowedEmail(email, roles = []) {
  const clean = normalizeEmail(email);
  if (!clean || !clean.includes('@')) return false;
  const domain = (process.env.ALLOWED_EMAIL_DOMAIN || 'unc.edu.ph').toLowerCase();
  if (clean.endsWith('@' + domain)) return true;
  const allowExternal = String(process.env.ALLOW_EXTERNAL_CONSULTANT_EMAILS || 'true').toLowerCase() === 'true';
  const canonRoles = normalizeRoleList(roles);
  if (allowExternal && canonRoles.length === 1 && canonRoles[0] === ROLES.INDUSTRY_CONSULTANT) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
  }
  return false;
}

module.exports = {
  ROLES,
  CANONICAL_ROLES,
  ROLE_PRIORITY,
  CANONICAL_TO_KEBAB,
  CANONICAL_TO_WORKFLOW,
  toCanonicalRole,
  normalizeRole: toCanonicalRole,
  toKebabRole,
  toWorkflowRole,
  normalizeRoleList,
  pickDefaultActiveRole,
  deriveRolesFromPosition,
  normalizeEmail,
  isAllowedEmail,
};
