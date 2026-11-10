'use strict';

// The session cookie of feature/course-assignment: an httpOnly signed token (JWT) { sub, roles, pv }, 8 hours.
//
// The token is never readable by page script and is not stored on the server. requireAuth re-loads the account
// on every request, so a disabled account, a changed role list or a changed password takes effect on the next
// call: `roles` must still match the account, and `pv` (the time of the last password change) must still be the
// account's, so a password change or reset signs out every other browser.
//
// JWT_SECRET signs the tokens. In production it is required (the server refuses to start without it); in
// development a fixed secret is used with a warning.

const jwt = require('jsonwebtoken');

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const DEV_SECRET = 'lpms-dev-only-secret-do-not-use-in-production';
let warned = false;

const isProduction = () => process.env.NODE_ENV === 'production';

const assertAuthConfig = () => {
    if (process.env.JWT_SECRET) return;
    if (isProduction()) throw new Error('JWT_SECRET is not set. Refusing to start in production without it.');
    if (!warned && process.env.NODE_ENV !== 'test') {
        warned = true;
        console.warn('[auth] JWT_SECRET is not set: using a fixed DEVELOPMENT secret. Never do this in production.');
    }
};

const secret = () => {
    if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
    assertAuthConfig();
    return DEV_SECRET;
};

const passwordVersion = (user) => {
    const at = user?.password_changed_at ? new Date(user.password_changed_at).getTime() : 0;
    return Number.isFinite(at) ? at : 0;
};

// Every role the account holds; an account saved before multi-role accounts holds its one role.
const rolesOf = (user) => (Array.isArray(user?.roles) && user.roles.length ? user.roles : [user?.role].filter(Boolean));
const rolesKey = (roles) => JSON.stringify([...(roles || [])].sort());

const signSession = (user) => jwt.sign(
    { sub: user.user_id ?? user.id, roles: rolesOf(user), pv: passwordVersion(user) },
    secret(),
    { expiresIn: Math.floor(SESSION_TTL_MS / 1000) }
);

// The verified payload, or null for a missing, expired or forged token.
const readSession = (token) => {
    if (!token) return null;
    try {
        return jwt.verify(token, secret());
    } catch {
        return null;
    }
};

// The token still describes the account as it is now.
const sessionMatchesUser = (payload, user) => Boolean(payload && user)
    && rolesKey(payload.roles) === rolesKey(rolesOf(user))
    && Number(payload.pv || 0) === passwordVersion(user);

module.exports = { SESSION_TTL_MS, rolesOf, assertAuthConfig, signSession, readSession, sessionMatchesUser, passwordVersion };
