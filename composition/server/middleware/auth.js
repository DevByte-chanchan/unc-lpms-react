'use strict';

const COOKIE_NAME = 'lpms_session';
// The session is a signed token in an httpOnly cookie (utils/jwtSession.js, the account rules of
// feature/course-assignment): nothing is stored on the server. Signing out clears the cookie; a password change
// or reset, a role change or a disabled account voids every token at the next request (requireAuth).
const { SESSION_TTL_MS, signSession, readSession, sessionMatchesUser, rolesOf } = require('../utils/jwtSession');

const issueSession = (user) => {
    const userId = user?.user_id ?? user?.id;
    if (userId == null) throw new Error('Cannot issue a session without a user id.');
    return signSession(user);
};

// Kept for callers written for server-side sessions: with signed tokens there is nothing to delete. Voiding a
// user's other sessions is done by the password-change time the token carries.
const revokeSession = () => {};
const revokeUserSessions = () => {};
const revokeOtherUserSessions = () => {};

// The role a request acts as: one account can hold several (multi-role accounts). The browser names the role it
// is using in this header; it must be one the account holds, otherwise the account's first role is used.
const ROLE_HEADER = 'x-lpms-role';
const actingRole = (req, roles) => {
    const asked = String(req.headers?.[ROLE_HEADER] || '').trim();
    return roles.includes(asked) ? asked : roles[0];
};

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
        attributes: ['user_id', 'name', 'email', 'role', 'roles', 'is_active', 'must_change_password', 'temp_password_expires_at', 'password_changed_at']
    });
};

const createRequireAuth = ({ findUserById = defaultFindUserById } = {}) => async (req, res, next) => {
    const token = cookieValue(req.headers.cookie);
    const session = readSession(token);
    if (!session || session.sub == null) {
        return res.status(401).json({ error: 'Authentication required.' });
    }

    try {
        // Re-read the security-sensitive account state on every request. A
        // deactivated account or a changed role must take effect immediately,
        // not when this in-memory session happens to expire eight hours later.
        const user = await findUserById(session.sub);
        if (!user || user.is_active === false) {
            return res.status(401).json({ error: 'Authentication required.' });
        }
        // The roles and the password-change time were recorded when the token was issued. If either changed
        // behind the session's back (a role change, a password change or reset elsewhere), it is void.
        if (!sessionMatchesUser(session, user)) {
            return res.status(401).json({ error: 'Authentication required.' });
        }

        const mustChangePassword = Boolean(user.must_change_password);
        if (mustChangePassword && user.temp_password_expires_at && new Date(user.temp_password_expires_at) <= new Date()) {
            return res.status(401).json({ error: 'Authentication required.' });
        }

        const roles = rolesOf(user);
        req.user = {
            id: user.user_id ?? user.id,
            name: user.name,
            email: user.email,
            role: actingRole(req, roles),
            roles,
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

// The superuser administers accounts and reads the audit trail; they have no business in
// learning-plan data, so every other business API is closed to them (/api/auth is mounted
// before this and is unaffected).
const SUPERUSER_PATHS = /^\/(users|user-accounts|audit-logs)(\/|$)/;
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
    ROLE_HEADER,
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
