'use strict';

// Credential flow: temporary passwords, forced change, change-password, reset, mail delivery.
// Runs against the test database (node run-tests.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { User, AuditLog, sequelize } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { hashPassword, verifyPassword } = require('./password');
const { createMailer, smtpConfig, mailer } = require('./mailer');

const stamp = Date.now();
const SMTP_VARS = ['LPMS_SMTP_HOST', 'LPMS_SMTP_PORT', 'LPMS_SMTP_USER', 'LPMS_SMTP_PASS', 'LPMS_SMTP_FROM'];
const withSmtp = async (transport, fn) => {
    const saved = Object.fromEntries(SMTP_VARS.map(k => [k, process.env[k]]));
    Object.assign(process.env, { LPMS_SMTP_HOST: 'smtp.example.test', LPMS_SMTP_FROM: 'lpms@example.test' });
    mailer._setTransport(transport);
    try { await fn(); } finally {
        mailer._setTransport(null);
        for (const k of SMTP_VARS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
    }
};
const fakeTransport = (fail = false) => ({
    sent: [],
    async sendMail(message) { if (fail) throw new Error('smtp down'); this.sent.push(message); }
});

let n = 0;
const makeUser = async (role, password, extra = {}) => {
    n += 1;
    return User.create({
        name: `Flow ${n}`, email: `flow${n}.${stamp}@example.test`, role,
        password_hash: await hashPassword(password), ...extra
    });
};

let server;
let base;
let adminCalls; // users routes with a fake superuser identity
let adminBase;
test.before(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', require('../routes/auth'));
    app.use('/api', requireAuth);
    app.get('/api/ping', (req, res) => res.json({ ok: true }));
    await new Promise(resolve => { server = app.listen(0, resolve); });
    base = `http://127.0.0.1:${server.address().port}`;

    const admin = express();
    admin.use(express.json());
    admin.use((req, res, next) => { req.user = { id: Number(req.headers['x-id']), name: 'Admin', role: 'superuser' }; next(); });
    admin.use('/api/users', require('../routes/users'));
    await new Promise(resolve => { adminCalls = admin.listen(0, resolve); });
    adminBase = `http://127.0.0.1:${adminCalls.address().port}/api/users`;
});
test.after(() => { server.close(); adminCalls.close(); });

const api = async (method, path, { body, cookie } = {}) => {
    const res = await fetch(base + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => null);
    const setCookie = res.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
    return { status: res.status, data, cookie: setCookie };
};
const login = (user, password) => api('POST', '/api/auth/login', { body: { email: user.email, password, role: user.role } });
const admin = async (as, method, path = '', body) => {
    const res = await fetch(adminBase + path, {
        method, headers: { 'Content-Type': 'application/json', 'x-id': String(as.user_id) }, body: body ? JSON.stringify(body) : undefined
    });
    return { status: res.status, data: await res.json().catch(() => null) };
};
const auditFor = (action, userId) => AuditLog.findAll({ where: { action, entity_id: String(userId) } });

test('the credential columns exist', async () => {
    const [columns] = await sequelize.query('PRAGMA table_info(Users)');
    const names = columns.map(c => c.name);
    for (const name of ['must_change_password', 'password_changed_at', 'temp_password_expires_at']) assert.ok(names.includes(name), name);
});

