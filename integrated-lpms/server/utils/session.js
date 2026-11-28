'use strict';

const jwt = require('jsonwebtoken');
const { normalizeRoleList, pickDefaultActiveRole } = require('./roles');

const COOKIE_NAME = 'lpms_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h
const DEV_SECRET = 'unc-lpms-integrated-dev-secret-change-in-prod';

function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.LPMS_JWT_SECRET) return process.env.LPMS_JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production.');
  }
  return DEV_SECRET;
}

function isSecureCookie(req) {
  const explicit = String(process.env.LPMS_COOKIE_SECURE || '').toLowerCase();
  if (explicit === 'true' || explicit === '1') return true;
  if (explicit === 'false' || explicit === '0') return false;
  if (process.env.NODE_ENV === 'production') return true;
  return Boolean(req && (req.secure || req.headers['x-forwarded-proto'] === 'https'));
}

function getCookieOptions(req) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureCookie(req),
    path: '/',
    maxAge: SESSION_TTL_MS,
  };
}

function signSessionToken(user, preferredActiveRole) {
  const roles = normalizeRoleList(user.roles || user.role);
  const activeRole = pickDefaultActiveRole(roles, preferredActiveRole || user.active_role);
  const pv = user.password_changed_at ? new Date(user.password_changed_at).getTime() : 0;
  return jwt.sign(
    {
      sub: user.user_id ?? user.id,
      email: user.email,
      roles,
      activeRole,
      pv,
    },
    getJwtSecret(),
    { expiresIn: Math.floor(SESSION_TTL_MS / 1000) }
  );
}

function verifySessionToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }
}

function extractToken(req) {
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME];
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  // Fallback manual cookie parse
  const rawCookie = req.headers.cookie || '';
  for (const part of rawCookie.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() === COOKIE_NAME) {
      try {
        return decodeURIComponent(part.slice(idx + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

function setSessionCookie(res, token, req) {
  res.cookie(COOKIE_NAME, token, getCookieOptions(req));
}

function clearSessionCookie(res, req) {
  const opts = getCookieOptions(req);
  delete opts.maxAge;
  res.clearCookie(COOKIE_NAME, opts);
}

module.exports = {
  COOKIE_NAME,
  SESSION_TTL_MS,
  getJwtSecret,
  signSessionToken,
  verifySessionToken,
  extractToken,
  setSessionCookie,
  clearSessionCookie,
};
