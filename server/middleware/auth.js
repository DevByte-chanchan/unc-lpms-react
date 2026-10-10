/**
 * requireAuth — a valid session cookie for an Active account, or 401.
 *   Sets req.user to the account (never with its hash).
 * requireRole(...roles) — 403 unless req.user holds one of `roles`.
 *
 * routes/index.js mounts requireAuth on everything except /health and
 * /auth/login; the route files add requireRole to their writes.
 */
import db from '../models/index.js';
import { readSession, clearSession } from '../utils/session.js';
import { hasRole } from '../utils/roles.js';

const UNAUTHENTICATED = { message: 'Please sign in.' };
const FORBIDDEN = { message: "You don't have access to this." };

export async function requireAuth(req, res, next) {
  try {
    const session = readSession(req);
    if (!session || !session.sub) return res.status(401).json(UNAUTHENTICATED);

    const account = await db.UserAccount.findByPk(session.sub);
    if (!account || account.status !== 'Active') {
      clearSession(res);
      return res.status(401).json(UNAUTHENTICATED);
    }
    req.user = account;
    return next();
  } catch (err) {
    return next(err);
  }
}

export const requireRole = (...roles) => (req, res, next) => {
  if (!hasRole(req.user, ...roles)) return res.status(403).json(FORBIDDEN);
  return next();
};

/** The signed-in person's display name, for `uploaded_by`-style columns. */
export const actorName = (req) =>
  (req.user && req.user.display_name ? String(req.user.display_name).slice(0, 100) : null);
