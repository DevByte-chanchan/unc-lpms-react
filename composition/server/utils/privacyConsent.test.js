'use strict';

// Step 6 (small part): the Privacy Notice endpoint with the DPO contact from the environment, and the
// consent version + time recorded at registration. Runs against the test database (node run-tests.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { User, AuditLog } = require('../models');
const { PRIVACY_NOTICE_VERSION, privacyNotice } = require('../config/privacy');

const stamp = Date.now();
let n = 0;
const withEnv = async (values, fn) => {
    const saved = Object.fromEntries(Object.keys(values).map(k => [k, process.env[k]]));
    for (const [k, v] of Object.entries(values)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    try { return await fn(); } finally { for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } }
};

let server;
let base;
test.before(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', require('../routes/auth'));
    await new Promise(resolve => { server = app.listen(0, resolve); });
    base = `http://127.0.0.1:${server.address().port}/api/auth`;
});
test.after(() => server.close());

const register = (extra = {}) => {
    n += 1;
    return fetch(`${base}/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `CONSENT, TEST ${n}`, email: `consent${n}.${stamp}@example.test`, password: 'Consent-test-1', role: 'instructor', ...extra })
    });
};
const emailOf = (n_) => `consent${n_}.${stamp}@example.test`;

test('the notice is public, has the version and its sections, and holds no secrets', async () => {
    const res = await fetch(`${base}/privacy`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.version, PRIVACY_NOTICE_VERSION);
    assert.ok(body.sections.length >= 4 && body.sections.every(s => s.title && s.items.length > 0));
    assert.deepEqual(Object.keys(body).sort(), ['dpo', 'sections', 'version']);
});

test('the DPO contact comes from the environment, and says when it is not set', async () => {
    assert.deepEqual(privacyNotice({}).dpo, { name: '', email: '', configured: false });
    const set = privacyNotice({ LPMS_DPO_NAME: ' Maria Dela Cruz ', LPMS_DPO_EMAIL: ' dpo@unc.edu.ph ' }).dpo;
    assert.deepEqual(set, { name: 'Maria Dela Cruz', email: 'dpo@unc.edu.ph', configured: true });
    const live = await withEnv({ LPMS_DPO_EMAIL: 'dpo.test@unc.edu.ph', LPMS_DPO_NAME: 'DPO TEST' }, async () => (await (await fetch(`${base}/privacy`)).json()).dpo);
    assert.equal(live.email, 'dpo.test@unc.edu.ph');
    const unset = await withEnv({ LPMS_DPO_EMAIL: undefined, LPMS_DPO_NAME: undefined }, async () => (await (await fetch(`${base}/privacy`)).json()).dpo);
    assert.equal(unset.configured, false);
});

test('registration without consent, or with another version, is refused and creates nothing', async () => {
    await withEnv({ NODE_ENV: 'test' }, async () => {
        const missing = await register();
        assert.equal(missing.status, 400);
        const body = await missing.json();
        assert.equal(body.code, 'CONSENT_REQUIRED');
        assert.equal(body.version, PRIVACY_NOTICE_VERSION);
        assert.equal(await User.findOne({ where: { email: emailOf(n) } }), null, 'no account was made');

        const stale = await register({ privacy_consent_version: '2000-01-01' });
        assert.equal(stale.status, 400);
        assert.equal((await stale.json()).code, 'CONSENT_REQUIRED');
        assert.equal(await User.findOne({ where: { email: emailOf(n) } }), null);

        const boolean = await register({ privacy_consent_version: true });
        assert.equal(boolean.status, 400, 'a bare true is not a version');
    });
});

test('registration with the current version stores the version and the time, and audits the version', async () => {
    await withEnv({ NODE_ENV: 'test' }, async () => {
        const before = Date.now();
        const res = await register({ privacy_consent_version: PRIVACY_NOTICE_VERSION });
        assert.equal(res.status, 201);
        const user = await User.findOne({ where: { email: emailOf(n) } });
        assert.equal(user.privacy_consent_version, PRIVACY_NOTICE_VERSION);
        const acceptedAt = new Date(user.privacy_consent_at).getTime();
        assert.ok(acceptedAt >= before - 1000 && acceptedAt <= Date.now() + 1000, 'the time is now');

        const audit = await AuditLog.findAll({ where: { action: 'REGISTER', actor_user_id: user.user_id } });
        assert.equal(audit.length, 1);
        assert.equal(JSON.parse(audit[0].details).privacyConsentVersion, PRIVACY_NOTICE_VERSION);
        assert.ok(!JSON.stringify(audit[0].details).includes('Consent-test-1'), 'no password in the audit row');
    });
});

test('accounts made without registration have no consent recorded, and the public user record does not expose it', async () => {
    const created = await User.create({ name: 'NO CONSENT', email: `noconsent.${stamp}@example.test`, role: 'instructor', password_hash: 'x' });
    const user = await User.findByPk(created.user_id);
    assert.equal(user.privacy_consent_version, null);
    assert.equal(user.privacy_consent_at, null);
    assert.ok(!('privacy_consent_version' in user.toPublic()));
});
