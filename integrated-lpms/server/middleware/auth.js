'use strict';

const db = require('../models');
const { extractToken, verifySessionToken } = require('../utils/session');
const {
  toCanonicalRole,
  toKebabRole,
  toWorkflowRole,
  normalizeRoleList,
  pickDefaultActiveRole,
} = require('../utils/roles');
const { hasPermission, permissionsForRole } = require('../config/permissions');
const { canAccessSection } = require('../config/sectionAccess');

const ROLE_HEADER = 'x-lpms-role';

async function resolveSessionUser(req) {
  const token = extractToken(req);
  const payload = verifySessionToken(token);
  if (!payload || !payload.sub) return null;

  const user = await db.User.findByPk(payload.sub);
  if (!user) return null;
  if (user.is_active === false || user.status === 'Disabled') return null;

  // Verify password version (instant invalidation on password change/reset)
  const currentPv = user.password_changed_at ? new Date(user.password_changed_at).getTime() : 0;
  if (payload.pv != null && currentPv && payload.pv !== currentPv) {
    return null;
  }

  const canonicalRoles = normalizeRoleList(user.roles || user.role);
  const kebabRoles = canonicalRoles.map(toKebabRole).filter(Boolean);

  // Acting role priority: X-LPMS-Role header -> JWT activeRole -> user.active_role -> roles[0]
  const headerAsked = toCanonicalRole(req.headers?.[ROLE_HEADER]);
  let activeCanonicalRole;
  if (headerAsked && canonicalRoles.includes(headerAsked)) {
    activeCanonicalRole = headerAsked;
  } else {
    activeCanonicalRole = pickDefaultActiveRole(canonicalRoles, payload.activeRole || user.active_role);
  }

  const activeKebabRole = toKebabRole(activeCanonicalRole) || 'instructor';
  const activeWorkflowRole = toWorkflowRole(activeCanonicalRole) || 'INSTRUCTOR';

  // Resolve Faculty / Department / Consultant links dynamically (works across periods)
  let faculty = null;
  if (user.faculty_id && db.Faculty) {
    faculty = await db.Faculty.findByPk(user.faculty_id);
  }
  if (!faculty && db.Faculty && user.email) {
    faculty = await db.Faculty.findOne({
      where: { email: user.email },
      order: [['academic_period_id', 'DESC'], ['faculty_id', 'DESC']],
    });
  }

  let department = null;
  if (faculty && faculty.department_id && db.Department) {
    department = await db.Department.findByPk(faculty.department_id);
  }
  if (!department && db.Department) {
    // Also check if user is assigned as Dean on a Department row
    department = await db.Department.findOne({
      where: { stakeholder_id: user.user_id },
      order: [['academic_period_id', 'DESC'], ['dept_id', 'DESC']],
    });
  }

  let consultant = null;
  if (user.industry_consultant_id && db.IndustryConsultant) {
    consultant = await db.IndustryConsultant.findByPk(user.industry_consultant_id);
  }
  if (!consultant && db.IndustryConsultant) {
    consultant = await db.IndustryConsultant.findOne({
      where: { user_id: user.user_id },
      order: [['academic_period_id', 'DESC']],
    });
  }

  return {
    id: user.user_id,
    user_id: user.user_id,
    email: user.email,
    name: user.name,
    full_name: user.name,
    display_name: user.name,
    roles: canonicalRoles,
    kebabRoles,
    activeRole: activeCanonicalRole,
    role: activeKebabRole,
    workflowRole: activeWorkflowRole,
    permissions: permissionsForRole(activeCanonicalRole),
    facultyId: faculty?.faculty_id || user.faculty_id || null,
    industryConsultantId: consultant?.industry_consultant_id || user.industry_consultant_id || null,
    departmentId: department?.dept_id || faculty?.department_id || null,
    departmentCode: department?.code || null,
    departmentName: department?.name || faculty?.department || null,
    mustChangePassword: Boolean(user.must_change_password),
    must_change_password: Boolean(user.must_change_password),
    status: user.status,
    is_active: Boolean(user.is_active),
  };
}

async function attachUser(req, _res, next) {
  try {
    req.user = await resolveSessionUser(req);
  } catch (err) {
    console.warn('[auth] attachUser failed:', err.message);
    req.user = null;
  }
  next();
}

async function requireAuth(req, res, next) {
  try {
    const user = req.user || (await resolveSessionUser(req));
    if (!user) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }
    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

function requireRole(...allowed) {
  const allowedSet = new Set(allowed.map((r) => toCanonicalRole(r)).filter(Boolean));
  return async (req, res, next) => {
    try {
      const user = req.user || (await resolveSessionUser(req));
      if (!user) {
        return res.status(401).json({ error: 'Authentication required.' });
      }
      req.user = user;
      const matchesActive = allowedSet.has(user.activeRole);
      const matchesAny = user.roles.some((r) => allowedSet.has(r));
      if (!matchesActive && !matchesAny) {
        return res.status(403).json({
          error: `Access denied. Required role: ${[...allowedSet].join(', ')}`,
        });
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

function requirePermission(permission) {
  return async (req, res, next) => {
    try {
      const user = req.user || (await resolveSessionUser(req));
      if (!user) {
        return res.status(401).json({ error: 'Authentication required.' });
      }
      req.user = user;
      if (!hasPermission(user, permission)) {
        return res.status(403).json({ error: `Missing required permission: ${permission}` });
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

function requireSection(section) {
  return async (req, res, next) => {
    try {
      const user = req.user || (await resolveSessionUser(req));
      if (!user) return res.status(401).json({ error: 'Authentication required.' });
      req.user = user;
      if (!canAccessSection(user.activeRole, section)) {
        return res.status(403).json({ error: `Role ${user.activeRole} cannot access section '${section}'.` });
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

function restrictSuperuser(req, res, next) {
  if (!req.user) return next();
  if (req.user.role === 'superuser') {
    const allowed = /^\/(user-accounts|audit-logs|profile|auth)(\/|$|\?)/;
    if (!allowed.test(req.path)) {
      return res.status(403).json({ error: 'Superuser accounts are restricted to user management and audit logs.' });
    }
  }
  return next();
}

module.exports = {
  resolveSessionUser,
  attachUser,
  requireAuth,
  requireRole,
  requirePermission,
  requireSection,
  restrictSuperuser,
};