test('mailer: needs host and from, never throws, uses the injected transport', async () => {
    assert.equal(smtpConfig({}), null);
    assert.equal(smtpConfig({ LPMS_SMTP_HOST: 'h' }), null);
    const config = smtpConfig({ LPMS_SMTP_HOST: 'h', LPMS_SMTP_FROM: 'f@x', LPMS_SMTP_PORT: '465', LPMS_SMTP_USER: 'u', LPMS_SMTP_PASS: 'p' });
    assert.deepEqual([config.port, config.secure, config.auth.user], [465, true, 'u']);

    const env = {};
    const transport = fakeTransport();
    const m = createMailer({ getEnv: () => env });
    m._setTransport(transport);
    assert.equal(m.configured(), false);
    assert.deepEqual(await m.send({ to: 'a@b.co', subject: 's', text: 't' }), { ok: false, error: 'SMTP is not configured.' });
    Object.assign(env, { LPMS_SMTP_HOST: 'h', LPMS_SMTP_FROM: 'f@x' });
    assert.equal(m.configured(), true);
    assert.deepEqual(await m.send({ to: 'a@b.co', subject: 's', text: 't' }), { ok: true });
    assert.equal(transport.sent[0].from, 'f@x');
    m._setTransport(fakeTransport(true));
    const failed = await m.send({ to: 'a@b.co', subject: 's', text: 't' });
    assert.equal(failed.ok, false);
});

test('creating a user without SMTP: forced change, 72h expiry, password shown once, audited without secrets', async () => {
    const boss = await makeUser('instructor', 'Boss-pass1');
    const res = await admin(boss, 'POST', '', { name: 'Fresh, User', email: `fresh.${stamp}@example.test`, role: 'instructor' });
    assert.equal(res.status, 201);
    assert.equal(res.data.delivery, 'shown');
    assert.ok(res.data.temporaryPassword.length >= 16);

    const stored = await User.findByPk(res.data.user.id);
    assert.equal(stored.must_change_password, true);
    const hours = (new Date(stored.temp_password_expires_at) - Date.now()) / 3600000;
    assert.ok(hours > 71.9 && hours <= 72, `expiry in ${hours}h`);

    for (const action of ['TEMP_PASSWORD_ISSUED', 'CREDENTIALS_SHOWN']) {
        const rows = await auditFor(action, stored.user_id);
        assert.equal(rows.length, 1, action);
        assert.ok(!rows[0].details.includes(res.data.temporaryPassword));
    }
});

test('creating a user with SMTP: emailed, password not in the response, failure falls back to showing it', async () => {
    const boss = await makeUser('instructor', 'Boss-pass1');
    const transport = fakeTransport();
    await withSmtp(transport, async () => {
        const res = await admin(boss, 'POST', '', { name: 'Mailed, User', email: `mailed.${stamp}@example.test`, role: 'dean' });
        assert.equal(res.status, 201);
        assert.equal(res.data.delivery, 'emailed');
        assert.equal(res.data.temporaryPassword, undefined);
        assert.equal(transport.sent.length, 1);
        assert.equal(transport.sent[0].to, `mailed.${stamp}@example.test`);
        const password = /Temporary password: (\S+)/.exec(transport.sent[0].text)[1];
        const stored = await User.scope('withSecret').findByPk(res.data.user.id);
        assert.equal(await verifyPassword(password, stored.password_hash), true);
        const sent = await auditFor('CREDENTIALS_SENT', stored.user_id);
        assert.equal(sent.length, 1);
        assert.ok(!sent[0].details.includes(password));
    });

    await withSmtp(fakeTransport(true), async () => {
        const res = await admin(boss, 'POST', '', { name: 'Unlucky, User', email: `unlucky.${stamp}@example.test`, role: 'dean' });
        assert.equal(res.status, 201);
        assert.equal(res.data.delivery, 'shown');
        assert.ok(res.data.temporaryPassword);
        assert.equal((await auditFor('CREDENTIALS_SHOWN', res.data.user.id)).length, 1);
    });
});

