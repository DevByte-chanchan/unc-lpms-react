'use strict';

// Password-reset tokens, as pure functions.
//
// This is here rather than inline in authController for the same reason
// utils/password.js is: the controller needs a database and an HTTP request to
// run, so nothing inside it can be tested directly, and this is the part that
// must not be wrong. Everything below is a plain function over plain values —
// see resetToken.test.js, which mutation-checks each guard.
//
// The shape of the scheme:
//   * a 256-bit random token is generated and handed to the user;
//   * only its SHA-256 is stored, so a copy of the Users table cannot be used
//     to reset anybody's password;
//   * it expires, and it is single-use (the controller nulls it on success);
//   * comparison is constant-time, because a plain === leaks, through timing,
//     how many leading characters of a guess were right.

const crypto = require('crypto');

const TTL_MS = 30 * 60 * 1000;   // 30 minutes

// 32 bytes = 64 hex characters. Not Math.random(): that is seeded from
// predictable state and is not meant for anything security-carrying.
const createToken = () => crypto.randomBytes(32).toString('hex');

const hashToken = (raw) => crypto.createHash('sha256').update(String(raw)).digest('hex');

const expiryFrom = (now = Date.now()) => new Date(now + TTL_MS);

// Buffer.from(s, 'hex') stops at the first character that is not hex and can
// return an EMPTY buffer — and timingSafeEqual(<empty>, <empty>) is `true`.
// That exact trap is what made a corrupted password hash verify against any
// password before it was caught, so the guard is repeated here.
const isHex = (value) =>
    typeof value === 'string' && value.length > 0 && value.length % 2 === 0 && /^[0-9a-f]+$/i.test(value);

const tokenMatches = (rawToken, storedHash) => {
    if (typeof rawToken !== 'string' || rawToken.length === 0) return false;
    if (!isHex(storedHash)) return false;

    const provided = Buffer.from(hashToken(rawToken), 'hex');
    const expected = Buffer.from(storedHash, 'hex');
    if (expected.length === 0 || provided.length !== expected.length) return false;

    return crypto.timingSafeEqual(provided, expected);
};

// No expiry stored counts as expired: a row with a token but no deadline would
// otherwise be a reset link that never dies.
const isExpired = (expiresAt, now = Date.now()) => {
    if (!expiresAt) return true;
    const at = new Date(expiresAt).getTime();
    if (!Number.isFinite(at)) return true;
    return at < now;
};

// The single question the controller actually asks. Taking the whole record
// means the order of the checks lives here, tested, instead of being three
// separate `if`s a later edit could reorder or drop.
const verifyReset = (rawToken, record, now = Date.now()) => {
    if (!record) return false;
    if (!record.reset_token_hash || !record.reset_expires_at) return false;
    if (isExpired(record.reset_expires_at, now)) return false;
    return tokenMatches(rawToken, record.reset_token_hash);
};

module.exports = { TTL_MS, createToken, hashToken, expiryFrom, isHex, tokenMatches, isExpired, verifyReset };
