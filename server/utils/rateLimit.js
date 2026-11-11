/**
 * A small fixed-window rate limiter for the public auth endpoints (invitation
 * lookup, accept, forgot, reset). In memory, per client IP and per limiter, so
 * it resets on restart — enough to blunt guessing and email flooding from one
 * client. Login itself is guarded by the per-account lockout instead.
 *
 * Options: `key(req)` limits by something other than the IP (the signed-in
 * account, for the school-calendar uploads); `message` replaces the default text.
 */
const TOO_MANY = { message: 'Too many attempts. Wait a few minutes and try again.' };

export function rateLimit({ windowMs, max, key: keyOf, message }) {
  const hits = new Map(); // ip → { count, resetAt }

  return (req, res, next) => {
    const now = Date.now();
    const key = (keyOf && keyOf(req)) || req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (hits.size > 10000) {
      for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    }
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json(message ? { message } : TOO_MANY);
    }
    return next();
  };
}
