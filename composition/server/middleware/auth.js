'use strict';

const crypto = require('crypto');

const COOKIE_NAME = 'lpms_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
// Sessions are kept in the Sessions table (utils/sessionStore.js): a restart no longer signs everyone
// out. Only the token's hash, the user id, the role and the times are stored.
const store = require('../utils/sessionStore');

// A new random token every time, fixed 8-hour life from now (not extended by use).
const issueSession = (user, now = Date.now()) => {
    const userId = user?.user_id ?? user?.id;
    if (userId == null) throw new Error('Cannot issue a session without a user id.');
    const token = crypto.randomBytes(32).toString('base64url');
    store.create({ token, userId, role: user.role, now, expiresAt: now + SESSION_TTL_MS });
    return token;
};

const revokeSession = (token) => store.remove(token);

const revokeUserSessions = (userId) => store.removeForUser(userId);

// Revoke every session of a user except the one making the request (used by change-password).
const revokeOtherUserSessions = (userId, keepToken) => store.removeForUser(userId, keepToken || null);

// While a temporary password is still in force, only these may be called.
const FORCED_CHANGE_ALLOWED = /^\/api\/auth\/(change-password|session|logout)(\?|$)/;

const cookieValue = (header = '', name = COOKIE_NAME) => {
    for (const part of String(header).split(';')) {
        const separator = part.indexOf('=');
        if (separator < 0) continue;
        if (part.slice(0, separator).trim() === name) {
            try {
                return decodeURIComponent(part.slice(separator + 1).trim());
            } catch {
                return '';
            }
        }
    }
    return '';
};

const defaultFindUserById = async userId => {
    const { User } = require('../models');
    return User.findByPk(userId, {
        attributes: ['user_id', 'name', 'email', 'role', 'is_active', 'must_change_password', 'temp_password_expires_at']
    });
};

const createRequireAuth = ({ findUserById = defaultFindUserById } = {}) => async (req, res, next) => {
    const token = cookieValue(req.headers.cookie);
    const session = token ? store.find(token) : null;

    if (!session || session.expiresAt <= Date.now()) {
        if (token) store.remove(token);
        return res.status(401).json({ error: 'Authentication required.' });
    }

    try {
        // Re-read the security-sensitive account state on every request. A
        // deactivated account or a changed role must take effect immediately,
        // not when this in-memory session happens to expire eight hours later.
        const user = await findUserById(session.userId);
        if (!user || user.is_active === false) {
            store.remove(token);
            return res.status(401).json({ error: 'Authentication required.' });
        }
        // The role was recorded when the session was issued. If the account has a different role now
        // (changed behind the session's back), the session is void: sign in again.
        if (user.role !== undefined && session.role && user.role !== session.role) {
            store.remove(token);
            return res.status(401).json({ error: 'Authentication required.' });
        }

        const mustChangePassword = Boolean(user.must_change_password);
        if (mustChangePassword && user.temp_password_expires_at && new Date(user.temp_password_expires_at) <= new Date()) {
            store.remove(token);
            return res.status(401).json({ error: 'Authentication required.' });
        }

        req.user = {
            id: user.user_id ?? user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            mustChangePassword
        };
        if (mustChangePassword && !FORCED_CHANGE_ALLOWED.test(req.originalUrl || req.url || '')) {
            return res.status(403).json({ error: 'You must change your temporary password first.', code: 'PASSWORD_CHANGE_REQUIRED' });
        }
        req.sessionToken = token;
        return next();
    } catch (error) {
        return next(error);
    }
};

const requireAuth = createRequireAuth();

const requirePermission = (permission) => (req, res, next) => {
    const { hasPermission } = require('../config/permissions');
    if (!req.user || !hasPermission(req.user.role, permission)) {
        return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    return next();
};

// The superuser administers accounts, reads the audit trail and has their own profile; they have no business in
// learning-plan data, so every other business API is closed to them (/api/auth is mounted
// before this and is unaffected).
const SUPERUSER_PATHS = /^\/(users|audit-logs|profile)(\/|$)/;
const restrictSuperuser = (req, res, next) => {
    if (req.user?.role === 'superuser' && !SUPERUSER_PATHS.test(req.path)) {
        return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    return next();
};

const requireRole = (...allowedRoles) => (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    return next();
};

module.exports = {
    COOKIE_NAME,
    SESSION_TTL_MS,
    issueSession,
    cookieValue,
    revokeSession,
    revokeUserSessions,
    revokeOtherUserSessions,
    createRequireAuth,
    requireAuth,
    requireRole,
    requirePermission,
    restrictSuperuser
};
