/**
 * The session cookie: an httpOnly JWT { sub: accountId, roles }, 8 hours.
 *
 * The token is never readable by page script and never stored client-side.
 * requireAuth re-loads the account on every request, so a disabled account or
 * a role change takes effect on the next call, not when the token expires.
 */
import jwt from 'jsonwebtoken';

export const SESSION_COOKIE = 'lpms_session';
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

const DEV_SECRET = 'lpms-dev-only-secret-do-not-use-in-production';
let warned = false;

const isProduction = () => process.env.NODE_ENV === 'production';

/**
 * Boot check. Production without JWT_SECRET refuses to start; development
 * warns once and falls back to a fixed dev secret.
 */
export function assertAuthConfig() {
  if (process.env.JWT_SECRET) return;
  if (isProduction()) {
    throw new Error('JWT_SECRET is not set. Refusing to start in production without it.');
  }
  if (!warned) {
    warned = true;
    console.warn('[auth] JWT_SECRET is not set — using a fixed DEVELOPMENT secret. Never do this in production.');
  }
}

function secret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  assertAuthConfig();
  return DEV_SECRET;
}

export const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: isProduction(),
  path: '/',
});

/** Sign a token for this account and set it as the session cookie. */
export function issueSession(res, account) {
  const token = jwt.sign({ sub: account.id, roles: account.roles }, secret(), {
    expiresIn: Math.floor(SESSION_TTL_MS / 1000),
  });
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(), maxAge: SESSION_TTL_MS });
}

export function clearSession(res) {
  res.clearCookie(SESSION_COOKIE, cookieOptions());
}

/** The verified payload, or null for a missing, expired or forged token. */
export function readSession(req) {
  const token = req.cookies && req.cookies[SESSION_COOKIE];
  if (!token) return null;
  try {
    return jwt.verify(token, secret());
  } catch (_err) {
    return null;
  }
}
