/**
 * Account management — VPAA only (routes/index.js).
 *
 *   GET   /api/user-accounts
 *   POST  /api/user-accounts                     { email, display_name, roles }
 *   PATCH /api/user-accounts/:id                 { display_name?, roles?, status?, email? }
 *   POST  /api/user-accounts/:id/reset-password
 *   POST  /api/user-accounts/from-faculty        { period_id }
 *   POST  /api/user-accounts/:id/send-invitation       email a set-password link now
 *   POST  /api/user-accounts/:id/send-password-reset   email a reset link now
 *   GET   /api/user-accounts/held-invitations          held invitations with no account
 *
 * Create and reset-password still hand back a generated temporary password,
 * returned ONCE for the admin to hand over (never stored in the clear). The
 * emailed alternatives are send-invitation and send-password-reset.
 */
import crypto from 'node:crypto';
import db from '../models/index.js';
import { hashPassword } from './authController.js';
import {
  createInvitation, sendInvitation, invitationSummaries, heldWithoutAccount,
} from '../services/invitations.js';
import { sendPasswordReset } from '../services/passwordResets.js';
import {
  ROLES, validRoles, sortRoles, isAllowedEmail, normalizeEmail, domainMessage,
} from '../utils/roles.js';

const { UserAccount, Faculty, AccountInvitation } = db;

// No look-alikes (0/O, 1/l/I), so a password read aloud or off a screen survives.
const TEMP_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
export function generateTempPassword(length = 12) {
  let out = '';
  for (let i = 0; i < length; i += 1) out += TEMP_ALPHABET[crypto.randomInt(TEMP_ALPHABET.length)];
  return out;
}

const STATUSES = ['Active', 'Disabled'];
const rolesMessage = () => 'Roles must be one or more of: ' + ROLES.join(', ') + '.';

/** Faculty role (free text on the sheet) → account roles. */
export function rolesForFacultyRole(facultyRole) {
  const r = String(facultyRole || '').trim().toLowerCase();
  if (r === 'dean') return ['Dean'];
  if (r === 'program head') return ['Program Head', 'Instructor'];
  return ['Instructor'];
}

const cleanName = (s) => String(s || '').trim().replace(/\s+/g, ' ');

/** Every account, each with `invitation`: its latest invitation's status, or null (never invited). */
export async function listAccounts(_req, res, next) {
  try {
    const rows = await UserAccount.findAll({ order: [['display_name', 'ASC']] });
    const invitations = await invitationSummaries(rows.map((r) => r.id));
    return res.json(rows.map((r) => ({ ...r.toJSON(), invitation: invitations[r.id] || null })));
  } catch (err) {
    return next(err);
  }
}

export async function listHeldInvitations(_req, res, next) {
  try {
    return res.json(await heldWithoutAccount());
  } catch (err) {
    return next(err);
  }
}

const mailOutcome = (result) => {
  if (result.status === 'sent' || result.status === 'captured') return null;
  if (result.status === 'skipped') return 'Not sent: ' + (result.reason || 'skipped by the mailer') + '.';
  return 'The email could not be sent: ' + (result.reason || 'unknown error');
};

/**
 * Send (or resend) a set-password invitation now, signed by the VPAA who
 * clicked. Supersedes the account's earlier unaccepted invitations, so old
 * links stop working. Refused once the person has set their own password
 * from an invitation — that's what "Send password reset" is for.
 */
export async function sendInvitationNow(req, res, next) {
  try {
    const account = await UserAccount.findByPk(req.params.id);
    if (!account) return res.status(404).json({ message: 'That account no longer exists.' });
    if (account.status !== 'Active') return res.status(400).json({ message: 'This account is disabled. Enable it before inviting.' });

    const accepted = await AccountInvitation.count({ where: { user_account_id: account.id, status: 'accepted' } });
    if (!account.must_change_password && accepted) {
      return res.status(409).json({ message: account.display_name + ' has already set a password. Use "Send password reset" instead.' });
    }

    const invitation = await createInvitation(account, {
      source: 'manual', emailSource: 'manual', senderId: req.user.id, supersede: true, immediate: true,
    });
    const result = await sendInvitation(invitation);
    const [summary] = Object.values(await invitationSummaries([account.id]));
    const problem = mailOutcome(result);
    return res.status(problem ? 502 : 200).json({
      ...(problem ? { message: problem } : { message: 'Invitation sent to ' + account.email + '.' }),
      invitation: summary || null,
    });
  } catch (err) {
    return next(err);
  }
}

export async function sendPasswordResetNow(req, res, next) {
  try {
    const account = await UserAccount.findByPk(req.params.id);
    if (!account) return res.status(404).json({ message: 'That account no longer exists.' });
    if (account.status !== 'Active') return res.status(400).json({ message: 'This account is disabled. Enable it first.' });

    const result = await sendPasswordReset(account, { ip: req.ip });
    if (result.status === 'limited') return res.status(429).json({ message: result.reason });
    const problem = mailOutcome(result);
    return res.status(problem ? 502 : 200).json({ message: problem || 'Password reset link sent to ' + account.email + '.' });
  } catch (err) {
    return next(err);
  }
}

