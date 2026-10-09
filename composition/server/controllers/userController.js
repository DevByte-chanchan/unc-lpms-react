'use strict';

// User management for the superuser: list, create, change role, activate / deactivate.
// Passwords are never returned except the one-time generated password at creation.
//
// Safety rules (all enforced here, not in the UI):
//   * the last active superuser can be neither deactivated nor demoted
//   * nobody can deactivate or change the role of their own account
//   * deactivating or changing a role revokes that user's sessions
// Every change is written to the audit trail with the target id and old / new values only.

const { Op } = require('sequelize');
const { User } = require('../models');
const { hashPassword } = require('../utils/password');
const { generatePassword } = require('../utils/generatedPassword');
const { revokeUserSessions } = require('../middleware/auth');
const { record: audit } = require('../utils/audit');
const { mailer, credentialsEmail } = require('../utils/mailer');

const TEMP_PASSWORD_TTL_MS = 72 * 60 * 60 * 1000;

const ROLE_KEYS = User.ROLE_KEYS;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const publicUser = (user) => ({
    id: user.user_id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.is_active,
    mustChangePassword: Boolean(user.must_change_password),
    lastLoginAt: user.last_login_at,
    createdAt: user.createdAt
});

const auditChange = (req, action, target, details) => audit({
    actor: req.user, action, entityType: 'users', entityId: target.user_id,
    details: { target_user_id: target.user_id, ...details }, ip: req.ip
});

const activeSuperuserCountExcluding = (userId) => User.count({
    where: { role: 'superuser', is_active: true, user_id: { [Op.ne]: userId } }
});

// Generates a temporary password. Returns the hashed fields to store plus the plain password,
// which exists only in memory: it is either emailed or shown once, never stored or logged.
const newTemporaryCredential = async () => {
    const password = generatePassword();
    const expiresAt = new Date(Date.now() + TEMP_PASSWORD_TTL_MS);
    return {
        password,
        expiresAt,
        fields: {
            password_hash: await hashPassword(password),
            must_change_password: true,
            temp_password_expires_at: expiresAt,
            password_changed_at: null,
            reset_token_hash: null,
            reset_expires_at: null
        }
    };
};

// Hands the temporary password over: emailed when SMTP is configured, otherwise (or if the
// email fails) returned once so the superuser can pass it on. Audited without the password.
const deliverCredentials = async (req, target, credential) => {
    await auditChange(req, 'TEMP_PASSWORD_ISSUED', target, { expires_at: credential.expiresAt.toISOString() });
    const expiresAt = credential.expiresAt.toISOString();
    if (mailer.configured()) {
        const message = credentialsEmail({ name: target.name, email: target.email, password: credential.password, expiresAt: credential.expiresAt });
        const sent = await mailer.send({ to: target.email, ...message });
        if (sent.ok) {
            await auditChange(req, 'CREDENTIALS_SENT', target, { delivery: 'email' });
            return { delivery: 'emailed', expiresAt };
        }
        await auditChange(req, 'CREDENTIALS_SHOWN', target, { reason: 'email-failed' });
        return { delivery: 'shown', temporaryPassword: credential.password, expiresAt, mailError: 'The email could not be sent.' };
    }
    await auditChange(req, 'CREDENTIALS_SHOWN', target, { reason: 'smtp-not-configured' });
    return { delivery: 'shown', temporaryPassword: credential.password, expiresAt };
};

const loadTarget = async (req, res) => {
    const id = Number(req.params.id);
    const target = Number.isInteger(id) && id > 0 ? await User.findByPk(id) : null;
    if (!target) res.status(404).json({ error: 'User not found.' });
    return target;
};

// A deactivation or demotion must leave at least one other active superuser.
const wouldRemoveLastSuperuser = async (target) =>
    target.role === 'superuser' && target.is_active && (await activeSuperuserCountExcluding(target.user_id)) === 0;

