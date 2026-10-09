'use strict';

// References: type config, validation, endpoints, archive rules, import, migration.
// Runs against the test database (node run-tests.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { Sequelize: SequelizeLib } = require('sequelize');
const { sequelize, Sequelize, Reference, AuditLog, User } = require('../models');
const { REFERENCE_TYPES, TYPE_KEYS, FIELDS, isReferenceType, describeTypes, legacyTypeKey } = require('../config/referenceTypes');
const { ROLE_PERMISSIONS } = require('../config/permissions');
const { validateReference, duplicateKey, changedFields } = require('./referenceValidation');
const { assignReferencesToILO } = require('../controllers/iloReferenceController');
const { getReferenceSummary } = require('../controllers/referenceSummaryController');
const { cloneOfferingContent } = require('../services/offeringService');
const migration = require('../migrations/20260915000000-reference-types-and-archive');

const stamp = Date.now();
let counter = 0;
const uniq = (label) => `${label} ${++counter} ${stamp}`;

const GOOD = {
    Textbook: { type: 'Textbook', title: 'Operating Systems', authors: 'Silberschatz', isbn: '978-1-119-80036-0', year: '2023' },
    OER: { type: 'OER', title: 'Open Algorithms', authors: 'Erickson', year: '2019', link: 'https://example.org/algorithms' },
    'Online Resource': { type: 'Online Resource', title: 'MDN Web Docs', authors: 'Mozilla', link: 'https://developer.mozilla.org/' },
    'Online Subscription': { type: 'Online Subscription', title: 'O’Reilly Learning', publisher: 'O’Reilly Media', link: 'https://learning.oreilly.com/' }
};
const withTitle = (type, extra = {}) => ({ ...GOOD[type], title: uniq(GOOD[type].title), ...extra });

// ----------------------------------------------------------------------- config

test('the type config: four types, each with consistent required / optional fields', () => {
    assert.deepEqual(TYPE_KEYS, ['Textbook', 'OER', 'Online Resource', 'Online Subscription']);
    for (const [key, type] of Object.entries(REFERENCE_TYPES)) {
        assert.ok(type.label, key);
        assert.ok(type.required.includes('title'), `${key} requires a title`);
        for (const field of [...type.required, ...type.optional]) assert.ok(FIELDS[field], `${key}: unknown field ${field}`);
        assert.equal(new Set([...type.required, ...type.optional]).size, type.required.length + type.optional.length, `${key}: a field is listed twice`);
    }
    assert.ok(REFERENCE_TYPES['Online Subscription'].required.includes('publisher'), 'a subscription needs its provider');
    assert.equal(isReferenceType('Textbook'), true);
    for (const bad of ['textbook', 'TEXTBOOK', 'Online Resources', 'constructor', '__proto__', '', null, undefined, 7]) assert.equal(isReferenceType(bad), false, String(bad));
});

test('describeTypes gives the client everything it needs, required fields first', () => {
    const described = describeTypes();
    assert.deepEqual(described.map(t => t.key), TYPE_KEYS);
    const subscription = described.find(t => t.key === 'Online Subscription');
    assert.deepEqual(subscription.fields.map(f => [f.key, f.required]), [['title', true], ['publisher', true], ['link', true], ['authors', false], ['year', false]]);
    assert.equal(subscription.fields.find(f => f.key === 'publisher').label, 'Provider / platform');
    assert.equal(subscription.fields.find(f => f.key === 'title').kind, 'text');
});

test('legacy type values map by exact match only', () => {
    assert.equal(legacyTypeKey('TEXTBOOK'), 'Textbook');
    assert.equal(legacyTypeKey(' Online Resources '), 'Online Resource');
    assert.equal(legacyTypeKey('ONLINE'), 'Online Resource');
    assert.equal(legacyTypeKey('Open Educational Resources'), 'OER');
    assert.equal(legacyTypeKey('subscription'), 'Online Subscription');
    for (const unknown of ['Textbooks and more', 'open', 'oer-ish', 'Book', '', null]) assert.equal(legacyTypeKey(unknown), null, String(unknown));
});

// -------------------------------------------------------------------- validation

