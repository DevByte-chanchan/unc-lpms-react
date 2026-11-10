'use strict';

const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'lpms_session';
const DEFAULT_TTL_SECONDS = 60 * 60 * 12; // 12 hours

function getSecret() {
    return process.env.JWT_SECRET || 'unc-lpms-dev-secret-change-in-prod';
}

function signSessionToken(payload, ttlSeconds = DEFAULT_TTL_SECONDS) {
    return jwt.sign(payload, getSecret(), { expiresIn: ttlSeconds });
}

function verifySessionToken(token) {
    if (!token) return null;
    try {
        return jwt.verify(token, getSecret());
    } catch {
        return null;
    }
}

function setSessionCookie(res, token, ttlSeconds = DEFAULT_TTL_SECONDS) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProd,
        maxAge: ttlSeconds * 1000,
        path: '/',
    });
}

function clearSessionCookie(res) {
    res.clearCookie(COOKIE_NAME, { path: '/' });
}

module.exports = {
    COOKIE_NAME,
    signSessionToken,
    verifySessionToken,
    setSessionCookie,
    clearSessionCookie,
};
