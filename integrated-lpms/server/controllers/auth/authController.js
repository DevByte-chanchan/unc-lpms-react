'use strict';

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Op } = require('sequelize');
const db = require('../../models');
const {
  signSessionToken,
  setSessionCookie,
  clearSessionCookie,
} = require('../../utils/session');
const {
  normalizeEmail,
  toCanonicalRole,
  toKebabRole,
  toWorkflowRole,
  normalizeRoleList,
  pickDefaultActiveRole,
} = require('../../utils/roles');
const { permissionsForRole } = require('../../config/permissions');
const { resolveSessionUser } = require('../../middleware/auth');

const DEMO_CREDENTIAL_HINTS = {
  'monica.norton@unc.edu.ph': 'Instructor@2026',
  'olivia.vance@unc.edu.ph': 'ProgramHead@2026',
  'maria.santos@unc.edu.ph': 'Library@2026',
  'roberto.cruz@unc.edu.ph': 'Consultant@2026',
  'sophia.sterling@unc.edu.ph': 'Dean@2026',
  'carlos.garcia@unc.edu.ph': 'Vpaa@2026',
};

async function buildClientUserPayload(userRow, activeRoleOverride = null) {
  const canonicalRoles = normalizeRoleList(userRow.roles || userRow.role);
  const activeCanonical = activeRoleOverride && canonicalRoles.includes(activeRoleOverride)
    ? activeRoleOverride
    : pickDefaultActiveRole(canonicalRoles, userRow.active_role);

  let faculty = null;
  if (userRow.faculty_id) faculty = await db.Faculty.findByPk(userRow.faculty_id);
  if (!faculty && userRow.email) {
    faculty = await db.Faculty.findOne({ where: { email: userRow.email }, order: [['faculty_id', 'DESC']] });
  }

  let department = null;
  if (faculty?.department_id) department = await db.Department.findByPk(faculty.department_id);
  if (!department) {
    department = await db.Department.findOne({ where: { stakeholder_id: userRow.user_id }, order: [['dept_id', 'DESC']] });
  }

  let program = null;
  if (canonicalRoles.includes('Program Head')) {
    program = await db.Program.findOne({
      where: {
        [Op.or]: [
          { stakeholder_id: userRow.user_id },
          ...(faculty ? [{ program_head_id: faculty.faculty_id }] : []),
        ],
      },
      order: [['program_id', 'ASC']],
    });
  }

  return {
    id: userRow.user_id,
    user_id: userRow.user_id,
    email: userRow.email,
    name: userRow.name,
    full_name: userRow.name,
    display_name: userRow.name,
    roles: canonicalRoles,
    kebabRoles: canonicalRoles.map(toKebabRole).filter(Boolean),
    activeRole: activeCanonical,
    role: toKebabRole(activeCanonical) || 'instructor',
    workflowRole: toWorkflowRole(activeCanonical) || 'INSTRUCTOR',
    permissions: permissionsForRole(activeCanonical),
    facultyId: faculty?.faculty_id || userRow.faculty_id || null,
    industryConsultantId: userRow.industry_consultant_id || null,
    departmentId: department?.dept_id || faculty?.department_id || null,
    departmentCode: department?.code || null,
    departmentName: department?.name || faculty?.department || null,
    programId: program?.program_id || null,
    programName: program?.name || null,
    mustChangePassword: Boolean(userRow.must_change_password),
    must_change_password: Boolean(userRow.must_change_password),
    status: userRow.status,
    is_active: Boolean(userRow.is_active),
  };
}