test('each type accepts its required fields and reports exactly what is missing', () => {
    for (const type of TYPE_KEYS) {
        const ok = validateReference(GOOD[type]);
        assert.equal(ok.ok, true, `${type}: ${JSON.stringify(ok.errors)}`);
        assert.equal(ok.values.type, type);
        // Dropping each required field, one at a time, fails on that field and no other.
        for (const field of REFERENCE_TYPES[type].required) {
            const broken = validateReference({ ...GOOD[type], [field]: '   ' });
            assert.equal(broken.ok, false, `${type} without ${field}`);
            assert.deepEqual(Object.keys(broken.errors), [field]);
        }
    }
});

test('unknown or missing types are rejected', () => {
    for (const type of ['Journal', 'textbook', 'Online Resources', undefined, '']) {
        const result = validateReference({ ...GOOD.Textbook, type });
        assert.equal(result.ok, false, String(type));
        assert.deepEqual(Object.keys(result.errors), ['type']);
    }
    assert.equal(validateReference(null).ok, false);
});

test('field rules: ISBN, year, link, lengths; fields a type does not use are dropped', () => {
    const textbook = (extra) => validateReference({ ...GOOD.Textbook, ...extra });
    assert.equal(textbook({ isbn: '0-306-40615-2' }).ok, true);
    assert.equal(textbook({ isbn: '12345' }).errors.isbn, 'ISBN must have 10 or 13 digits.');
    assert.match(textbook({ isbn: 'abc-def-ghi-jkl' }).errors.isbn, /only digits/);
    assert.match(textbook({ year: '23' }).errors.year, /4-digit/);
    assert.match(textbook({ year: '1850' }).errors.year, /between 1900/);
    assert.match(textbook({ year: String(new Date().getFullYear() + 5) }).errors.year, /between 1900/);
    assert.match(textbook({ title: 'x'.repeat(201) }).errors.title, /at most 200/);
    assert.equal(textbook({ link: 'https://example.org/book' }).ok, true, 'optional link is allowed on a textbook');
    assert.match(textbook({ link: 'javascript:alert(1)' }).errors.link, /http\(s\)/);
    assert.match(textbook({ link: 'ftp://example.org/x' }).errors.link, /http\(s\)/);
    assert.match(textbook({ link: 'not a url' }).errors.link, /http\(s\)/);

    // A subscription has no ISBN: anything sent for it is ignored.
    const subscription = validateReference({ ...GOOD['Online Subscription'], isbn: '978-1-119-80036-0' });
    assert.equal(subscription.ok, true);
    assert.equal(subscription.values.isbn, null);

    // Control characters and runs of whitespace are cleaned; the year becomes a UTC date.
    const cleaned = textbook({ title: '  Operating\u0000   Systems\n' });
    assert.equal(cleaned.values.title, 'Operating Systems');
    assert.equal(cleaned.values.publication_year.toISOString(), '2023-01-01T00:00:00.000Z');
    // The old API names still work, and a stored timestamp is read as its year.
    assert.equal(validateReference({ type: 'Textbook', title: 'T', author: 'A', isbn: '0306406152', publication_year: '2021-01-01 00:00:00.000 +00:00' }).ok, true);
});

test('changedFields reports field names only', () => {
    const stored = validateReference(GOOD.Textbook).values;
    assert.deepEqual(changedFields(stored, validateReference(GOOD.Textbook).values), []);
    assert.deepEqual(changedFields(stored, validateReference({ ...GOOD.Textbook, title: 'New', year: '2020' }).values), ['title', 'year']);
    assert.deepEqual(changedFields(stored, validateReference({ ...GOOD.OER, title: GOOD.Textbook.title, authors: GOOD.Textbook.authors, year: GOOD.Textbook.year }).values).sort(), ['isbn', 'link', 'type']);
    assert.equal(duplicateKey('  Operating   Systems', 'SILBERSCHATZ'), duplicateKey('operating systems', ' silberschatz '));
});

// --------------------------------------------------------------------- endpoints

let server;
let base;
test.before(async () => {
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => { req.user = { id: Number(req.headers['x-id']), name: 'T', role: req.headers['x-role'] }; next(); });
    app.use('/api/references', require('../routes/references'));
    await new Promise(resolve => { server = app.listen(0, resolve); });
    base = `http://127.0.0.1:${server.address().port}/api/references`;
});
test.after(() => server.close());

