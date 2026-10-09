'use strict';

// Step 5: sessions kept in the Sessions table, rotation on sign-in, security headers, the cookie's
// Secure flag, and the trust-proxy setting. Runs against the test database (node run-tests.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const express = require('express');
const { User, sequelize, Sequelize } = require('../models');
const { hashPassword } = require('./password');
const security = require('./serverSecurity');

const stamp = Date.now();
let n = 0;
const makeUser = async (role = 'instructor') => {
    n += 1;
    const password = 'Sessions-test-1';
    const user = await User.create({ name: `Sess ${n}`, email: `sess${n}.${stamp}@example.test`, role, password_hash: await hashPassword(password) });
    return { user, password };
};
const rows = (sql, replacements = []) => sequelize.query(sql, { replacements, type: Sequelize.QueryTypes.SELECT });
const sha = (token) => crypto.createHash('sha256').update(token).digest('hex');

// A fresh copy of the session modules, as a restarted server would load them.
const reloadSessionModules = () => {
    for (const key of Object.keys(require.cache)) {
        if (/[\\/](middleware[\\/]auth|utils[\\/]sessionStore)\.js$/.test(key)) delete require.cache[key];
    }
    return require('../middleware/auth');
};

const SESSION_TTL = 8 * 60 * 60 * 1000;
const call = (middleware, headers = {}) => new Promise((resolve) => {
    const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(b) { resolve({ status: this.statusCode, body: b }); return this; } };
    const req = { headers, originalUrl: '/api/ping' };
    middleware(req, res, () => resolve({ status: 200, user: req.user }));
});

// ------------------------------------------------------------------ the Sessions table

test('a session row holds only the token hash, user id, role and times; never the token', async () => {
    const { issueSession } = require('../middleware/auth');
    const { user } = await makeUser();
    const token = issueSession(user);
    const columns = (await rows('PRAGMA table_info(Sessions)')).map(c => c.name).sort();
    assert.deepEqual(columns, ['created_at', 'expires_at', 'role', 'token_hash', 'user_id']);
    const [row] = await rows('SELECT * FROM Sessions WHERE token_hash = ?', [sha(token)]);
    assert.ok(row, 'the hash is stored');
    assert.equal(row.user_id, user.user_id);
    assert.equal(row.role, 'instructor');
    assert.ok(!JSON.stringify(await rows('SELECT * FROM Sessions')).includes(token), 'the token itself is stored nowhere');
});

test('the lifetime is 8 hours from sign-in, and an expired session is refused and removed', async () => {
    const { issueSession, createRequireAuth, COOKIE_NAME } = require('../middleware/auth');
    const { user } = await makeUser();
    const token = issueSession(user);
    const [row] = await rows('SELECT created_at, expires_at FROM Sessions WHERE token_hash = ?', [sha(token)]);
    assert.equal(Number(row.expires_at) - Number(row.created_at), SESSION_TTL);

    const old = issueSession(user, Date.now() - SESSION_TTL - 1000);
    const check = createRequireAuth({ findUserById: async () => user });
    const result = await call(check, { cookie: `${COOKIE_NAME}=${old}` });
    assert.equal(result.status, 401);
    assert.equal((await rows('SELECT 1 FROM Sessions WHERE token_hash = ?', [sha(old)])).length, 0);
});

test('a session survives a server restart', async () => {
    const before = require('../middleware/auth');
    const { user } = await makeUser();
    const token = before.issueSession(user);

    const after = reloadSessionModules(); // what a restarted process would load
    assert.notEqual(after, before, 'the modules were reloaded');
    const check = after.createRequireAuth({ findUserById: async () => user });
    const result = await call(check, { cookie: `${after.COOKIE_NAME}=${token}` });
    assert.equal(result.status, 200);
    assert.equal(result.user.id, user.user_id);
});

test('a session whose recorded role no longer matches the account is void', async () => {
    const { issueSession, createRequireAuth, COOKIE_NAME } = require('../middleware/auth');
    const { user } = await makeUser('instructor');
    const token = issueSession(user);
    const promoted = { user_id: user.user_id, name: user.name, email: user.email, role: 'dean', is_active: true };
    const result = await call(createRequireAuth({ findUserById: async () => promoted }), { cookie: `${COOKIE_NAME}=${token}` });
    assert.equal(result.status, 401);
    assert.equal((await rows('SELECT 1 FROM Sessions WHERE token_hash = ?', [sha(token)])).length, 0);
});