exports.getDemoAccounts = async (_req, res, next) => {
  try {
    const users = await db.User.findAll({
      where: { is_active: true },
      order: [['user_id', 'ASC']],
    });
    const accounts = users.map((u) => ({
      user_id: u.user_id,
      name: u.name,
      email: u.email,
      role: u.active_role || u.role,
      roles: normalizeRoleList(u.roles || u.role),
      password: DEMO_CREDENTIAL_HINTS[u.email] || null,
    }));
    return res.json({ accounts });
  } catch (err) {
    return next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email || req.body?.username);
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await db.User.scope('withHash').findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    if (user.is_active === false || user.status === 'Disabled') {
      return res.status(403).json({ error: 'This account has been disabled.' });
    }
    if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
      return res.status(423).json({ error: 'Account temporarily locked due to repeated failed attempts.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const fails = Number(user.failed_attempts || 0) + 1;
      await user.update({
        failed_attempts: fails,
        locked_until: fails >= 10 ? new Date(Date.now() + 15 * 60 * 1000) : null,
      });
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const requestedRole = toCanonicalRole(req.body?.activeRole || req.body?.role);
    const canonicalRoles = normalizeRoleList(user.roles || user.role);
    const activeRole = requestedRole && canonicalRoles.includes(requestedRole)
      ? requestedRole
      : pickDefaultActiveRole(canonicalRoles, user.active_role);

    await user.update({
      failed_attempts: 0,
      locked_until: null,
      last_login_at: new Date(),
      active_role: activeRole,
    });

    const token = signSessionToken(user, activeRole);
    setSessionCookie(res, token);

    const payload = await buildClientUserPayload(user, activeRole);

    if (db.AuditLog) {
      db.AuditLog.create({
        actor_user_id: user.user_id,
        actor_name: user.name,
        actor_role: payload.role,
        action: 'POST /api/auth/login',
        entity_type: 'auth',
        entity_id: String(user.user_id),
        outcome: 'success',
        ip_address: req.ip || null,
      }).catch(() => {});
    }

    return res.json({
      token,
      user: payload,
      account: payload,
    });
  } catch (err) {
    return next(err);
  }
};

exports.logout = async (_req, res) => {
  clearSessionCookie(res);
  return res.json({ ok: true, message: 'Logged out successfully.' });
};

exports.getMe = async (req, res, next) => {
  try {
    const resolved = req.user || (await resolveSessionUser(req));
    if (!resolved) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    const userRow = await db.User.findByPk(resolved.user_id);
    if (!userRow) return res.status(401).json({ error: 'Not authenticated.' });
    const payload = await buildClientUserPayload(userRow, resolved.activeRole);
    return res.json({ user: payload, account: payload, ...payload });
  } catch (err) {
    return next(err);
  }
};

exports.getSession = async (req, res, next) => {
  try {
    const resolved = req.user || (await resolveSessionUser(req));
    if (!resolved) {
      return res.json({ authenticated: false, user: null, account: null });
    }
    const userRow = await db.User.findByPk(resolved.user_id);
    if (!userRow) return res.json({ authenticated: false, user: null, account: null });
    const payload = await buildClientUserPayload(userRow, resolved.activeRole);
    return res.json({ authenticated: true, user: payload, account: payload });
  } catch (err) {
    return next(err);
  }
};

exports.switchRole = async (req, res, next) => {
  try {
    const targetRole = toCanonicalRole(req.body?.role || req.body?.activeRole);
    if (!targetRole) {
      return res.status(400).json({ error: 'A valid target role is required.' });
    }

    const userRow = await db.User.findByPk(req.user.user_id);
    if (!userRow) return res.status(404).json({ error: 'Account not found.' });

    const canonicalRoles = normalizeRoleList(userRow.roles || userRow.role);
    if (!canonicalRoles.includes(targetRole)) {
      return res.status(403).json({
        error: `You do not hold the '${targetRole}' role. Available roles: ${canonicalRoles.join(', ')}`,
      });
    }

    await userRow.update({ active_role: targetRole });
    const token = signSessionToken(userRow, targetRole);
    setSessionCookie(res, token);

    const payload = await buildClientUserPayload(userRow, targetRole);
    return res.json({ token, user: payload, account: payload });
  } catch (err) {
    return next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const currentPassword = String(req.body?.currentPassword || req.body?.current_password || '');
    const newPassword = String(req.body?.newPassword || req.body?.new_password || '');

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }

    const user = await db.User.scope('withHash').findByPk(req.user.user_id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (currentPassword) {
      const ok = await bcrypt.compare(currentPassword, user.password_hash);
      if (!ok) return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await user.update({
      password_hash: hash,
      must_change_password: false,
      password_changed_at: new Date(),
    });

    const token = signSessionToken(user, req.user.activeRole);
    setSessionCookie(res, token);

    return res.json({ ok: true, token, message: 'Password updated successfully.' });
  } catch (err) {
    return next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const user = await db.User.findOne({ where: { email } });
    if (user) {
      const rawToken = crypto.randomBytes(24).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await db.PasswordReset.create({
        user_id: user.user_id,
        token_hash: tokenHash,
        expires_at: expiresAt,
        requested_ip: req.ip || null,
      });
      await user.update({ reset_token_hash: tokenHash, reset_expires_at: expiresAt });
    }
    return res.json({ ok: true, message: 'If an account exists for that email, a password reset link has been prepared.' });
  } catch (err) {
    return next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const rawToken = String(req.body?.token || '').trim();
    const newPassword = String(req.body?.password || req.body?.newPassword || '');
    if (!rawToken || newPassword.length < 8) {
      return res.status(400).json({ error: 'Valid reset token and password (min 8 chars) are required.' });
    }
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const resetRow = await db.PasswordReset.findOne({
      where: { token_hash: tokenHash, used_at: null, expires_at: { [Op.gt]: new Date() } },
    });
    if (!resetRow) return res.status(400).json({ error: 'Reset token is invalid or expired.' });

    const user = await db.User.scope('withHash').findByPk(resetRow.user_id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const hash = await bcrypt.hash(newPassword, 10);
    await user.update({
      password_hash: hash,
      must_change_password: false,
      password_changed_at: new Date(),
      reset_token_hash: null,
      reset_expires_at: null,
    });
    await resetRow.update({ used_at: new Date() });

    return res.json({ ok: true, message: 'Password has been reset.' });
  } catch (err) {
    return next(err);
  }
};

exports.getInvitation = async (req, res, next) => {
  try {
    const rawToken = String(req.query?.token || '').trim();
    if (!rawToken) return res.status(400).json({ error: 'Invitation token is required.' });
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const invite = await db.AccountInvitation.findOne({ where: { token_hash: tokenHash } });
    if (!invite || invite.accepted_at) {
      return res.status(404).json({ error: 'Invitation not found or already accepted.' });
    }
    return res.json({ invitation: invite });
  } catch (err) {
    return next(err);
  }
};

exports.acceptInvitation = async (req, res, next) => {
  try {
    const rawToken = String(req.body?.token || '').trim();
    const password = String(req.body?.password || '');
    if (!rawToken || password.length < 8) {
      return res.status(400).json({ error: 'Valid token and password (min 8 chars) are required.' });
    }
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const invite = await db.AccountInvitation.findOne({ where: { token_hash: tokenHash, accepted_at: null } });
    if (!invite) return res.status(404).json({ error: 'Invitation invalid or already used.' });

    let user = invite.user_id ? await db.User.scope('withHash').findByPk(invite.user_id) : null;
    const hash = await bcrypt.hash(password, 10);
    if (user) {
      await user.update({ password_hash: hash, is_active: true, status: 'Active', must_change_password: false, password_changed_at: new Date() });
    } else {
      user = await db.User.create({
        name: invite.display_name || invite.email.split('@')[0],
        email: invite.email,
        password_hash: hash,
        role: 'Instructor',
        roles: ['Instructor'],
        active_role: 'Instructor',
        status: 'Active',
        is_active: true,
      });
    }
    await invite.update({ accepted_at: new Date(), status: 'accepted', user_id: user.user_id });

    const token = signSessionToken(user, user.active_role);
    setSessionCookie(res, token);
    const payload = await buildClientUserPayload(user, user.active_role);
    return res.json({ ok: true, token, user: payload });
  } catch (err) {
    return next(err);
  }
};

exports.resetDatabase = async (req, res, next) => {
  try {
    const { wipeAndReseedLiveDatabase } = require('../../services/resetDatabaseService');
    const actor = req.user ? {
      user_id: req.user.user_id,
      name: req.user.name,
      role: req.user.activeRole,
    } : null;

    const result = await wipeAndReseedLiveDatabase();

    if (db.AuditLog) {
      await db.AuditLog.create({
        actor_user_id: actor?.user_id || null,
        actor_name: actor?.name || 'System',
        actor_role: actor?.role || 'User',
        action: 'POST /api/auth/reset-database',
        entity_type: 'database',
        entity_id: result.database,
        outcome: 'success',
        details: `Wiped ${result.droppedCount} table(s) and reseeded initial integrated-lpms data.`,
        ip_address: req.ip || null,
      }).catch(() => {});
    }

    clearSessionCookie(res);
    return res.json({
      ok: true,
      message: 'Database wiped and reseeded with initial data.',
      droppedCount: result.droppedCount,
    });
  } catch (err) {
    if (err?.status === 409) {
      return res.status(409).json({ error: err.message });
    }
    return next(err);
  }
};
