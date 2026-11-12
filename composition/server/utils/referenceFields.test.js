'use strict';

// What the library holds for a reference: copies, status, category and the date received.
// Rules of the fields, the migration, and the API. Runs against the test database (node run-tests.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { Reference, sequelize } = require('../models');
const { describeTypes, UNAVAILABLE_STATUSES } = require('../config/referenceTypes');
const { validateReference, changedFields } = require('./referenceValidation');
const { createReference, updateReference, getReferenceLibrary } = require('../controllers/referenceController');

// A made-up ISBN-13 with a real check digit (the library checks it).
const isbn13 = (n) => { const d = `978998${String(n).padStart(6, '0')}`; return d + (10 - [...d].reduce((s, c, i) => s + Number(c) * (i % 2 ? 3 : 1), 0) % 10) % 10; };
const textbook = (extra = {}) => ({ type: 'Textbook', title: 'Fields test', authors: 'Tester', isbn: isbn13(1), year: '2024', ...extra });
const problems = (extra) => validateReference(textbook(extra)).errors;

test('only a Textbook has copies and a received date; every type has a status and a category', () => {
    const fieldsOf = (key) => describeTypes().find(t => t.key === key).fields.map(f => f.key);
    for (const key of ['copies', 'received']) {
        assert.ok(fieldsOf('Textbook').includes(key));
        for (const other of ['OER', 'Online Resource', 'Online Subscription']) assert.ok(!fieldsOf(other).includes(key), `${other} has no ${key}`);
    }
    for (const type of ['Textbook', 'OER', 'Online Resource', 'Online Subscription']) {
        assert.ok(fieldsOf(type).includes('status') && fieldsOf(type).includes('category'), type);
    }
});

test('the form definition carries the status choices and their default', () => {
    const status = describeTypes().find(t => t.key === 'Textbook').fields.find(f => f.key === 'status');
    assert.equal(status.kind, 'choice');
    assert.deepEqual(status.options, ['available', 'lost', 'withdrawn']);
    assert.equal(status.default, 'available');
    assert.deepEqual([...UNAVAILABLE_STATUSES], ['lost', 'withdrawn']);
});

test('copies must be a whole number from 0 to 9999, and empty means not known', () => {
    assert.equal(validateReference(textbook({ copies: '0' })).values.copies, 0, 'zero is a real count');
    assert.equal(validateReference(textbook({ copies: '12' })).values.copies, 12);
    assert.equal(validateReference(textbook({ copies: '' })).values.copies, null);
    for (const bad of ['-1', '1.5', 'many', '10000']) assert.match(problems({ copies: bad }).copies, /whole number/, bad);
});

test('status is one of the three, any case, and defaults to available', () => {
    assert.equal(validateReference(textbook()).values.status, 'available');
    assert.equal(validateReference(textbook({ status: 'LOST' })).values.status, 'lost');
    assert.equal(validateReference(textbook({ status: ' Withdrawn ' })).values.status, 'withdrawn');
    assert.match(problems({ status: 'borrowed' }).status, /one of: available, lost, withdrawn/);
});

test('the category is free text up to 50 characters', () => {
    assert.equal(validateReference(textbook({ category: 'Databases' })).values.category, 'Databases');
    assert.match(problems({ category: 'x'.repeat(51) }).category, /at most 50/);
});

test('the date received is a real past or present date written YYYY-MM-DD', () => {
    assert.equal(validateReference(textbook({ received: '2024-03-05' })).values.date_received, '2024-03-05');
    for (const bad of ['05/03/2024', '2024-13-01', '2024-02-30', 'yesterday']) assert.match(problems({ received: bad }).received, /YYYY-MM-DD/, bad);
    assert.match(problems({ received: '2999-01-01' }).received, /future/);
});

