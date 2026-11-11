'use strict';

// Runs against the test database (node run-tests.js); models/index.js refuses any other in test mode.
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { User, AuditLog } = require('../models');
const { ROLE_PERMISSIONS, PERMISSIONS, hasPermission } = require('../config/permissions');
const { COOKIE_NAME, issueSession, createRequireAuth } = require('../middleware/auth');
const { generatePassword } = require('./generatedPassword');
const { bootstrapSuperuser } = require('./bootstrapSuperuser');
const { verifyPassword } = require('./password');
const authController = require('../controllers/authController');

const stamp = Date.now();
const make = (name, role) => User.create({ name, email: `${name.toLowerCase()}.${stamp}@unc.edu.ph`, role, roles: [role], password_hash: 'x' });

let server;
let base;
test.before(async () => {
    const app = express();
    app.use(express.json());
    // Stand-in for requireAuth: identify the caller by headers.
    app.use((req, res, next) => { req.user = { id: Number(req.headers['x-id']), name: 'T', role: req.headers['x-role'], roles: [req.headers['x-role']] }; next(); });
    app.use('/api/user-accounts', require('../routes/userAccounts'));
    await new Promise(resolve => { server = app.listen(0, resolve); });
    base = `http://127.0.0.1:${server.address().port}/api/user-accounts`;
});
test.after(() => server.close());

const call = (as, method, path = '', body) => fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-id': String(as.user_id ?? as.id), 'x-role': as.role },
    body: body ? JSON.stringify(body) : undefined
});
const sessionProbe = (user) => {
    const token = issueSession(user);
    return async () => {
        const r = { code: 200, status(c) { this.code = c; return this; }, json() { return this; } };
        let passed = false;
        await createRequireAuth()({ headers: { cookie: `${COOKIE_NAME}=${token}` } }, r, () => { passed = true; });
        return passed;
    };
};

test('permission matrix: every role has an entry, only the superuser and VPAA manage users, all names are defined', () => {
    for (const role of User.ROLE_KEYS) assert.ok(ROLE_PERMISSIONS[role], `no matrix entry for ${role}`);
    for (const [role, list] of Object.entries(ROLE_PERMISSIONS)) {
        for (const permission of list) assert.ok(PERMISSIONS[permission], `${role}: unknown permission ${permission}`);
    }
    assert.deepEqual(User.ROLE_KEYS.filter(r => hasPermission(r, 'users:manage')), ['vpaa', 'superuser']);
    assert.deepEqual(User.ROLE_KEYS.filter(r => hasPermission(r, 'audit:read')), ['superuser']);
    assert.equal(hasPermission('nobody', 'users:manage'), false);
});

test('generated passwords are random, long enough and pass the sign-in rules', () => {
    const seen = new Set();
    for (let i = 0; i < 50; i += 1) {
        const p = generatePassword();
        assert.ok(p.length >= 16 && /[A-Za-z]/.test(p) && /[0-9]/.test(p));
        assert.equal(authController._internals.validatePassword(p), null);
        seen.add(p);
    }
    assert.equal(seen.size, 50);
});

test('only the superuser and the VPAA manage accounts', async () => {
    const dean = await make('Dean', 'dean');
    for (const [method, path, body] of [['GET', ''], ['POST', '', { name: 'A', email: `a.${stamp}@unc.edu.ph`, roles: ['dean'] }], ['PATCH', `/${dean.user_id}`, { roles: ['vpaa'] }]]) {
        assert.equal((await call(dean, method, path, body)).status, 403, `dean ${method} ${path}`);
    }
});

test('the list has no password or token hashes, and shows disabled accounts', async () => {
    const admin = await make('Lister', 'superuser');
    const inactive = await make('Zed', 'instructor');
    inactive.is_active = false;
    await inactive.save();
    const all = await (await call(admin, 'GET')).json();
    assert.ok(all.accounts.some(a => a.id === inactive.user_id && a.status === 'Disabled'));
    assert.ok(all.accounts.every(a => !('password_hash' in a) && !('reset_token_hash' in a)));
});