test('issuing a session clears expired rows, and the revoke helpers act on the table', async () => {
    const { issueSession, revokeUserSessions, revokeOtherUserSessions, revokeSession } = require('../middleware/auth');
    const { user } = await makeUser();
    const stale = issueSession(user, Date.now() - SESSION_TTL - 5000);
    issueSession(user); // purges the stale one
    assert.equal((await rows('SELECT 1 FROM Sessions WHERE token_hash = ?', [sha(stale)])).length, 0);

    const keep = issueSession(user);
    const other = issueSession(user);
    assert.ok(revokeOtherUserSessions(user.user_id, keep) >= 1);
    assert.equal((await rows('SELECT 1 FROM Sessions WHERE token_hash = ?', [sha(other)])).length, 0);
    assert.equal((await rows('SELECT 1 FROM Sessions WHERE token_hash = ?', [sha(keep)])).length, 1);
    assert.equal(revokeSession(keep), true);
    assert.equal(revokeUserSessions(user.user_id), 0);
});

// --------------------------------------------------------------- the settings, as functions

test('LPMS_TRUST_PROXY: nothing trusted unless asked for', () => {
    assert.equal(security.parseTrustProxy(undefined), false);
    assert.equal(security.parseTrustProxy(''), false);
    assert.equal(security.parseTrustProxy('false'), false);
    assert.equal(security.parseTrustProxy('0'), false);
    assert.equal(security.parseTrustProxy('1'), 1);
    assert.equal(security.parseTrustProxy('2'), 2);
    assert.equal(security.parseTrustProxy('true'), 1, 'true means one proxy, not "trust everything"');
    assert.equal(security.parseTrustProxy('loopback, 10.0.0.0/8'), 'loopback, 10.0.0.0/8');
});

test('LPMS_COOKIE_SECURE: auto is Secure in production or over https, never plain-http development', () => {
    const http = { secure: false };
    const https = { secure: true };
    assert.equal(security.cookieSecure(http, { NODE_ENV: 'development' }), false, 'plain http on localhost');
    assert.equal(security.cookieSecure(undefined, { NODE_ENV: 'development' }), false);
    assert.equal(security.cookieSecure(https, { NODE_ENV: 'development' }), true);
    assert.equal(security.cookieSecure(http, { NODE_ENV: 'production' }), true);
    assert.equal(security.cookieSecure(http, { NODE_ENV: 'development', LPMS_COOKIE_SECURE: 'true' }), true);
    assert.equal(security.cookieSecure(https, { NODE_ENV: 'production', LPMS_COOKIE_SECURE: 'false' }), false, 'an explicit false wins');
    const options = security.sessionCookieOptions(http, { maxAge: 1000, env: { NODE_ENV: 'development' } });
    assert.deepEqual(options, { httpOnly: true, sameSite: 'lax', secure: false, path: '/', maxAge: 1000 });
});

// --------------------------------------------------------------- the running API

const withEnv = async (values, fn) => {
    const saved = Object.fromEntries(Object.keys(values).map(k => [k, process.env[k]]));
    for (const [k, v] of Object.entries(values)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    try { return await fn(); } finally { for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } }
};

