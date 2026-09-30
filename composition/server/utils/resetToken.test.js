'use strict';

// node utils/resetToken.test.js
//
// Same convention as utils/password.test.js: no framework, no database, one
// file you can run from the server folder. Each check is written so that
// breaking the corresponding guard in resetToken.js makes THIS check fail and
// not some unrelated one — verified by mutation, see the notes on each.

const {
    TTL_MS, createToken, hashToken, expiryFrom, isHex, tokenMatches, isExpired, verifyReset
} = require('./resetToken');

let passed = 0;
const test = (name, fn) => {
    try { fn(); passed++; console.log(`✓ ${name}`); }
    catch (error) { console.error(`✗ ${name}\n  ${error.message}`); process.exitCode = 1; }
};
const assert = (condition, message) => { if (!condition) throw new Error(message); };

test('a token is 256 bits of hex and never repeats', () => {
    const seen = new Set();
    for (let i = 0; i < 200; i++) {
        const token = createToken();
        assert(/^[0-9a-f]{64}$/.test(token), `not 64 hex characters: ${token}`);
        assert(!seen.has(token), 'createToken returned the same token twice');
        seen.add(token);
    }
});

test('the raw token is not recoverable from what is stored', () => {
    const token = createToken();
    const stored = hashToken(token);
    assert(stored !== token, 'the stored value must not be the token itself');
    assert(!stored.includes(token.slice(0, 16)), 'the stored value must not contain the token');
    assert(/^[0-9a-f]{64}$/.test(stored), 'a SHA-256 digest is 64 hex characters');
    // Deterministic, or a valid token would never match its own row.
    assert(hashToken(token) === stored, 'hashing the same token twice must agree');
});

test('the right token matches and a wrong one does not', () => {
    const token = createToken();
    const stored = hashToken(token);
    assert(tokenMatches(token, stored) === true, 'the issued token should match');
    assert(tokenMatches(createToken(), stored) === false, 'a different token must not match');
    // One character off — the near-miss a brute-force actually produces.
    const nearMiss = token.slice(0, 63) + (token[63] === 'a' ? 'b' : 'a');
    assert(tokenMatches(nearMiss, stored) === false, 'a token differing by one character must not match');
});

// THE BUG THIS FILE EXISTS FOR. Buffer.from('zz', 'hex') is an EMPTY buffer,
// and crypto.timingSafeEqual(<empty>, <empty>) returns true. Without the isHex
// and zero-length guards, a row whose reset_token_hash had been truncated or
// blanked would accept ANY token. Delete either guard in resetToken.js and
// this check — and only this one — fails.
test('a corrupted or empty stored hash accepts nothing', () => {
    const rubbish = ['', 'zz', 'not-hex', 'abc', null, undefined, 0, {}, [], 'nn'.repeat(32)];
    for (const stored of rubbish) {
        assert(tokenMatches(createToken(), stored) === false, `accepted a token against stored=${JSON.stringify(stored)}`);
        assert(tokenMatches('', stored) === false, `accepted an empty token against stored=${JSON.stringify(stored)}`);
    }
});

test('an empty or non-string token is refused even against a real hash', () => {
    const stored = hashToken(createToken());
    for (const token of ['', null, undefined, 0, {}, []]) {
        assert(tokenMatches(token, stored) === false, `accepted token=${JSON.stringify(token)}`);
    }
});

test('isHex only accepts full bytes of hex', () => {
    assert(isHex('00') === true, '00 is hex');
    assert(isHex('DEADBEEF') === true, 'upper case is still hex');
    assert(isHex('abc') === false, 'an odd number of characters is not whole bytes');
    assert(isHex('') === false, 'empty is not hex');
    assert(isHex('zz') === false, 'z is not a hex digit');
});

test('a link expires, and one with no deadline is treated as expired', () => {
    const now = 1_000_000_000_000;
    assert(isExpired(new Date(now + 1000), now) === false, 'a future deadline is not expired');
    assert(isExpired(new Date(now - 1), now) === true, 'a past deadline is expired');
    assert(isExpired(null, now) === true, 'no deadline means expired');
    assert(isExpired(undefined, now) === true, 'no deadline means expired');
    assert(isExpired('not a date', now) === true, 'an unparseable deadline means expired');
    // The advertised window is the one the copy on screen promises.
    assert(TTL_MS === 30 * 60 * 1000, 'the TTL should be the 30 minutes the message says');
    assert(expiryFrom(now).getTime() === now + TTL_MS, 'expiryFrom should be now + TTL');
});

test('verifyReset refuses a right token on an expired row', () => {
    const now = 1_000_000_000_000;
    const token = createToken();
    const live = { reset_token_hash: hashToken(token), reset_expires_at: new Date(now + 60_000) };
    assert(verifyReset(token, live, now) === true, 'a live row with the right token should verify');

    const stale = { reset_token_hash: hashToken(token), reset_expires_at: new Date(now - 1) };
    assert(verifyReset(token, stale, now) === false, 'the right token must not work after it expires');

    // Exactly at the deadline is still inside the window; a millisecond later
    // is not. Stated so a later `<=` / `<` edit has to be deliberate.
    const edge = { reset_token_hash: hashToken(token), reset_expires_at: new Date(now) };
    assert(verifyReset(token, edge, now) === true, 'the deadline itself is still valid');
    assert(verifyReset(token, edge, now + 1) === false, 'one millisecond past the deadline is not');
});

test('verifyReset refuses a row with no reset outstanding', () => {
    const now = 1_000_000_000_000;
    const token = createToken();
    assert(verifyReset(token, null, now) === false, 'no account, no reset');
    assert(verifyReset(token, {}, now) === false, 'an account that never asked has no reset');
    assert(verifyReset(token, { reset_token_hash: hashToken(token) }, now) === false, 'a token with no deadline must not verify');
    assert(verifyReset(token, { reset_expires_at: new Date(now + 60_000) }, now) === false, 'a deadline with no token must not verify');
    // Consumed: the controller nulls both fields, so a replayed link is this.
    assert(verifyReset(token, { reset_token_hash: null, reset_expires_at: null }, now) === false, 'a used link must not work twice');
});

console.log(`\n${passed} reset-token checks passed.`);