test('create: validates, returns a one-time password, stores only its hash, audits without secrets', async () => {
    const admin = await make('Creator', 'superuser');
    assert.equal((await call(admin, 'POST', '', { name: '', email: `x.${stamp}@unc.edu.ph`, roles: ['dean'] })).status, 400);
    assert.equal((await call(admin, 'POST', '', { name: 'N', email: 'not-an-email', roles: ['dean'] })).status, 400);
    assert.equal((await call(admin, 'POST', '', { name: 'N', email: `n.${stamp}@unc.edu.ph`, roles: ['wizard'] })).status, 400);

    const email = `created.${stamp}@unc.edu.ph`;
    const res = await call(admin, 'POST', '', { name: 'Created, User', email: email.toUpperCase(), roles: ['program-head'] });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.account.email, email);
    assert.ok(body.temporaryPassword.length >= 16);
    assert.ok(!('password_hash' in body.account));

    const stored = await User.scope('withSecret').findByPk(body.account.id);
    assert.notEqual(stored.password_hash, body.temporaryPassword);
    assert.equal(await verifyPassword(body.temporaryPassword, stored.password_hash), true);

    assert.equal((await call(admin, 'POST', '', { name: 'Dup', email, roles: ['dean'] })).status, 409);

    const entry = await AuditLog.findOne({ where: { action: 'USER_CREATED', entity_id: String(body.account.id) } });
    assert.equal(entry.actor_user_id, admin.user_id);
    assert.deepEqual(JSON.parse(entry.details).new_roles, ['program-head']);
    assert.ok(!entry.details.includes(body.temporaryPassword));
});

test('role change: audited with old and new roles, and revokes the target sessions', async () => {
    const admin = await make('RoleAdmin', 'superuser');
    const target = await make('Target', 'instructor');
    const probe = sessionProbe(target);
    assert.equal(await probe(), true);

    assert.equal((await call(admin, 'PATCH', `/${target.user_id}`, { roles: ['wizard'] })).status, 400);
    assert.equal((await call(admin, 'PATCH', '/999999', { roles: ['dean'] })).status, 404);
    assert.equal((await call(admin, 'PATCH', `/${target.user_id}`, { roles: ['dean'] })).status, 200);
    assert.deepEqual((await User.findByPk(target.user_id)).roles, ['dean']);
    assert.equal(await probe(), false, 'old session must be revoked');

    const entry = await AuditLog.findOne({ where: { action: 'USER_UPDATED', entity_id: String(target.user_id) } });
    const details = JSON.parse(entry.details);
    assert.deepEqual([details.old_roles, details.new_roles], [['instructor'], ['dean']]);
});

test('disable / enable: revokes sessions, is audited', async () => {
    const admin = await make('ActAdmin', 'superuser');
    const target = await make('Sleeper', 'instructor');
    const probe = sessionProbe(target);

    assert.equal((await call(admin, 'PATCH', `/${target.user_id}`, { status: 'Disabled' })).status, 200);
    assert.equal((await User.findByPk(target.user_id)).is_active, false);
    assert.equal(await probe(), false, 'a disabled account loses its session');
    const off = await AuditLog.findOne({ where: { action: 'USER_UPDATED', entity_id: String(target.user_id) } });
    assert.deepEqual([JSON.parse(off.details).old_status, JSON.parse(off.details).new_status], ['Active', 'Disabled']);

    assert.equal((await call(admin, 'PATCH', `/${target.user_id}`, { status: 'Active' })).status, 200);
    assert.equal((await User.findByPk(target.user_id)).is_active, true);
});

