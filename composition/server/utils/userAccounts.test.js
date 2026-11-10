'use strict';

// Multi-role accounts, the acting-role header, and the User Accounts API of the VPAA / superuser
// (feature/course-assignment). Runs against the test database (node run-tests.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { User } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { hashPassword } = require('./password');
const { PRIVACY_NOTICE_VERSION } = require('../config/privacy');

const stamp = Date.now();
let n = 0;
const PASSWORD = 'Accounts-test-1';
const makeUser = async (roles) => {
    n += 1;
    return User.create({
        name: `Acct ${n}`, email: `acct${n}.${stamp}@unc.edu.ph`, role: roles[0], roles,
        password_hash: await hashPassword(PASSWORD)
    });
};

let server;
let base;
test.before(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', require('../routes/auth'));
    app.use('/api', requireAuth);
    app.get('/api/whoami', (req, res) => res.json({ role: req.user.role, roles: req.user.roles }));
    app.use('/api/user-accounts', require('../routes/userAccounts'));
    await new Promise(resolve => { server = app.listen(0, resolve); });
    base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

const api = async (method, path, { body, cookie, role } = {}) => {
    const res = await fetch(base + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}), ...(role ? { 'X-LPMS-Role': role } : {}) },
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, data, cookie: res.headers.getSetCookie().map(c => c.split(';')[0]).join('; ') };
};
const signIn = async (user) => (await api('POST', '/api/auth/login', { body: { email: user.email, password: PASSWORD } })).cookie;

test('one account, two roles: the header picks the acting role, and a role not held is ignored', async () => {
    const user = await makeUser(['program-head', 'instructor']);
    const login = await api('POST', '/api/auth/login', { body: { email: user.email, password: PASSWORD } });
    assert.equal(login.status, 200);
    assert.deepEqual([...login.data.user.roles].sort(), ['instructor', 'program-head']);

    assert.equal((await api('GET', '/api/whoami', { cookie: login.cookie, role: 'instructor' })).data.role, 'instructor');
    assert.equal((await api('GET', '/api/whoami', { cookie: login.cookie, role: 'program-head' })).data.role, 'program-head');
    const forged = await api('GET', '/api/whoami', { cookie: login.cookie, role: 'dean' });
    assert.notEqual(forged.data.role, 'dean');
    assert.ok(user.roles.includes(forged.data.role));
});

test('the VPAA manages accounts, but never superuser ones, never outside the domain, never their own status', async () => {
    const vpaa = await makeUser(['vpaa']);
    const boss = await makeUser(['superuser']);
    const cookie = await signIn(vpaa);

    const list = await api('GET', '/api/user-accounts', { cookie });
    assert.equal(list.status, 200);
    assert.ok(list.data.accounts.some(a => a.id === vpaa.user_id));
    assert.ok(!list.data.accounts.some(a => a.id === boss.user_id), 'superuser accounts are hidden from the VPAA');
    assert.ok(!list.data.roles.some(r => r.key === 'superuser'));

    assert.equal((await api('POST', '/api/user-accounts', { cookie, body: { name: 'Out, Side', email: `out.${stamp}@gmail.com`, roles: ['dean'] } })).status, 400);
    assert.equal((await api('POST', '/api/user-accounts', { cookie, body: { name: 'Super, Me', email: `super.${stamp}@unc.edu.ph`, roles: ['superuser'] } })).status, 403);
    assert.equal((await api('PATCH', `/api/user-accounts/${boss.user_id}`, { cookie, body: { status: 'Disabled' } })).status, 403);
    assert.equal((await api('PATCH', `/api/user-accounts/${vpaa.user_id}`, { cookie, body: { status: 'Disabled' } })).status, 400);

    const created = await api('POST', '/api/user-accounts', { cookie, body: { name: 'New, Person', email: `new.${stamp}@unc.edu.ph`, roles: ['dean', 'instructor'] } });
    assert.equal(created.status, 201);
    assert.ok(created.data.temporaryPassword, 'no SMTP: shown once');
    assert.deepEqual([...created.data.account.roles].sort(), ['dean', 'instructor']);

    const instructor = await makeUser(['instructor']);
    assert.equal((await api('GET', '/api/user-accounts', { cookie: await signIn(instructor) })).status, 403);
});

test('a role change ends the sessions of that account', async () => {
    const vpaa = await makeUser(['vpaa']);
    const target = await makeUser(['instructor']);
    const targetCookie = await signIn(target);
    assert.equal((await api('GET', '/api/whoami', { cookie: targetCookie })).status, 200);

    const changed = await api('PATCH', `/api/user-accounts/${target.user_id}`, { cookie: await signIn(vpaa), body: { roles: ['instructor', 'dean'] } });
    assert.equal(changed.status, 200);
    assert.equal((await api('GET', '/api/whoami', { cookie: targetCookie })).status, 401);
});

test('an invitation link: needs the Privacy Notice, signs the person in, and works once', async () => {
    const vpaa = await makeUser(['vpaa']);
    const invitee = await makeUser(['instructor']);
    const sent = await api('POST', `/api/user-accounts/${invitee.user_id}/send-invitation`, { cookie: await signIn(vpaa) });
    assert.equal(sent.status, 200);
    const token = new URL(sent.data.link).searchParams.get('token');
    assert.ok(token, 'no SMTP: the link is handed back once');

    const found = await api('GET', `/api/auth/invitation?token=${encodeURIComponent(token)}`);
    assert.equal(found.status, 200);
    assert.equal(found.data.email, invitee.email);

    assert.equal((await api('POST', '/api/auth/accept-invitation', { body: { token, password: 'Chosen-pass-1' } })).status, 400, 'consent required');
    const accepted = await api('POST', '/api/auth/accept-invitation', { body: { token, password: 'Chosen-pass-1', privacy_consent_version: PRIVACY_NOTICE_VERSION } });
    assert.equal(accepted.status, 200);
    assert.equal((await api('GET', '/api/whoami', { cookie: accepted.cookie })).status, 200);
    assert.equal((await api('GET', `/api/auth/invitation?token=${encodeURIComponent(token)}`)).status, 410, 'used up');
});