test('forced change: login flags it, only change-password / session / logout work until it is done', async () => {
    const user = await makeUser('instructor', 'Temp-pass1', { must_change_password: true, temp_password_expires_at: new Date(Date.now() + 3600000) });
    const signedIn = await login(user, 'Temp-pass1');
    assert.equal(signedIn.status, 200);
    assert.equal(signedIn.data.mustChangePassword, true);
    assert.equal(signedIn.data.user.mustChangePassword, true);

    const blocked = await api('GET', '/api/ping', { cookie: signedIn.cookie });
    assert.equal(blocked.status, 403);
    assert.equal(blocked.data.code, 'PASSWORD_CHANGE_REQUIRED');

    const session = await api('GET', '/api/auth/session', { cookie: signedIn.cookie });
    assert.equal(session.status, 200);
    assert.equal(session.data.user.mustChangePassword, true);

    const changed = await api('POST', '/api/auth/change-password', { cookie: signedIn.cookie, body: { currentPassword: 'Temp-pass1', newPassword: 'Brand-new-9' } });
    assert.equal(changed.status, 200);
    assert.equal(changed.data.user.mustChangePassword, false);
    assert.equal((await api('GET', '/api/ping', { cookie: signedIn.cookie })).status, 200, 'same session works after the change');

    const fresh = await User.findByPk(user.user_id);
    assert.equal(fresh.must_change_password, false);
    assert.equal(fresh.temp_password_expires_at, null);
    assert.ok(fresh.password_changed_at);

    const forcedLogout = await makeUser('instructor', 'Temp-pass2', { must_change_password: true, temp_password_expires_at: new Date(Date.now() + 3600000) });
    const again = await login(forcedLogout, 'Temp-pass2');
    assert.equal((await api('POST', '/api/auth/logout', { cookie: again.cookie })).status, 200);
});

test('an expired temporary password cannot sign in, and kills a session that already exists', async () => {
    const user = await makeUser('instructor', 'Temp-pass1', { must_change_password: true, temp_password_expires_at: new Date(Date.now() + 3600000) });
    const live = await login(user, 'Temp-pass1');
    assert.equal(live.status, 200);

    await User.update({ temp_password_expires_at: new Date(Date.now() - 1000) }, { where: { user_id: user.user_id } });
    const refused = await login(user, 'Temp-pass1');
    assert.equal(refused.status, 403);
    assert.match(refused.data.error, /expired/);
    assert.equal(refused.cookie, '');
    assert.equal((await api('GET', '/api/auth/session', { cookie: live.cookie })).status, 401);
});

test('change-password: rules, lockout, other sessions revoked, audited without secrets', async () => {
    const user = await makeUser('instructor', 'Old-pass-1');
    const mine = await login(user, 'Old-pass-1');
    const other = await login(user, 'Old-pass-1');
    const change = (body, cookie = mine.cookie) => api('POST', '/api/auth/change-password', { cookie, body });

    assert.equal((await api('POST', '/api/auth/change-password', { body: { currentPassword: 'x', newPassword: 'y' } })).status, 401, 'needs a session');
    assert.equal((await change({ currentPassword: 'Wrong-pass-1', newPassword: 'New-pass-22' })).status, 401);
    assert.equal((await change({ currentPassword: 'Old-pass-1', newPassword: 'short' })).status, 400);
    assert.equal((await change({ currentPassword: 'Old-pass-1', newPassword: 'onlyletters' })).status, 400);
    const same = await change({ currentPassword: 'Old-pass-1', newPassword: 'Old-pass-1' });
    assert.equal(same.status, 400);
    assert.match(same.data.error, /different/);

    assert.equal((await change({ currentPassword: 'Old-pass-1', newPassword: 'New-pass-22' })).status, 200);
    assert.equal((await api('GET', '/api/ping', { cookie: mine.cookie })).status, 200, 'current session kept');
    assert.equal((await api('GET', '/api/ping', { cookie: other.cookie })).status, 401, 'other session revoked');
    assert.equal((await login(user, 'Old-pass-1')).status, 401);
    assert.equal((await login(user, 'New-pass-22')).status, 200);

    const rows = await auditFor('PASSWORD_CHANGED', user.user_id);
    assert.equal(rows.length, 1);
    assert.ok(!JSON.stringify(rows[0]).includes('New-pass-22') && !JSON.stringify(rows[0]).includes('Old-pass-1'));
    assert.ok((await auditFor('PASSWORD_CHANGE_FAILED', user.user_id)).length >= 1);
});