export async function createAccount(req, res, next) {
  try {
    const body = req.body || {};
    const email = normalizeEmail(body.email);
    const display_name = cleanName(body.display_name);
    if (!isAllowedEmail(email)) return res.status(400).json({ message: domainMessage(), field: 'email' });
    if (!display_name) return res.status(400).json({ message: 'A name is required.', field: 'display_name' });
    if (display_name.length > 100) return res.status(400).json({ message: 'The name is too long (100 characters at most).', field: 'display_name' });
    if (!validRoles(body.roles)) return res.status(400).json({ message: rolesMessage(), field: 'roles' });

    if (await UserAccount.findOne({ where: { email } })) {
      return res.status(409).json({ message: 'An account with that email already exists.', field: 'email' });
    }

    const temp_password = generateTempPassword();
    const account = await UserAccount.create({
      email,
      display_name,
      roles: sortRoles(body.roles),
      password_hash: await hashPassword(temp_password),
      must_change_password: true,
      status: 'Active',
    });
    return res.status(201).json({ account, temp_password });
  } catch (err) {
    return next(err);
  }
}

export async function updateAccount(req, res, next) {
  try {
    const account = await UserAccount.findByPk(req.params.id);
    if (!account) return res.status(404).json({ message: 'That account no longer exists.' });
    const body = req.body || {};
    const self = account.id === req.user.id;
    const patch = {};

    if (body.email !== undefined) {
      const email = normalizeEmail(body.email);
      if (!isAllowedEmail(email)) return res.status(400).json({ message: domainMessage(), field: 'email' });
      if (email !== account.email && await UserAccount.findOne({ where: { email } })) {
        return res.status(409).json({ message: 'An account with that email already exists.', field: 'email' });
      }
      patch.email = email;
    }
    if (body.display_name !== undefined) {
      const name = cleanName(body.display_name);
      if (!name || name.length > 100) return res.status(400).json({ message: 'A name is required (100 characters at most).', field: 'display_name' });
      patch.display_name = name;
    }
    if (body.roles !== undefined) {
      if (!validRoles(body.roles)) return res.status(400).json({ message: rolesMessage(), field: 'roles' });
      if (self && !body.roles.includes('VPAA')) {
        return res.status(400).json({ message: "You can't remove your own VPAA role.", field: 'roles' });
      }
      patch.roles = sortRoles(body.roles);
    }
    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status)) return res.status(400).json({ message: 'Status must be Active or Disabled.', field: 'status' });
      if (self && body.status !== 'Active') return res.status(400).json({ message: "You can't disable your own account.", field: 'status' });
      patch.status = body.status;
    }

    await account.update(patch);
    return res.json(account);
  } catch (err) {
    return next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const account = await UserAccount.findByPk(req.params.id);
    if (!account) return res.status(404).json({ message: 'That account no longer exists.' });
    const temp_password = generateTempPassword();
    await account.update({
      password_hash: await hashPassword(temp_password),
      must_change_password: true,
      failed_attempts: 0,
      locked_until: null,
    });
    return res.json({ account, temp_password });
  } catch (err) {
    return next(err);
  }
}

/**
 * One account per Active faculty member of the period who has a usable email
 * and no account yet. Everyone skipped is reported with the reason, so the
 * admin can fix the faculty record and run it again.
 */
export async function createFromFaculty(req, res, next) {
  try {
    const periodId = Number(req.body && req.body.period_id);
    if (!periodId) return res.status(400).json({ message: 'period_id is required.' });

    const faculty = await Faculty.findAll({
      where: { period_id: periodId, status: 'Active' },
      attributes: ['id', 'name', 'role', 'email'],
      order: [['name', 'ASC']],
    });
    const existing = new Set((await UserAccount.findAll({ attributes: ['email'] })).map((a) => a.email));

    const created = [];
    const skipped = [];
    for (const f of faculty) {
      const display_name = cleanName(f.name).slice(0, 100);
      const email = normalizeEmail(f.email);
      if (!email) { skipped.push({ name: display_name, email: null, reason: 'No email on the faculty record.' }); continue; }
      if (!isAllowedEmail(email)) { skipped.push({ name: display_name, email, reason: 'The email is not a UNC address (' + domainMessage() + ')' }); continue; }
      if (existing.has(email)) { skipped.push({ name: display_name, email, reason: 'Already has an account.' }); continue; }

      const temp_password = generateTempPassword();
      const roles = rolesForFacultyRole(f.role);
      await UserAccount.create({
        email, display_name, roles,
        password_hash: await hashPassword(temp_password),
        must_change_password: true,
        status: 'Active',
      });
      existing.add(email);
      created.push({ email, display_name, roles, temp_password });
    }
    return res.status(created.length ? 201 : 200).json({ created, skipped });
  } catch (err) {
    return next(err);
  }
}