test('a field a type does not have is ignored for that type', () => {
    const result = validateReference({ type: 'OER', title: 'Open', authors: 'A', year: '2020', link: 'https://example.org/x', copies: '4', received: '2024-01-01' });
    assert.equal(result.ok, true);
    assert.equal(result.values.copies, null);
    assert.equal(result.values.date_received, null);
});

test('changedFields reports the new fields when they change, and only then', () => {
    const stored = { type: 'Textbook', title: 'T', author: 'A', isbn: '9789980000002', publication_year: '2024-01-01', link: null, publisher: null, copies: 3, status: 'available', category: null, date_received: null };
    const same = validateReference(textbook({ title: 'T', authors: 'A', isbn: '9789980000002', copies: '3' })).values;
    assert.deepEqual(changedFields(stored, same), []);
    const changed = validateReference(textbook({ title: 'T', authors: 'A', isbn: '9789980000002', copies: '2', status: 'lost', category: 'AI', received: '2023-02-01' })).values;
    assert.deepEqual(changedFields(stored, changed).sort(), ['category', 'copies', 'received', 'status']);
});

test('the migration added the columns, and every existing reference is available', async () => {
    const [columns] = await sequelize.query('PRAGMA table_info(`References`)');
    const byName = Object.fromEntries(columns.map(c => [c.name, c]));
    for (const name of ['copies', 'status', 'category', 'date_received']) assert.ok(byName[name], name);
    assert.equal(byName.status.notnull, 1);
    assert.equal(byName.status.dflt_value, "'available'");
    const [[{ unset }]] = await sequelize.query("SELECT COUNT(*) AS unset FROM `References` WHERE status IS NULL OR status = ''");
    assert.equal(unset, 0);
});

// ---- the API ----
let server;
let base;
const made = [];
test.before(async () => {
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => { req.user = { id: 9401, role: 'director-of-libraries' }; next(); });
    app.post('/refs', createReference);
    app.put('/refs/:id', updateReference);
    app.get('/library', getReferenceLibrary);
    await new Promise(resolve => { server = app.listen(0, resolve); });
    base = `http://127.0.0.1:${server.address().port}`;
});
test.after(async () => { server.close(); await Reference.destroy({ where: { reference_id: made } }); });

const send = async (method, path, body) => {
    const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: await res.json() };
};

test('create stores the new fields, edit changes them, and the library list returns them', async () => {
    const created = await send('POST', '/refs', textbook({ title: 'ZZFIELDS book', authors: 'Fields, F.', isbn: isbn13(11), copies: '5', category: 'Networks', received: '2024-02-01' }));
    assert.equal(created.status, 201);
    made.push(created.body.reference_id);
    assert.equal(created.body.copies, 5);
    assert.equal(created.body.status, 'available');
    assert.equal(created.body.date_received, '2024-02-01');

    const edited = await send('PUT', `/refs/${created.body.reference_id}`, textbook({ title: 'ZZFIELDS book', authors: 'Fields, F.', isbn: isbn13(11), copies: '0', status: 'lost', category: 'Networks', received: '2024-02-01' }));
    assert.equal(edited.status, 200);
    assert.equal(edited.body.copies, 0);
    assert.equal(edited.body.status, 'lost');

    const library = await send('GET', '/library');
    const row = library.body.find(r => r.reference_id === created.body.reference_id);
    assert.deepEqual([row.copies, row.status, row.category, row.date_received], [0, 'lost', 'Networks', '2024-02-01']);
});

test('the API refuses a bad status or a negative number of copies', async () => {
    const badStatus = await send('POST', '/refs', textbook({ title: 'ZZFIELDS bad', isbn: isbn13(12), status: 'borrowed' }));
    assert.equal(badStatus.status, 400);
    assert.ok(badStatus.body.errors.status);
    const badCopies = await send('POST', '/refs', textbook({ title: 'ZZFIELDS bad2', isbn: isbn13(13), copies: '-3' }));
    assert.equal(badCopies.status, 400);
    assert.ok(badCopies.body.errors.copies);
});