const startApp = async (env = {}) => {
    const { requireAuth } = require('../middleware/auth');
    const app = express();
    security.applySecurity(app, env);
    app.use(express.json());
    app.use('/api/auth', require('../routes/auth'));
    app.use('/api', requireAuth);
    app.get('/api/ping', (req, res) => res.json({ ok: true }));
    const server = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)); });
    return { server, base: `http://127.0.0.1:${server.address().port}` };
};
const login = async (base, user, password, headers = {}) => {
    const res = await fetch(`${base}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ email: user.email, password, role: user.role })
    });
    return { status: res.status, res, setCookie: res.headers.getSetCookie()[0] || '' };
};
const ping = async (base, cookie) => (await fetch(`${base}/api/ping`, { headers: cookie ? { cookie } : {} })).status;

test('plain http sign-in sets a working cookie without Secure, and no HSTS', async () => {
    const { server, base } = await startApp({});
    try {
        const { user, password } = await makeUser();
        const result = await withEnv({ NODE_ENV: 'test', LPMS_COOKIE_SECURE: undefined }, () => login(base, user, password));
        assert.equal(result.status, 200);
        assert.match(result.setCookie, /^lpms_session=/);
        assert.match(result.setCookie, /HttpOnly/i);
        assert.match(result.setCookie, /SameSite=Lax/i);
        assert.match(result.setCookie, /Path=\//);
        assert.match(result.setCookie, /Max-Age=28800/);
        assert.doesNotMatch(result.setCookie, /Secure/i, 'a Secure cookie would be dropped over http on a LAN address');
        assert.equal(result.res.headers.get('strict-transport-security'), null);
        assert.equal(await ping(base, result.setCookie.split(';')[0]), 200, 'the cookie works on the next request');
    } finally { server.close(); }
});

test('over https behind a trusted proxy: Secure cookie and HSTS; without trust the header is ignored', async () => {
    const { user, password } = await makeUser();
    const trusted = await startApp({ LPMS_TRUST_PROXY: '1' });
    const untrusted = await startApp({});
    try {
        const viaProxy = await withEnv({ LPMS_COOKIE_SECURE: undefined }, () => login(trusted.base, user, password, { 'x-forwarded-proto': 'https' }));
        assert.match(viaProxy.setCookie, /Secure/i);
        assert.match(viaProxy.res.headers.get('strict-transport-security') || '', /max-age=\d+/);

        const forged = await withEnv({ LPMS_COOKIE_SECURE: undefined }, () => login(untrusted.base, user, password, { 'x-forwarded-proto': 'https' }));
        assert.doesNotMatch(forged.setCookie, /Secure/i, 'a forged https header is not believed');
        assert.equal(forged.res.headers.get('strict-transport-security'), null);
    } finally { trusted.server.close(); untrusted.server.close(); }
});

test('LPMS_COOKIE_SECURE=true marks the cookie Secure even over plain http; false overrides production', async () => {
    const { server, base } = await startApp({});
    try {
        const { user, password } = await makeUser();
        assert.match((await withEnv({ LPMS_COOKIE_SECURE: 'true' }, () => login(base, user, password))).setCookie, /Secure/i);
        assert.doesNotMatch((await withEnv({ LPMS_COOKIE_SECURE: 'false', NODE_ENV: 'production' }, () => login(base, user, password))).setCookie.replace(/Secure-/g, ''), /;\s*Secure/i);
    } finally { server.close(); }
});

test('security headers: strict CSP for the JSON API, nosniff, no framing, no x-powered-by', async () => {
    const { server, base } = await startApp({});
    try {
        const res = await fetch(`${base}/api/ping`);
        const csp = res.headers.get('content-security-policy') || '';
        assert.match(csp, /default-src 'none'/);
        assert.match(csp, /frame-ancestors 'none'/);
        assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
        assert.equal(res.headers.get('x-powered-by'), null);
        assert.equal(res.headers.get('cross-origin-resource-policy'), 'same-site');
        assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
        assert.equal(res.headers.get('strict-transport-security'), null);
    } finally { server.close(); }
});

test('rotation: signing in while holding a session revokes it and issues a different token', async () => {
    const { server, base } = await startApp({});
    try {
        const { user, password } = await makeUser();
        const first = await login(base, user, password);
        const oldCookie = first.setCookie.split(';')[0];
        assert.equal(await ping(base, oldCookie), 200);

        const second = await login(base, user, password, { cookie: oldCookie });
        const newCookie = second.setCookie.split(';')[0];
        assert.notEqual(newCookie, oldCookie, 'a new token, never the old one');
        assert.equal(await ping(base, oldCookie), 401, 'the old token is dead');
        assert.equal(await ping(base, newCookie), 200);
    } finally { server.close(); }
});

test('logout removes the session row, so the cookie stops working', async () => {
    const { server, base } = await startApp({});
    try {
        const { user, password } = await makeUser();
        const signedIn = await login(base, user, password);
        const cookie = signedIn.setCookie.split(';')[0];
        const out = await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: { cookie } });
        assert.equal(out.status, 200);
        assert.equal(await ping(base, cookie), 401);
    } finally { server.close(); }
});
