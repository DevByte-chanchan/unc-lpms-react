'use strict';

// A small fixed-window rate limiter for the public account-link endpoints (invitation lookup and accept, reset,
// forgot password, new invitation), from feature/course-assignment. In memory, per client address and per
// limiter, so it resets on restart: enough to blunt guessing and e-mail flooding from one client.
const TOO_MANY = { error: 'Too many attempts. Wait a few minutes and try again.' };

const rateLimit = ({ windowMs, max }) => {
    const hits = new Map(); // address -> { count, resetAt }
    return (req, res, next) => {
        const now = Date.now();
        const key = req.ip || req.socket?.remoteAddress || 'unknown';
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
};

module.exports = { rateLimit };
