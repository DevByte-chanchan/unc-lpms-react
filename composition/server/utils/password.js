'use strict';

// Password hashing for LPMS accounts.
//
// WHY NOT bcrypt
// The obvious choice is bcrypt, but the npm `bcrypt` package is a native
// addon: on Windows it wants node-gyp and Visual Studio build tools, and a
// failed install a few days before a defence is a bad trade. `scrypt` is in
// Node's own crypto module — no dependency, no build step, and it is a proper
// password-hashing function (memory-hard, designed for exactly this), not a
// general digest like SHA-256.
//
// This replaces the client-side djb2 "digest" in client/src/utils/session.js,
// which was never a password hash — it was a 32-bit checksum with no salt,
// reversible by brute force in milliseconds. It existed because there was no
// server-side user table to hash against. Now there is.
//
// STORED FORMAT
//   scrypt$N$r$p$<salt-hex>$<hash-hex>
// The parameters travel with the hash, so raising the cost later does not
// invalidate existing passwords — verify reads whatever the row was written
// with, and `needsRehash` tells the caller when to upgrade one on next login.

const crypto = require('crypto');

// N=16384 (2^14) is the usual interactive-login setting: roughly 100ms and
// 16MB per hash on a normal machine. High enough to make offline cracking
// expensive, low enough that a login does not feel slow.
const PARAMS = { N: 16384, r: 8, p: 1, keylen: 64, saltBytes: 16 };

const scrypt = (password, salt, { N, r, p, keylen }) =>
    new Promise((resolve, reject) => {
        // maxmem must be raised above the default or scrypt refuses N=16384.
        crypto.scrypt(password, salt, keylen, { N, r, p, maxmem: 256 * 1024 * 1024 },
            (err, key) => (err ? reject(err) : resolve(key)));
    });

async function hashPassword(password, params = PARAMS) {
    const salt = crypto.randomBytes(params.saltBytes);
    const key = await scrypt(String(password), salt, params);
    return `scrypt$${params.N}$${params.r}$${params.p}$${salt.toString('hex')}$${key.toString('hex')}`;
}

async function verifyPassword(password, stored) {
    if (typeof stored !== 'string') return false;
    const parts = stored.split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

    const [, N, r, p, saltHex, hashHex] = parts;

    // Buffer.from(x, 'hex') does NOT throw on invalid input — it stops at the
    // first bad character and can return an EMPTY buffer. Without this check,
    // a stored value of "scrypt$16384$8$1$zz$zz" decodes to two empty buffers,
    // scrypt is asked for a 0-length key, and timingSafeEqual(<>, <>) is true:
    // that row would verify against ANY password. Validate the hex first.
    const isHex = (s) => typeof s === 'string' && s.length > 0 && s.length % 2 === 0 && /^[0-9a-f]+$/i.test(s);
    if (!isHex(saltHex) || !isHex(hashHex)) return false;
    if (!Number.isInteger(Number(N)) || Number(N) < 2) return false;

    let expected;
    try {
        expected = Buffer.from(hashHex, 'hex');
        if (expected.length === 0) return false;
        const key = await scrypt(String(password), Buffer.from(saltHex, 'hex'), {
            N: Number(N), r: Number(r), p: Number(p), keylen: expected.length
        });
        // Constant time: a plain === leaks how much of the hash matched via
        // timing, which is enough to reconstruct it byte by byte.
        return key.length === expected.length && crypto.timingSafeEqual(key, expected);
    } catch {
        return false;
    }
}

// True when a stored hash was written with weaker parameters than we use now,
// so the caller can transparently upgrade it during a successful login.
function needsRehash(stored, params = PARAMS) {
    if (typeof stored !== 'string') return true;
    const parts = stored.split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') return true;
    return Number(parts[1]) < params.N;
}

module.exports = { hashPassword, verifyPassword, needsRehash, PARAMS };
