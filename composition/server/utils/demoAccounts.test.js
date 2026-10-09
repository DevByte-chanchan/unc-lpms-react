'use strict';

// GET /api/auth/demo-accounts: the demo accounts the sign-in screen may list. Runs against the test
// database (node run-tests.js), which is seeded with the six demo accounts.
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { User } = require('../models');

let server;
let base;
test.before(async () => {
    const app = express();
    app.use('/api/auth', require('../routes/auth'));
    await new Promise(resolve => { server = app.listen(0, resolve); });
    base = `http://127.0.0.1:${server.address().port}/api/auth/demo-accounts`;
});
test.after(() => server.close());

// The route reads the environment on every request, so a test can switch it for a moment.
const withEnv = async (values, fn) => {
    const saved = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
    for (const [key, value] of Object.entries(values)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    try { return await fn(); } finally {
        for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    }
};
const get = async () => (await fetch(base)).json();

test('off unless LPMS_SHOW_DEMO_ACCOUNTS=1: nothing is listed', async () => {
    await withEnv({ NODE_ENV: 'development', LPMS_SHOW_DEMO_ACCOUNTS: undefined }, async () => {
        assert.deepEqual(await get(), { enabled: false, accounts: [] });
    });
    await withEnv({ NODE_ENV: 'development', LPMS_SHOW_DEMO_ACCOUNTS: '0' }, async () => {
        assert.deepEqual(await get(), { enabled: false, accounts: [] });
    });
});

test('never in production, even when switched on', async () => {
    await withEnv({ NODE_ENV: 'production', LPMS_SHOW_DEMO_ACCOUNTS: '1' }, async () => {
        assert.deepEqual(await get(), { enabled: false, accounts: [] });
    });
});

test('switched on: the six demo accounts, their roles and the shared password, and nothing else about anyone', async () => {
    await withEnv({ NODE_ENV: 'development', LPMS_SHOW_DEMO_ACCOUNTS: '1' }, async () => {
        const body = await get();
        assert.equal(body.enabled, true);
        assert.equal(body.password, 'demo1234');
        assert.deepEqual(body.accounts.map(a => a.email), [
            'monica.norton@unc.edu.ph', 'junar.danila@unc.edu.ph', 'maria.santos@unc.edu.ph',
            'roberto.cruz@unc.edu.ph', 'agnes.reyes@unc.edu.ph', 'carlos.garcia@unc.edu.ph'
        ]);
        assert.deepEqual(body.accounts.map(a => a.role), ['instructor', 'program-head', 'director-of-libraries', 'industry-consultant', 'dean', 'vpaa']);
        assert.ok(!body.accounts.some(a => a.role === 'superuser'), 'the superuser is never listed');
        for (const account of body.accounts) assert.deepEqual(Object.keys(account).sort(), ['email', 'name', 'role']);
        assert.ok(!JSON.stringify(body).includes('scrypt'), 'no password hash');
    });
});

test('only demo accounts that exist are listed, not every user', async () => {
    await User.create({ name: 'OTHER, PERSON', email: `other.${Date.now()}@example.test`, role: 'instructor', password_hash: 'x' });
    await withEnv({ NODE_ENV: 'development', LPMS_SHOW_DEMO_ACCOUNTS: '1' }, async () => {
        const body = await get();
        assert.equal(body.accounts.length, 6);
        assert.ok(!body.accounts.some(a => a.email.endsWith('@example.test')));
    });
});
