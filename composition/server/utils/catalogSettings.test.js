'use strict';

// The Reference Library rules, through the real router, against the test database. The Director of
// Libraries changes them for everyone; everyone signed in reads them. The test puts them back as it
// found them. (node run-tests.js)
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { CatalogSetting } = require('../models');
const { validateCatalogSettings } = require('./catalogSettings');

let server;
let base;
let original;

test.before(async () => {
    original = (await CatalogSetting.findByPk(1))?.toJSON() || null;
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => { const [id, role] = String(req.get('x-user') || '').split(':'); req.user = id ? { id: Number(id), role, name: 'Test Director' } : undefined; next(); });
    app.use('/api/catalog-settings', require('../routes/catalogSettings'));
    await new Promise(resolve => { server = app.listen(0, resolve); });
    base = `http://127.0.0.1:${server.address().port}/api/catalog-settings`;
});

test.after(async () => {
    server.close();
    if (original) await CatalogSetting.update({ recency_years: original.recency_years, enforce_recency: original.enforce_recency, require_availability: original.require_availability, updated_by_name: original.updated_by_name }, { where: { id: 1 } });
});

const call = async (who, method, body) => {
    const res = await fetch(base, { method, headers: { 'x-user': who, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: await res.json().catch(() => ({})) };
};
const DIRECTOR = '7:director-of-libraries';

test('validation: whole years from 1 to 30, true or false, and something to change', () => {
    assert.deepEqual(validateCatalogSettings({ recencyYears: 7, enforceRecency: false }), { ok: true, value: { recency_years: 7, enforce_recency: false } });
    for (const bad of [{ recencyYears: 0 }, { recencyYears: 31 }, { recencyYears: 2.5 }, { recencyYears: 'five' }, { enforceRecency: 'yes' }, {}]) {
        assert.equal(validateCatalogSettings(bad).ok, false, JSON.stringify(bad));
    }
});

test('everyone signed in reads the rules; the defaults are 5 years with both rules on', async () => {
    await CatalogSetting.update({ recency_years: 5, enforce_recency: true, require_availability: true }, { where: { id: 1 } });
    const { status, body } = await call('3:instructor', 'GET');
    assert.equal(status, 200);
    assert.deepEqual([body.recencyYears, body.enforceRecency, body.requireLibraryAvailability], [5, true, true]);
});

test('only the Director of Libraries may change them', async () => {
    for (const role of ['instructor', 'program-head', 'dean', 'industry-consultant', 'vpaa']) {
        assert.equal((await call(`3:${role}`, 'PUT', { recencyYears: 9 })).status, 403, role);
    }
    assert.equal((await call(DIRECTOR, 'GET')).body.recencyYears, 5, 'nothing changed');
});

test('a change by the Director is kept for everyone, with who made it', async () => {
    const put = await call(DIRECTOR, 'PUT', { recencyYears: 8, enforceRecency: false });
    assert.equal(put.status, 200);
    const read = await call('3:instructor', 'GET');
    assert.deepEqual([read.body.recencyYears, read.body.enforceRecency, read.body.requireLibraryAvailability, read.body.updatedBy], [8, false, true, 'Test Director']);
});

test('a bad change is refused and changes nothing', async () => {
    const put = await call(DIRECTOR, 'PUT', { recencyYears: 99 });
    assert.equal(put.status, 400);
    assert.match(put.body.message, /1 to 30/);
    assert.equal((await call(DIRECTOR, 'GET')).body.recencyYears, 8);
});
