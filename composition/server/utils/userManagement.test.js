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
const make = (name, role) => User.create({ name, email: `${name.toLowerCase()}.${stamp}@example.test`, role, password_hash: 'x' });

let server;
let base;
test.before(async () => {
    const app = express();
    app.use(express.json());
    // Stand-in for requireAuth: identify the caller by headers.
    app.use((req, res, next) => { req.user = { id: Number(req.headers['x-id']), name: 'T', role: req.headers['x-role'] }; next(); });
    app.use('/api/users', require('../routes/users'));
    await new Promise(resolve => { server = app.listen(0, resolve); });
    base = `http://127.0.0.1:${server.address().port}/api/users`;
});
test.after(() => server.close());

const call = (as, method, path = '', body) => fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-id': String(as.user_id ?? as.id), 'x-role': as.role },
    body: body ? JSON.stringify(body) : undefined
});

test('permission matrix: every role has an entry, only the superuser manages users, all names are defined', () => {
    for (const role of User.ROLE_KEYS) assert.ok(ROLE_PERMISSIONS[role], `no matrix entry for ${role}`);
    for (const [role, list] of Object.entries(ROLE_PERMISSIONS)) {
        for (const permission of list) assert.ok(PERMISSIONS[permission], `${role}: unknown permission ${permission}`);
    }
    assert.deepEqual(User.ROLE_KEYS.filter(r => hasPermission(r, 'users:manage')), ['superuser']);
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

test('every users route refuses a non-superuser', async () => {
    const dean = await make('Dean', 'dean');
    for (const [method, path, body] of [['GET', ''], ['POST', '', { name: 'A', email: 'a@b.co', role: 'dean' }], ['PUT', `/${dean.user_id}/role`, { role: 'vpaa' }], ['PUT', `/${dean.user_id}/deactivate`], ['PUT', `/${dean.user_id}/activate`]]) {
        assert.equal((await call(dean, method, path, body)).status, 403, `${method} ${path}`);
    }
});

test('superuser lists with search, role and status filters; no hashes in the response', async () => {
    const admin = await make('Lister', 'superuser');
    const inactive = await make('Zed', 'instructor');
    inactive.is_active = false;
    await inactive.save();

    const all = await (await call(admin, 'GET')).json();
    assert.ok(all.users.length >= 2 && all.roles.includes('superuser'));
    assert.ok(all.users.every(u => !('password_hash' in u) && !('reset_token_hash' in u)));

    const byName = await (await call(admin, 'GET', `?q=zed.${stamp}`)).json();
    assert.deepEqual(byName.users.map(u => u.id), [inactive.user_id]);
    const byStatus = await (await call(admin, 'GET', '?status=inactive&role=instructor')).json();
    assert.ok(byStatus.users.every(u => u.role === 'instructor' && u.isActive === false));
    assert.ok(byStatus.users.some(u => u.id === inactive.user_id));
});

test('create: validates, returns a one-time password, stores only its hash, audits without secrets', async () => {
    const admin = await make('Creator', 'superuser');
    assert.equal((await call(admin, 'POST', '', { name: '', email: 'x@y.co', role: 'dean' })).status, 400);
    assert.equal((await call(admin, 'POST', '', { name: 'N', email: 'not-an-email', role: 'dean' })).status, 400);
    assert.equal((await call(admin, 'POST', '', { name: 'N', email: 'n@y.co', role: 'wizard' })).status, 400);

    const email = `created.${stamp}@example.test`;
    const res = await call(admin, 'POST', '', { name: 'Created, User', email: email.toUpperCase(), role: 'program-head' });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.user.email, email);
    assert.ok(body.temporaryPassword.length >= 16);
    assert.ok(!('password_hash' in body.user));

    const stored = await User.scope('withSecret').findByPk(body.user.id);
    assert.notEqual(stored.password_hash, body.temporaryPassword);
    assert.equal(await verifyPassword(body.temporaryPassword, stored.password_hash), true);

    assert.equal((await call(admin, 'POST', '', { name: 'Dup', email, role: 'dean' })).status, 409);

    const entry = await AuditLog.findOne({ where: { action: 'USER_CREATED', entity_id: String(body.user.id) } });
    assert.equal(entry.actor_user_id, admin.user_id);
    assert.deepEqual(JSON.parse(entry.details), { target_user_id: body.user.id, new_role: 'program-head' });
    assert.ok(!entry.details.includes(body.temporaryPassword));
});

test('role change: audited with old and new role, and revokes the target sessions', async () => {
    const admin = await make('RoleAdmin', 'superuser');
    const target = await make('Target', 'instructor');
    const token = issueSession(target);
    const requireAuth = createRequireAuth();
    const probe = async () => { const r = { code: 200, status(c) { this.code = c; return this; }, json() { return this; } }; let passed = false; await requireAuth({ headers: { cookie: `${COOKIE_NAME}=${token}` } }, r, () => { passed = true; }); return passed; };
    assert.equal(await probe(), true);

    assert.equal((await call(admin, 'PUT', `/${target.user_id}/role`, { role: 'wizard' })).status, 400);
    assert.equal((await call(admin, 'PUT', '/999999/role', { role: 'dean' })).status, 404);
    assert.equal((await call(admin, 'PUT', `/${target.user_id}/role`, { role: 'dean' })).status, 200);
    assert.equal((await User.findByPk(target.user_id)).role, 'dean');
    assert.equal(await probe(), false, 'old session must be revoked');

    const entry = await AuditLog.findOne({ where: { action: 'USER_ROLE_CHANGED', entity_id: String(target.user_id) } });
    assert.deepEqual(JSON.parse(entry.details), { target_user_id: target.user_id, old_role: 'instructor', new_role: 'dean' });
});

test('deactivate / activate: revokes sessions, is audited, and a deactivated user cannot sign in', async () => {
    const admin = await make('ActAdmin', 'superuser');
    const target = await make('Sleeper', 'instructor');
    const token = issueSession(target);

    assert.equal((await call(admin, 'PUT', `/${target.user_id}/deactivate`)).status, 200);
    assert.equal((await User.findByPk(target.user_id)).is_active, false);
    const r = { code: 200, status(c) { this.code = c; return this; }, json() { return this; } };
    await createRequireAuth()({ headers: { cookie: `${COOKIE_NAME}=${token}` } }, r, () => assert.fail('revoked session passed'));
    assert.equal(r.code, 401);

    const off = await AuditLog.findOne({ where: { action: 'USER_DEACTIVATED', entity_id: String(target.user_id) } });
    assert.deepEqual(JSON.parse(off.details), { target_user_id: target.user_id, old_active: true, new_active: false });

    assert.equal((await call(admin, 'PUT', `/${target.user_id}/activate`)).status, 200);
    assert.equal((await User.findByPk(target.user_id)).is_active, true);
    assert.ok(await AuditLog.findOne({ where: { action: 'USER_ACTIVATED', entity_id: String(target.user_id) } }));
});

test('safety: no self-deactivation, no self role change, the last active superuser is protected', async () => {
    // Make this test's superusers the only active ones.
    await User.update({ is_active: false }, { where: { role: 'superuser' } });
    const only = await make('OnlyAdmin', 'superuser');
    const ghost = { user_id: 999999, role: 'superuser' }; // an acting superuser who is not the target

    assert.equal((await call(only, 'PUT', `/${only.user_id}/deactivate`)).status, 409, 'self-deactivate');
    assert.equal((await call(only, 'PUT', `/${only.user_id}/role`, { role: 'dean' })).status, 409, 'self role change');
    const lastOff = await call(ghost, 'PUT', `/${only.user_id}/deactivate`);
    assert.equal(lastOff.status, 409);
    assert.match((await lastOff.json()).error, /last active superuser/);
    assert.equal((await call(ghost, 'PUT', `/${only.user_id}/role`, { role: 'dean' })).status, 409, 'demote last');
    assert.equal((await User.findByPk(only.user_id)).is_active, true);

    // With a second active superuser, one may go, and the other becomes the last.
    const other = await make('OtherAdmin', 'superuser');
    assert.equal((await call(other, 'PUT', `/${other.user_id}/deactivate`)).status, 409, 'self-deactivate with a peer');
    assert.equal((await call(other, 'PUT', `/${only.user_id}/deactivate`)).status, 200);
    assert.equal((await call(ghost, 'PUT', `/${other.user_id}/deactivate`)).status, 409);
    assert.equal((await call(ghost, 'PUT', `/${other.user_id}/role`, { role: 'dean' })).status, 409);
});

test('the superuser is closed out of every API except users and the audit trail', () => {
    const { restrictSuperuser } = require('../middleware/auth');
    const outcome = (role, path) => {
        let passed = false;
        const res = { code: 200, status(c) { this.code = c; return this; }, json() { return this; } };
        restrictSuperuser({ user: { role }, path }, res, () => { passed = true; });
        return passed ? 'pass' : res.code;
    };
    assert.equal(outcome('superuser', '/users'), 'pass');
    assert.equal(outcome('superuser', '/users/3/role'), 'pass');
    assert.equal(outcome('superuser', '/audit-logs'), 'pass');
    assert.equal(outcome('superuser', '/profile/signature'), 'pass');
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
