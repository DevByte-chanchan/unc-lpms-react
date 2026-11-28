'use strict';

const { toKebabRole } = require('../utils/roles');

const ROLE_PERMISSIONS = Object.freeze({
  superuser: ['users:manage', 'audit:read'],
  vpaa: ['plan:view-approved', 'users:manage', 'terms:manage', 'departments:manage', 'vmgo:manage'],
  dean: ['plan:review', 'plan:comment', 'plan:view-approved', 'deadline:view', 'faculty:manage', 'programs:manage', 'dept-vm:manage'],
  'program-head': [
    'course:assign',
    'courses:manage',
    'consultant:manage',
    'alignment:manage',
    'coaep:generate',
    'plan:review',
    'plan:comment',
    'plan:view-approved',
    'deadline:view',
    'deadline:manage',
  ],
  'director-of-libraries': ['reference:manage', 'plan:review', 'plan:comment', 'plan:view-approved'],
  instructor: ['plan:edit', 'plan:comment', 'plan:view-approved'],
  'industry-consultant': ['plan:comment', 'plan:view-approved'],
});

function permissionsForRole(role) {
  const k = toKebabRole(role);
  return ROLE_PERMISSIONS[k] || [];
}

function hasPermission(userOrRole, permission) {
  if (!userOrRole) return false;
  if (typeof userOrRole === 'string') {
    return permissionsForRole(userOrRole).includes(permission);
  }
  const active = userOrRole.role || userOrRole.activeRole;
  if (active && permissionsForRole(active).includes(permission)) return true;
  const roles = Array.isArray(userOrRole.roles) ? userOrRole.roles : [];
  return roles.some((r) => permissionsForRole(r).includes(permission));
}

module.exports = {
  ROLE_PERMISSIONS,
  permissionsForRole,
  hasPermission,
};