const DIRECTOR = { id: 3, role: 'director-of-libraries' };
const call = (as, method, path = '', body) => fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json', 'x-id': String(as.id), 'x-role': as.role }, body: body ? JSON.stringify(body) : undefined
});
const create = async (type, extra) => (await call(DIRECTOR, 'POST', '', withTitle(type, extra))).json();
const auditFor = (action, id) => AuditLog.findAll({ where: { action, entity_id: String(id) } });

test('only the Director of Libraries may write; everyone signed in may read', async () => {
    assert.deepEqual(Object.keys(ROLE_PERMISSIONS).filter(r => ROLE_PERMISSIONS[r].includes('reference:manage')), ['director-of-libraries']);
    const made = await create('Textbook');
    const body = withTitle('Textbook');
    for (const role of ['instructor', 'program-head', 'dean', 'industry-consultant', 'vpaa', 'superuser']) {
        const as = { id: 1, role };
        for (const [method, path, payload] of [['POST', '', body], ['PUT', `/${made.reference_id}`, body], ['PUT', `/${made.reference_id}/archive`], ['PUT', `/${made.reference_id}/unarchive`], ['POST', '/import', { rows: [body] }]]) {
            assert.equal((await call(as, method, path, payload)).status, 403, `${role} ${method} ${path}`);
        }
        assert.equal((await call(as, 'GET', '/types')).status, 200, `${role} reads types`);
        assert.equal((await call(as, 'GET')).status, 200, `${role} reads the list`);
        assert.equal((await call(as, 'GET', `/${made.reference_id}`)).status, 200);
        assert.equal((await call(as, 'GET', '/library')).status, 200);
    }
    assert.equal(await Reference.count({ where: { title: body.title } }), 0, 'nothing was created by the refused calls');
});

test('GET /types serves the config', async () => {
    const { types } = await (await call({ id: 1, role: 'instructor' }, 'GET', '/types')).json();
    assert.deepEqual(types, JSON.parse(JSON.stringify(describeTypes())));
});

test('create: every type, validation errors, unknown type, audited with field names only', async () => {
    for (const type of TYPE_KEYS) {
        const response = await call(DIRECTOR, 'POST', '', withTitle(type));
        assert.equal(response.status, 201, type);
        const ref = await response.json();
        assert.equal(ref.type, type);
        assert.equal(ref.archived, false);
        assert.equal(ref.created_by, DIRECTOR.id);
        const [entry] = await auditFor('REFERENCE_CREATED', ref.reference_id);
        const details = JSON.parse(entry.details);
        assert.equal(details.reference_id, ref.reference_id);
        assert.equal(details.type, type);
        assert.ok(details.fields.includes('title'));
        assert.ok(!entry.details.includes(ref.title), 'no values in the audit trail');
        if (ref.link) assert.ok(!entry.details.includes(ref.link));
    }

    const bad = await call(DIRECTOR, 'POST', '', { ...GOOD.Textbook, isbn: 'x', year: '1' });
    assert.equal(bad.status, 400);
    assert.deepEqual(Object.keys((await bad.json()).errors).sort(), ['isbn', 'year']);
    const unknown = await call(DIRECTOR, 'POST', '', { ...GOOD.Textbook, type: 'Journal' });
    assert.equal(unknown.status, 400);
    assert.equal((await unknown.json()).errors.type, 'Unknown reference type.');
});