const listUsers = async (req, res, next) => {
    try {
        const { q, role, status } = req.query;
        const where = {};
        if (role) where.role = String(role);
        if (status === 'active') where.is_active = true;
        if (status === 'inactive') where.is_active = false;
        if (q) {
            const term = `%${String(q).replace(/[%_]/g, '')}%`;
            where[Op.or] = [{ name: { [Op.like]: term } }, { email: { [Op.like]: term } }];
        }
        const users = await User.findAll({ where, order: [['name', 'ASC']] });
        return res.json({ users: users.map(publicUser), roles: ROLE_KEYS });
    } catch (err) {
        return next(err);
    }
};

const createUser = async (req, res, next) => {
    try {
        const name = String(req.body?.name || '').trim();
        const email = String(req.body?.email || '').trim().toLowerCase();
        const role = String(req.body?.role || '').trim();
        if (!name || name.length > 120) return res.status(400).json({ error: 'Full name is required (up to 120 characters).' });
        if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
        if (!ROLE_KEYS.includes(role)) return res.status(400).json({ error: 'Select a valid role.' });
        if (await User.findOne({ where: { email } })) return res.status(409).json({ error: 'An account with that email already exists.' });

        // The plain password is emailed, or returned once in this response. Only its hash is stored.
        const credential = await newTemporaryCredential();
        const user = await User.create({ name, email, role, ...credential.fields });
        await auditChange(req, 'USER_CREATED', user, { new_role: role });
        const delivery = await deliverCredentials(req, user, credential);
        return res.status(201).json({ user: publicUser(user), ...delivery });
    } catch (err) {
        if (err?.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ error: 'An account with that email already exists.' });
        return next(err);
    }
};

const changeRole = async (req, res, next) => {
    try {
        const target = await loadTarget(req, res);
        if (!target) return undefined;
        const newRole = String(req.body?.role || '').trim();
        if (!ROLE_KEYS.includes(newRole)) return res.status(400).json({ error: 'Select a valid role.' });
        if (target.role === newRole) return res.json({ user: publicUser(target) });
        if (target.user_id === req.user.id) return res.status(409).json({ error: 'You cannot change your own role.' });
        if (newRole !== 'superuser' && await wouldRemoveLastSuperuser(target)) {
            return res.status(409).json({ error: 'The last active superuser cannot be demoted.' });
        }

        const oldRole = target.role;
        target.role = newRole;
        await target.save();
        revokeUserSessions(target.user_id);
        await auditChange(req, 'USER_ROLE_CHANGED', target, { old_role: oldRole, new_role: newRole });
        return res.json({ user: publicUser(target) });
    } catch (err) {
        return next(err);
    }
};

// Superuser issues a fresh temporary password: forces a change at next sign-in and ends the
// user's sessions. Not for your own account (use change password).
const resetPassword = async (req, res, next) => {
    try {
        const target = await loadTarget(req, res);
        if (!target) return undefined;
        if (target.user_id === req.user.id) return res.status(409).json({ error: 'Use Change password for your own account.' });
        if (!target.is_active) return res.status(409).json({ error: 'Activate the account before resetting its password.' });

        const credential = await newTemporaryCredential();
        await target.update(credential.fields);
        revokeUserSessions(target.user_id);
        const delivery = await deliverCredentials(req, target, credential);
        return res.json({ user: publicUser(target), ...delivery });
    } catch (err) {
        return next(err);
    }
};

const setActive = (active) => async (req, res, next) => {
    try {
        const target = await loadTarget(req, res);
        if (!target) return undefined;
        if (target.is_active === active) return res.json({ user: publicUser(target) });
        if (!active) {
            if (target.user_id === req.user.id) return res.status(409).json({ error: 'You cannot deactivate your own account.' });
            if (await wouldRemoveLastSuperuser(target)) {
                return res.status(409).json({ error: 'The last active superuser cannot be deactivated.' });
            }
        }

        target.is_active = active;
        await target.save();
        if (!active) revokeUserSessions(target.user_id);
        await auditChange(req, active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', target, { old_active: !active, new_active: active });
        return res.json({ user: publicUser(target) });
    } catch (err) {
        return next(err);
    }
};

module.exports = { listUsers, createUser, changeRole, resetPassword, activateUser: setActive(true), deactivateUser: setActive(false) };
