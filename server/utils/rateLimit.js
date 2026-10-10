/**
 * A small fixed-window rate limiter for the public auth endpoints (invitation
 * lookup, accept, forgot, reset). In memory, per client IP and per limiter, so
 * it resets on restart — enough to blunt guessing and email flooding from one
 * client. Login itself is guarded by the per-account lockout instead.
 */
const TOO_MANY = { message: 'Too many attempts. Wait a few minutes and try again.' };

export function rateLimit({ windowMs, max }) {
  const hits = new Map(); // ip → { count, resetAt }

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';
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
      return res.status(429).json(TOO_MANY);
    }
    return next();
  };
}