test('safety: no self-disable, no dropping your own management role, the last active superuser is protected', async () => {
    // Make this test's superusers the only active ones.
    await User.update({ is_active: false }, { where: { role: 'superuser' } });
    const only = await make('OnlyAdmin', 'superuser');
    const ghost = { user_id: 999999, role: 'superuser' }; // an acting superuser who is not the target

    assert.equal((await call(only, 'PATCH', `/${only.user_id}`, { status: 'Disabled' })).status, 400, 'self-disable');
    assert.equal((await call(only, 'PATCH', `/${only.user_id}`, { roles: ['dean'] })).status, 400, 'self role change');
    const lastOff = await call(ghost, 'PATCH', `/${only.user_id}`, { status: 'Disabled' });
    assert.equal(lastOff.status, 409);
    assert.match((await lastOff.json()).error, /last active superuser/);
    assert.equal((await call(ghost, 'PATCH', `/${only.user_id}`, { roles: ['dean'] })).status, 409, 'demote last');
    assert.equal((await User.findByPk(only.user_id)).is_active, true);

    // With a second active superuser, one may go, and the other becomes the last.
    const other = await make('OtherAdmin', 'superuser');
    assert.equal((await call(other, 'PATCH', `/${other.user_id}`, { status: 'Disabled' })).status, 400, 'self-disable with a peer');
    assert.equal((await call(other, 'PATCH', `/${only.user_id}`, { status: 'Disabled' })).status, 200);
    assert.equal((await call(ghost, 'PATCH', `/${other.user_id}`, { status: 'Disabled' })).status, 409);
    assert.equal((await call(ghost, 'PATCH', `/${other.user_id}`, { roles: ['dean'] })).status, 409);
});

test('the superuser is closed out of every API except user accounts and the audit trail', () => {
    const { restrictSuperuser } = require('../middleware/auth');
    const outcome = (role, path) => {
        let passed = false;
        const res = { code: 200, status(c) { this.code = c; return this; }, json() { return this; } };
        restrictSuperuser({ user: { role }, path }, res, () => { passed = true; });
        return passed ? 'pass' : res.code;
    };
    assert.equal(outcome('superuser', '/user-accounts'), 'pass');
    assert.equal(outcome('superuser', '/user-accounts/3'), 'pass');
    assert.equal(outcome('superuser', '/users'), 403, 'the old users API is gone');
    assert.equal(outcome('superuser', '/audit-logs'), 'pass');
    assert.equal(outcome('superuser', '/profile'), 'pass', 'their own profile and e-signature');
    for (const path of ['/assignments', '/ilos/1', '/references', '/coaep/1', '/usersX']) assert.equal(outcome('superuser', path), 403, path);
    assert.equal(outcome('dean', '/assignments'), 'pass');
});

test('self-registration never accepts superuser', async () => {
    const res = { code: 200, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
    await authController.register({
        body: { name: 'Sneaky', email: `sneaky.${stamp}@example.test`, password: 'abcdefg1', role: 'superuser' },
        ip: '127.0.0.1', socket: { remoteAddress: '127.0.0.1' }
    }, res, assert.ifError);
    assert.equal(res.code, 403);
    assert.equal(await User.findOne({ where: { email: `sneaky.${stamp}@example.test` } }), null);
});

test('bootstrap creates the first superuser once, with a random password, and audits it', async () => {
    const created = [];
    const audits = [];
    const fakeUser = {
        count: async () => created.length,
        findOne: async () => null,
        create: async row => { const u = { ...row, user_id: 1 }; created.push(u); return u; }
    };
    const audit = async entry => { audits.push(entry); };

    const { user, password } = await bootstrapSuperuser({ User: fakeUser, audit, name: 'Admin, First', email: 'First@UNC.edu.ph' });
    assert.equal(user.role, 'superuser');
    assert.equal(user.email, 'first@unc.edu.ph');
    assert.equal(user.must_change_password, true, 'the printed password must be changed at first sign-in');
    assert.equal(user.temp_password_expires_at, undefined, 'and does not expire, so the only superuser cannot be locked out');
    assert.equal(await verifyPassword(password, user.password_hash), true);
    assert.notEqual(user.password_hash, password);
    assert.equal(audits[0].action, 'SUPERUSER_BOOTSTRAPPED');
    assert.ok(!JSON.stringify(audits[0]).includes(password));

    await assert.rejects(bootstrapSuperuser({ User: fakeUser, audit, name: 'Again', email: 'again@unc.edu.ph' }), /already exists/);
    await assert.rejects(bootstrapSuperuser({ User: { ...fakeUser, count: async () => 0 }, audit, name: '', email: 'x@y.co' }), /name is required/);
    await assert.rejects(bootstrapSuperuser({ User: { ...fakeUser, count: async () => 0 }, audit, name: 'N', email: 'nope' }), /valid email/);
});