test('edit: validated, changes only what changed, audited with the changed field names', async () => {
    const ref = await create('Textbook');
    const body = { ...GOOD.Textbook, title: ref.title, authors: 'Silberschatz' };

    const same = await call(DIRECTOR, 'PUT', `/${ref.reference_id}`, body);
    assert.equal(same.status, 200);
    assert.equal((await auditFor('REFERENCE_UPDATED', ref.reference_id)).length, 0, 'no change, no audit entry');

    const edited = await call(DIRECTOR, 'PUT', `/${ref.reference_id}`, { ...body, title: ref.title + ' 2nd ed.', year: '2024', link: 'https://example.org/b' });
    assert.equal(edited.status, 200);
    const stored = await Reference.findByPk(ref.reference_id);
    assert.equal(stored.title, ref.title + ' 2nd ed.');
    const [entry] = await auditFor('REFERENCE_UPDATED', ref.reference_id);
    assert.deepEqual(JSON.parse(entry.details), { reference_id: ref.reference_id, changed: ['title', 'year', 'link'] });
    assert.ok(!entry.details.includes('2nd ed.') && !entry.details.includes('example.org'));

    // Changing the type re-validates against the new type's fields.
    const toSub = await call(DIRECTOR, 'PUT', `/${ref.reference_id}`, { type: 'Online Subscription', title: ref.title });
    assert.equal(toSub.status, 400);
    assert.deepEqual(Object.keys((await toSub.json()).errors).sort(), ['link', 'publisher']);

    assert.equal((await call(DIRECTOR, 'PUT', `/${ref.reference_id}`, { ...body, type: 'Journal' })).status, 400);
    assert.equal((await call(DIRECTOR, 'PUT', '/999999', body)).status, 404);
    assert.equal((await call(DIRECTOR, 'PUT', '/abc', body)).status, 404);
});

test('archive and unarchive: idempotent, audited, hidden from the selectable list but kept in the library', async () => {
    const ref = await create('OER');
    const ids = async (path) => (await (await call(DIRECTOR, 'GET', path)).json()).map(r => r.reference_id);
    assert.ok((await ids('')).includes(ref.reference_id));

    assert.equal((await call(DIRECTOR, 'PUT', `/${ref.reference_id}/archive`)).status, 200);
    assert.equal((await call(DIRECTOR, 'PUT', `/${ref.reference_id}/archive`)).status, 200);
    assert.equal((await auditFor('REFERENCE_ARCHIVED', ref.reference_id)).length, 1, 'archiving twice is one event');
    assert.ok(!(await ids('')).includes(ref.reference_id), 'not selectable for new links');
    assert.ok((await ids('?includeArchived=1')).includes(ref.reference_id));
    const library = await (await call(DIRECTOR, 'GET', '/library')).json();
    assert.equal(library.find(r => r.reference_id === ref.reference_id).archived, 1, 'still in the library, flagged');
    assert.equal((await call(DIRECTOR, 'GET', `/${ref.reference_id}`)).status, 200);

    assert.equal((await call(DIRECTOR, 'PUT', `/${ref.reference_id}/unarchive`)).status, 200);
    assert.equal((await auditFor('REFERENCE_UNARCHIVED', ref.reference_id)).length, 1);
    assert.ok((await ids('')).includes(ref.reference_id));
    assert.equal((await call(DIRECTOR, 'PUT', '/999999/archive')).status, 404);
});

// ------------------------------------------------------- archived references on plans

const insertRow = async (table, row) => {
    const keys = Object.keys(row);
    const [id] = await sequelize.query(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')});`, {
        replacements: keys.map(k => (row[k] instanceof Date ? row[k].toISOString().replace('T', ' ').replace('Z', ' +00:00') : row[k])),
        type: Sequelize.QueryTypes.INSERT
    });
    return id;
};

