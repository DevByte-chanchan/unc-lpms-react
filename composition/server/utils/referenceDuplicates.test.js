'use strict';

// A reference cannot be added twice: the same title and authors, or the same ISBN (however it is
// written), is refused on create, edit and import. Runs against the test database (node run-tests.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { Reference } = require('../models');
const { isbnKey, findDuplicate } = require('./referenceValidation');
const { createReference, updateReference, importReferences } = require('../controllers/referenceController');

test('isbnKey ignores spaces, hyphens and case', () => {
    assert.equal(isbnKey('978-0-13-468599-1'), '9780134685991');
    assert.equal(isbnKey(' 0 8044 2957 x '), '080442957X');
    assert.equal(isbnKey(null), '');
    assert.equal(isbnKey(''), '');
});

test('findDuplicate matches on title and authors, or on ISBN, and skips the row being edited', () => {
    const stored = [
        { reference_id: 1, title: 'Clean Code', author: 'Martin, R.', isbn: '978-0-13-235088-4', archived: false },
        { reference_id: 2, title: 'No ISBN Book', author: 'Doe, J.', isbn: null, archived: true }
    ];
    assert.equal(findDuplicate({ title: ' clean  code ', author: 'MARTIN, R.', isbn: null }, stored).reference_id, 1, 'title and authors, any case and spacing');
    assert.equal(findDuplicate({ title: 'A new title', author: 'Other', isbn: '9780132350884' }, stored).reference_id, 1, 'same ISBN written differently');
    assert.equal(findDuplicate({ title: 'No ISBN Book', author: 'Doe, J.', isbn: '' }, stored).reference_id, 2, 'an archived one still counts');
    assert.equal(findDuplicate({ title: 'Clean Code', author: 'Martin, R.', isbn: null }, stored, 1), null, 'the row being edited is not its own duplicate');
    assert.equal(findDuplicate({ title: 'Different', author: 'Different', isbn: null }, stored), null);
    assert.equal(findDuplicate({ title: 'A', author: 'B', isbn: '' }, [{ reference_id: 3, title: 'C', author: 'D', isbn: '' }]), null, 'two empty ISBNs are not a match');
});

const PREFIX = 'ZZDUP test book ';
let server;
let base;
const made = [];

test.before(async () => {
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => { req.user = { id: 9301, role: 'director-of-libraries' }; next(); });
    app.post('/refs', createReference);
    app.put('/refs/:id', updateReference);
    app.post('/refs-import', importReferences);
    await new Promise(resolve => { server = app.listen(0, resolve); });
    base = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
    server.close();
    await Reference.destroy({ where: { reference_id: made } });
});

const send = async (method, path, body) => {
    const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
};
// A Textbook needs an ISBN. These are 13 digits that no other test or demo reference uses.
const isbn13 = (n) => `978999${String(n).padStart(7, '0')}`;
const good = (n, extra = {}) => ({ type: 'Textbook', title: `${PREFIX}${n}`, authors: `Tester ${n}`, isbn: isbn13(typeof n === 'number' ? n : 99), year: '2024', publisher: 'Test Press', ...extra });
const add = async (payload) => {
    const r = await send('POST', '/refs', payload);
    if (r.status === 201) made.push(r.body.reference_id);
    return r;
};

test('adding the same title and authors twice is refused, naming the existing reference', async () => {
    const first = await add(good(1));
    assert.equal(first.status, 201);
    const again = await add(good(1, { isbn: isbn13(901) })); // same title and authors, a different ISBN
    assert.equal(again.status, 409);
    assert.equal(again.body.code, 'DUPLICATE_REFERENCE');
    assert.equal(again.body.existing.reference_id, first.body.reference_id);
});

test('the same ISBN is refused even under a different title and with other hyphens', async () => {
    assert.equal((await add(good(2, { isbn: '978-9990-000-0-02' }))).status, 201);
    const other = await add(good(3, { isbn: '9789990000002' }));
    assert.equal(other.status, 409);
    assert.equal(other.body.code, 'DUPLICATE_REFERENCE');
});

test('an archived duplicate is refused with a message that says to restore it', async () => {
    const first = await add(good(4));
    await Reference.update({ archived: true }, { where: { reference_id: first.body.reference_id } });
    const again = await add(good(4, { isbn: isbn13(902) }));
    assert.equal(again.status, 409);
    assert.equal(again.body.existing.archived, true);
    assert.match(again.body.message, /Restore it/);
});

test('a different title, authors and ISBN is accepted', async () => {
    assert.equal((await add(good(5))).status, 201);
});

test('editing a reference into a duplicate is refused, but editing its other fields is allowed', async () => {
    const a = await add(good(6));
    const b = await add(good(7));
    const clash = await send('PUT', `/refs/${b.body.reference_id}`, good(7, { title: `${PREFIX}6`, authors: 'Tester 6' })); // title and authors of the first
    assert.equal(clash.status, 409);
    const fine = await send('PUT', `/refs/${a.body.reference_id}`, good(6, { publisher: 'Another Press' }));
    assert.equal(fine.status, 200);
});

test('an old duplicate pair stays editable in fields other than title, authors and ISBN', async () => {
    const one = await Reference.create({ type: 'Textbook', title: `${PREFIX}old`, author: 'Old, A.', isbn: isbn13(903), publication_year: new Date(Date.UTC(2020, 0, 1)), publisher: 'P', archived: false, created_by: 1 });
    const two = await Reference.create({ type: 'Textbook', title: `${PREFIX}old`, author: 'Old, A.', isbn: isbn13(903), publication_year: new Date(Date.UTC(2020, 0, 1)), publisher: 'P', archived: false, created_by: 1 });
    made.push(one.reference_id, two.reference_id);
    const res = await send('PUT', `/refs/${one.reference_id}`, good('old', { title: `${PREFIX}old`, authors: 'Old, A.', isbn: isbn13(903), year: '2020', publisher: 'Fixed Press' }));
    assert.equal(res.status, 200);
});

test('a bulk import marks a row with an existing ISBN as a duplicate', async () => {
    const stored = await add(good(8, { isbn: '978-9990-000-0-08' }));
    assert.equal(stored.status, 201);
    const report = await send('POST', '/refs-import', { dryRun: true, rows: [good(9, { isbn: '9789990000008' }), good(10)] });
    assert.equal(report.status, 200);
    assert.deepEqual(report.body.rows.map(r => r.status), ['duplicate', 'ok']);
});
