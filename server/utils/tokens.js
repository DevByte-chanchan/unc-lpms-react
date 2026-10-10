/**
 * One-time link tokens (invitations, password resets).
 *
 * The token is 32 random bytes, base64url. It only ever exists in the email
 * link; the database keeps its SHA-256 hash, so a database leak can't be
 * turned into working links. Never log a token.
 */
import crypto from 'node:crypto';

export const newToken = () => crypto.randomBytes(32).toString('base64url');

export const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

/** A plausible token (shape only) — keeps junk out of the database lookup. */
export const looksLikeToken = (token) => typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token);

// Accounts that will set their password through a link get an unusable hash:
// the bcrypt of 32 random bytes nobody ever sees.
export const unusablePassword = () => crypto.randomBytes(32).toString('hex');