// An isolated plan whose content (outcomes, ILOs) is copied from a seeded plan.
const planWithIlo = async () => {
    const now = new Date();
    const stamps = { createdAt: now, updatedAt: now };
    const deptId = await insertRow('Departments', { name: uniq('Dept'), code: `R${counter}`, ...stamps });
    const programId = await insertRow('Programs', { dept_id: deptId, name: uniq('Program'), ...stamps });
    const courseId = await insertRow('Courses', { course_no: `RF${counter}${String(stamp).slice(-4)}`, course_title: 'Ref test', credit: 3, contact_hrs: 3, classification: 'Core', cmo: 'CMO', year_lvl: 1, term: '1st', ...stamps });
    const offeringId = await insertRow('ProgramCourseOfferings', { revision_number: 0, course_id: courseId, program_id: programId, dept_id: deptId, course_description: 'x', school_year: '2097-2098', semester: '1st', ...stamps });
    await sequelize.transaction(t => cloneOfferingContent(1, offeringId, now, t));
    const [ilo] = await sequelize.query(
        `SELECT i.ilo_id FROM IntendedLearningOutcomes i INNER JOIN CourseOutcomes co ON co.co_id = i.co_id WHERE co.pc_offering_id = ? ORDER BY i.ilo_id LIMIT 1`,
        { replacements: [offeringId], type: Sequelize.QueryTypes.SELECT });
    planWithIlo.lastOffering = offeringId;
    return ilo.ilo_id;
};
const assign = async (iloId, referenceIds) => {
    const res = { code: 200, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
    await assignReferencesToILO({ body: { ilo_id: iloId, reference_ids: referenceIds } }, res);
    return res;
};
const linked = async (iloId) => (await sequelize.query('SELECT reference_id FROM ILOReferences WHERE ilo_id = ?', { replacements: [iloId], type: Sequelize.QueryTypes.SELECT })).map(r => r.reference_id);

test('an archived reference stays on plans that use it but cannot be linked anew', async () => {
    const iloId = await planWithIlo();
    const used = await create('Textbook');
    const other = await create('OER');
    assert.equal((await assign(iloId, [used.reference_id])).code, 200);

    await call(DIRECTOR, 'PUT', `/${used.reference_id}/archive`);
    await call(DIRECTOR, 'PUT', `/${other.reference_id}/archive`);

    // The plan still shows it, and re-saving the plan with it keeps it.
    assert.deepEqual(await linked(iloId), [used.reference_id]);
    assert.equal((await assign(iloId, [used.reference_id])).code, 200);
    assert.deepEqual(await linked(iloId), [used.reference_id]);

    // But a newly archived one cannot be added, and nothing changes when the save is refused.
    const refused = await assign(iloId, [used.reference_id, other.reference_id]);
    assert.equal(refused.code, 400);
    assert.deepEqual(refused.body.archived, [other.reference_id]);
    assert.deepEqual(await linked(iloId), [used.reference_id]);

    // Unarchived, it can be linked again.
    await call(DIRECTOR, 'PUT', `/${other.reference_id}/unarchive`);
    assert.equal((await assign(iloId, [used.reference_id, other.reference_id])).code, 200);
    assert.equal((await linked(iloId)).length, 2);
});

test('the plan reference summary groups by exact type, including online subscriptions', async () => {
    const iloId = await planWithIlo();
    const made = {};
    for (const type of TYPE_KEYS) made[type] = await create(type);
    assert.equal((await assign(iloId, Object.values(made).map(r => r.reference_id))).code, 200);

    const res = { code: 200, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
    await getReferenceSummary({ params: { pcId: String(planWithIlo.lastOffering) } }, res, err => { throw err; });
    assert.deepEqual(Object.keys(res.body).sort(), ['Online Resources', 'Online Subscriptions', 'Open Educational Resources', 'references', 'Textbook'].sort());
    // The plan also carries the references copied from the seeded plan; look at the four just added.
    const mine = (group) => res.body[group].filter(r => Object.values(made).some(m => m.title === r.title));
    assert.deepEqual(mine('Textbook').map(r => r.title), [made.Textbook.title]);
    assert.deepEqual(mine('Open Educational Resources').map(r => r.title), [made.OER.title]);
    assert.deepEqual(mine('Online Resources').map(r => r.title), [made['Online Resource'].title]);
    assert.deepEqual(mine('Online Subscriptions').map(r => [r.title, r.publisher]), [[made['Online Subscription'].title, 'O’Reilly Media']]);
    assert.ok(res.body.references.length >= 4);
    assert.equal(res.body['Online Subscriptions'][0].type, 'Online Subscriptions');
});

// ------------------------------------------------------------------------ import

test('import: dry run previews every row, commit creates the valid ones, duplicates and bad rows are reported', async () => {
    const good = withTitle('Textbook');
    const rows = [
        good,
        { ...withTitle('OER'), link: 'not a link' },
        { type: 'Journal', title: 'Whatever' },
        { ...good },
        { ...withTitle('Online Subscription') },
        { ...GOOD.Textbook, title: (await create('Textbook')).title, authors: 'Silberschatz' }
    ];
    // Row 6 duplicates a reference that already exists (case and spacing do not matter).
    rows[5] = { ...rows[5], title: rows[5].title.toUpperCase() };

    const before = await Reference.count();
    const preview = await (await call(DIRECTOR, 'POST', '/import', { rows, dryRun: true })).json();
    assert.equal(preview.dryRun, true);
    assert.deepEqual(preview.rows.map(r => r.status), ['ok', 'invalid', 'invalid', 'duplicate', 'ok', 'duplicate']);
    assert.deepEqual(Object.keys(preview.rows[1].errors), ['link']);
    assert.deepEqual(preview.rows[2].errors, { type: 'Unknown reference type.' });
    assert.deepEqual([preview.total, preview.valid, preview.invalid, preview.duplicates, preview.created], [6, 2, 2, 2, 0]);
    assert.equal(await Reference.count(), before, 'a dry run writes nothing');

    const response = await call(DIRECTOR, 'POST', '/import', { rows });
    assert.equal(response.status, 201);
    const result = await response.json();
    assert.deepEqual(result.rows.map(r => r.status), ['created', 'invalid', 'invalid', 'duplicate', 'created', 'duplicate']);
    assert.equal(result.created, 2);
    assert.equal(await Reference.count(), before + 2);
    const createdIds = result.rows.filter(r => r.referenceId).map(r => r.referenceId);
    for (const id of createdIds) {
        const [entry] = await auditFor('REFERENCE_CREATED', id);
        assert.equal(JSON.parse(entry.details).via, 'import');
    }

    // Running it again changes nothing: everything valid is now a duplicate.
    const again = await (await call(DIRECTOR, 'POST', '/import', { rows })).json();
    assert.equal(again.created, 0);
    assert.equal(await Reference.count(), before + 2);
});

test('import limits: rows must be a non-empty array of at most 1000', async () => {
    assert.equal((await call(DIRECTOR, 'POST', '/import', {})).status, 400);
    assert.equal((await call(DIRECTOR, 'POST', '/import', { rows: [] })).status, 400);
    assert.equal((await call(DIRECTOR, 'POST', '/import', { rows: new Array(1001).fill({}) })).status, 400);
});

// --------------------------------------------------------------------- migration

test('migration: adds the columns, maps legacy types exactly, leaves unknown ones alone, is repeatable', async () => {
    const db = new SequelizeLib({ dialect: 'sqlite', storage: ':memory:', logging: false });
    const qi = db.getQueryInterface();
    await db.query('CREATE TABLE `References` (reference_id INTEGER PRIMARY KEY, title TEXT, type VARCHAR(30) NOT NULL)');
    const legacy = ['TEXTBOOK', 'ONLINE', 'OER', 'Online Resources', 'Open Educational Resources', 'Textbook', 'Mystery Medium', 'textbook ', 'Online Subscription'];
    for (const type of legacy) await db.query('INSERT INTO `References` (title, type) VALUES (?, ?)', { replacements: [type, type] });

    const warn = console.warn;
    const warnings = [];
    console.warn = (...a) => warnings.push(a.join(' '));
    try { await migration.up(qi); await migration.up(qi); } finally { console.warn = warn; }

    const [rows] = await db.query('SELECT title, type FROM `References` ORDER BY reference_id');
    assert.deepEqual(rows.map(r => r.type), ['Textbook', 'Online Resource', 'OER', 'Online Resource', 'OER', 'Textbook', 'Mystery Medium', 'Textbook', 'Online Subscription']);
    const [columns] = await db.query('PRAGMA table_info(`References`)');
    for (const name of ['archived', 'created_by', 'publisher']) assert.ok(columns.some(c => c.name === name), name);
    const [[archived]] = await db.query('SELECT archived FROM `References` LIMIT 1');
    assert.equal(archived.archived, 0, 'existing references start active');
    assert.ok(warnings.some(w => w.includes('Mystery Medium')), 'unmapped types are reported');

    await migration.down(qi);
    const [after] = await db.query('PRAGMA table_info(`References`)');
    assert.ok(!after.some(c => c.name === 'archived'));
    await db.close();
});

test('the real test database has only valid types after migrating (the seeds were normalized)', async () => {
    const rows = await sequelize.query('SELECT DISTINCT type FROM `References`', { type: Sequelize.QueryTypes.SELECT });
    for (const { type } of rows) assert.ok(isReferenceType(type), `unclassified type in the seeded data: ${type}`);
    assert.ok(User, 'models loaded');
});
