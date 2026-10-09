'use strict';

const crypto = require('crypto');

const COOKIE_NAME = 'lpms_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const sessions = new Map();

const tokenDigest = (token) => crypto.createHash('sha256').update(token).digest('hex');

const issueSession = (user, now = Date.now()) => {
    const userId = user?.user_id ?? user?.id;
    if (userId == null) throw new Error('Cannot issue a session without a user id.');
    const token = crypto.randomBytes(32).toString('base64url');
    sessions.set(tokenDigest(token), {
        user: {
            id: userId,
            name: user.name,
            email: user.email,
            role: user.role
        },
        expiresAt: now + SESSION_TTL_MS
    });
    return token;
};

const revokeSession = (token) => {
    if (!token) return false;
    return sessions.delete(tokenDigest(token));
};

const revokeUserSessions = (userId) => {
    const target = String(userId);
    let revoked = 0;
    for (const [key, session] of sessions.entries()) {
        if (String(session.user.id) !== target) continue;
        sessions.delete(key);
        revoked += 1;
    }
    return revoked;
};

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
        attributes: ['user_id', 'name', 'email', 'role', 'is_active']
    });
};

const createRequireAuth = ({ findUserById = defaultFindUserById } = {}) => async (req, res, next) => {
    const token = cookieValue(req.headers.cookie);
    const key = token ? tokenDigest(token) : '';
    const session = key ? sessions.get(key) : null;

    if (!session || session.expiresAt <= Date.now()) {
        if (key) sessions.delete(key);
        return res.status(401).json({ error: 'Authentication required.' });
    }

    try {
        // Re-read the security-sensitive account state on every request. A
        // deactivated account or a changed role must take effect immediately,
        // not when this in-memory session happens to expire eight hours later.
        const user = await findUserById(session.user.id);
        if (!user || user.is_active === false) {
            sessions.delete(key);
            return res.status(401).json({ error: 'Authentication required.' });
        }

        req.user = {
            id: user.user_id ?? user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };
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
    revokeSession,
    revokeUserSessions,
    createRequireAuth,
    requireAuth,
    requireRole,
    requirePermission,
    restrictSuperuser
};