test('change-password: wrong current passwords hit the same lockout as sign-in', async () => {
    const user = await makeUser('instructor', 'Old-pass-1');
    const session = await login(user, 'Old-pass-1');
    const attempt = (currentPassword) => api('POST', '/api/auth/change-password', { cookie: session.cookie, body: { currentPassword, newPassword: 'New-pass-22' } });
    for (let i = 0; i < 5; i += 1) assert.equal((await attempt('Wrong-pass-1')).status, 401);
    assert.equal((await attempt('Old-pass-1')).status, 429, 'even the right password is refused while locked out');
    assert.equal((await login(user, 'Old-pass-1')).status, 429, 'sign-in shares the lockout');
});

test('superuser reset-password: new temporary password, forced change, sessions revoked, guarded', async () => {
    const boss = await makeUser('instructor', 'Boss-pass1');
    const target = await makeUser('instructor', 'Old-pass-1');
    const session = await login(target, 'Old-pass-1');

    assert.equal((await admin(boss, 'PUT', `/${boss.user_id}/reset-password`)).status, 409, 'not on yourself');
    assert.equal((await admin(boss, 'PUT', '/999999/reset-password')).status, 404);

    const res = await admin(boss, 'PUT', `/${target.user_id}/reset-password`);
    assert.equal(res.status, 200);
    assert.equal(res.data.delivery, 'shown');
    assert.equal(res.data.user.mustChangePassword, true);
    assert.equal((await api('GET', '/api/auth/session', { cookie: session.cookie })).status, 401, 'old session revoked');
    assert.equal((await login(target, 'Old-pass-1')).status, 401, 'old password no longer works');
    const next = await login(target, res.data.temporaryPassword);
    assert.equal(next.status, 200);
    assert.equal(next.data.mustChangePassword, true);

    for (const action of ['TEMP_PASSWORD_ISSUED', 'CREDENTIALS_SHOWN']) {
        const rows = await auditFor(action, target.user_id);
        assert.ok(rows.length >= 1 && rows.every(r => !r.details.includes(res.data.temporaryPassword)), action);
    }

    await User.update({ is_active: false }, { where: { user_id: target.user_id } });
    assert.equal((await admin(boss, 'PUT', `/${target.user_id}/reset-password`)).status, 409, 'not for deactivated accounts');
});

test('forgot-password sends the link through the mailer; no token in the response; the link works', async () => {
    const user = await makeUser('instructor', 'Old-pass-1', { must_change_password: true, temp_password_expires_at: new Date(Date.now() + 3600000) });
    const transport = fakeTransport();
    await withSmtp(transport, async () => {
        const res = await api('POST', '/api/auth/forgot-password', { body: { email: user.email } });
        assert.equal(res.status, 200);
        assert.equal(res.data.devToken, undefined);
        const unknown = await api('POST', '/api/auth/forgot-password', { body: { email: `nobody.${stamp}@example.test` } });
        assert.deepEqual(unknown.data, res.data, 'same answer for unknown emails');

        for (let i = 0; i < 50 && transport.sent.length === 0; i += 1) await new Promise(r => setTimeout(r, 20));
        assert.equal(transport.sent.length, 1, 'one email, for the real account only');
        assert.equal(transport.sent[0].to, user.email);
        const token = decodeURIComponent(/reset=([^&\s]+)/.exec(transport.sent[0].text)[1]);

        const done = await api('POST', '/api/auth/reset-password', { body: { email: user.email, token, password: 'Fresh-pass-3' } });
        assert.equal(done.status, 200);
        const stored = await User.findByPk(user.user_id);
        assert.equal(stored.must_change_password, false, 'a reset replaces the temporary password');
        assert.ok(stored.password_changed_at);
        assert.equal((await login(user, 'Fresh-pass-3')).status, 200);

        const audited = await auditFor('PASSWORD_RESET_REQUESTED', user.user_id);
        assert.ok(audited.length >= 1 && audited.every(r => !r.details || !r.details.includes(token)));
    });
});
