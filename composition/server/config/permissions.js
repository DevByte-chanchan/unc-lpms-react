'use strict';

// The fixed role-to-permission matrix. This is the single place that says what each role
// may do. There are NO per-user overrides: a user's permissions are exactly their role's.
// Routes guard themselves with requireRole / requirePermission (middleware/auth.js);
// to change what a role can do, change it here and in that route's guard.

const PERMISSIONS = Object.freeze({
    'users:manage': 'Create accounts, change roles, activate or deactivate users',
    'audit:read': 'Read the audit trail',
    'course:assign': 'Assign a course and lead instructor for a term',
    'consultant:manage': 'Assign or deactivate industry consultants on courses',
    'alignment:manage': 'Maintain CO-PO and PO-PEO alignment',
    'coaep:generate': 'Generate and export the COAEP',
    'plan:edit': 'Edit and submit a learning plan; start a revision',
    'plan:review': 'Accept or return a learning plan in the approval chain',
    'plan:comment': 'Comment on a learning plan',
    'plan:view-approved': 'Read approved learning plans and export them',
    'reference:manage': 'Maintain the reference library',
    'form-settings:edit': 'Edit the ISO form revision and effectivity',
    'notification:poke': 'Send a reminder to a reviewer with a pending item'
});

const ROLE_PERMISSIONS = Object.freeze({
    superuser: ['users:manage', 'audit:read'],
    instructor: ['plan:edit', 'plan:comment', 'plan:view-approved'],
    'program-head': ['course:assign', 'consultant:manage', 'alignment:manage', 'coaep:generate', 'plan:review', 'plan:comment', 'plan:view-approved', 'notification:poke'],
    'director-of-libraries': ['reference:manage', 'plan:review', 'plan:comment', 'plan:view-approved'],
    'industry-consultant': ['plan:comment'],
    dean: ['plan:review', 'plan:comment', 'plan:view-approved', 'form-settings:edit', 'notification:poke'],
    vpaa: ['plan:view-approved']
});

const permissionsOf = (role) => ROLE_PERMISSIONS[role] || [];
const hasPermission = (role, permission) => permissionsOf(role).includes(permission);

module.exports = { PERMISSIONS, ROLE_PERMISSIONS, permissionsOf, hasPermission };
