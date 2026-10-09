'use strict';

// /api/program-outcomes: the program's PEOs (with their mission mark) and program outcomes with the
// PEO / graduate-attribute marks. Runs against the test database (node run-tests.js); every test
// builds its own program so it never touches the seeded ones.
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { sequelize, Sequelize, User, Program, ProgramOutcome, ProgramEducationalObjective, AuditLog } = require('../models');

const stamp = Date.now();
let counter = 0;
const insert = async (table, row) => {
    const keys = Object.keys(row);
    const [id] = await sequelize.query(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')});`, {
        replacements: keys.map(k => row[k]), type: Sequelize.QueryTypes.INSERT
    });
    return id;
};
const makeUser = (role) => User.create({ name: `${role} ${++counter}`, email: `po${counter}.${stamp}@example.test`, role, password_hash: 'x' });

// A program with its Program Head and two outcomes; the first one has a course outcome aligned to it.
const fixture = async () => {
    const [ph, dean] = await Promise.all([makeUser('program-head'), makeUser('dean')]);
    const now = new Date().toISOString();
    const stamps = { createdAt: now, updatedAt: now };
    const deptId = await insert('Departments', { stakeholder_id: dean.user_id, name: `PO Dept ${counter}.${stamp}`, code: `P${counter}`, ...stamps });
    const programId = await insert('Programs', { dept_id: deptId, name: `PO Program ${counter}.${stamp}`, stakeholder_id: ph.user_id, ...stamps });
    const used = await ProgramOutcome.create({ program_id: programId, description: 'Used outcome', peo_numbers: '[1]', ga_numbers: '[2]' });
    const free = await ProgramOutcome.create({ program_id: programId, description: 'Free outcome' });
    await ProgramEducationalObjective.create({ program_id: programId, statement: 'First PEO', mission_aligned: true });
    const courseId = await insert('Courses', { course_no: `PO${counter}${String(stamp).slice(-4)}`, course_title: 'PO Test', credit: 3, contact_hrs: 3, classification: 'Core', cmo: 'CMO', year_lvl: 1, term: '1st', ...stamps });
    const offeringId = await insert('ProgramCourseOfferings', { revision_number: 0, course_id: courseId, program_id: programId, dept_id: deptId, course_description: 'x', school_year: '2097-2098', semester: '1st', ...stamps });
    const coId = await insert('CourseOutcomes', { pc_offering_id: offeringId, co_description: 'CO', ...stamps });
    await insert('ProgramOutcomeAlignments', { co_id: coId, po_id: used.po_id, attainment_level: 'I', ...stamps });
    return { ph, dean, programId, used, free, offeringId };
};

let server;
let base;
test.before(async () => {
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => { req.user = { id: Number(req.headers['x-id']), name: 'T', role: req.headers['x-role'] || 'instructor' }; next(); });
    app.use('/api/program-outcomes', require('../routes/programOutcomes'));
    await new Promise(resolve => { server = app.listen(0, resolve); });
    base = `http://127.0.0.1:${server.address().port}/api/program-outcomes`;
});
test.after(() => server.close());

const call = (as, method, path = '', body) => fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-id': String(as.user_id), 'x-role': as.role },
    body: body ? JSON.stringify(body) : undefined
});

test('everyone can read a program; a Program Head lists only their own and can edit only those', async () => {
    const f = await fixture();
    const other = await fixture();

    const mine = await (await call(f.ph, 'GET', '/programs')).json();
    assert.deepEqual(mine.programs.map(p => [p.id, p.outcomes]), [[f.programId, 2]]);
    const all = await (await call(f.dean, 'GET', '/programs')).json();
    assert.ok(all.programs.some(p => p.id === f.programId) && all.programs.some(p => p.id === other.programId));

    const asPh = await (await call(f.ph, 'GET', `/${f.programId}`)).json();
    assert.equal(asPh.canEdit, true);
    assert.deepEqual(asPh.peos.map(p => p.statement), ['First PEO']);
    assert.deepEqual(asPh.outcomes.map(o => [o.text, o.peos, o.gas]), [['Used outcome', [1], [2]], ['Free outcome', [], []]]);
    assert.equal((await (await call(f.dean, 'GET', `/${f.programId}`)).json()).canEdit, false);
    assert.equal((await (await call(other.ph, 'GET', `/${f.programId}`)).json()).canEdit, false, 'another program head');
    assert.equal((await call(f.ph, 'GET', '/999999')).status, 404);
});

test('only the Program Head of the program can save', async () => {
    const f = await fixture();
    const other = await fixture();
    const body = { peos: [], outcomes: [] };
    assert.equal((await call(f.dean, 'PUT', `/${f.programId}`, body)).status, 403);
    assert.equal((await call({ user_id: f.ph.user_id, role: 'instructor' }, 'PUT', `/${f.programId}`, body)).status, 403);
    assert.equal((await call(other.ph, 'PUT', `/${f.programId}`, body)).status, 403, 'a Program Head of another program');
    assert.equal((await call(f.ph, 'PUT', '/999999', body)).status, 404);
    assert.equal((await ProgramOutcome.count({ where: { program_id: f.programId } })), 2, 'nothing changed');
});

test('save rejects bad input and changes nothing', async () => {
    const f = await fixture();
    const outcome = (extra) => ({ id: f.used.po_id, text: 'Used outcome', peos: [], gas: [], ...extra });
    const bad = [
        [{ peos: [{ statement: ' ' }], outcomes: [outcome()] }, 'empty PEO'],
        [{ peos: [{ statement: 'x'.repeat(501) }], outcomes: [outcome()] }, 'long PEO'],
        [{ peos: [{ statement: 'A' }], outcomes: [outcome({ text: '' })] }, 'empty outcome'],
        [{ peos: [{ statement: 'A' }], outcomes: [outcome({ text: 'x'.repeat(201) })] }, 'long outcome'],
        [{ peos: [{ statement: 'A' }], outcomes: [outcome({ peos: [2] })] }, 'PEO that does not exist'],
        [{ peos: [{ statement: 'A' }], outcomes: [outcome({ gas: [5] })] }, 'invalid graduate attribute'],
        [{ peos: [{ statement: 'A' }], outcomes: [outcome(), outcome()] }, 'listed twice'],
        [{ peos: [{ statement: 'A' }], outcomes: [outcome({ id: 999999 })] }, 'not this program'],
        [{ peos: 'x', outcomes: [] }, 'not arrays']
    ];
    for (const [body, label] of bad) assert.equal((await call(f.ph, 'PUT', `/${f.programId}`, body)).status, 400, label);
    assert.equal((await ProgramEducationalObjective.count({ where: { program_id: f.programId } })), 1);
    assert.equal((await ProgramOutcome.findByPk(f.used.po_id)).description, 'Used outcome');
});

test('save replaces the PEOs, edits outcomes in place, appends new ones and is audited', async () => {
    const f = await fixture();
    const res = await call(f.ph, 'PUT', `/${f.programId}`, {
        peos: [{ statement: ' New PEO 1 ', missionAligned: true }, { statement: 'New PEO 2', missionAligned: false }],
        outcomes: [
            { id: f.used.po_id, text: 'Used, reworded', peos: [2, 1, 1], gas: [4, 1] },
            { id: f.free.po_id, text: 'Free outcome', peos: [], gas: [] },
            { text: 'Brand new', peos: [2], gas: [3] }
        ]
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.peos.map(p => [p.statement, p.missionAligned]), [['New PEO 1', true], ['New PEO 2', false]]);
    assert.deepEqual(body.outcomes.map(o => [o.text, o.peos, o.gas]), [['Used, reworded', [1, 2], [1, 4]], ['Free outcome', [], []], ['Brand new', [2], [3]]]);
    assert.equal(body.outcomes[0].id, f.used.po_id, 'the outcome keeps its id, so its CO alignment survives');
    const audit = await AuditLog.findAll({ where: { action: 'PROGRAM_OUTCOMES_UPDATE', entity_id: String(f.programId) } });
    assert.equal(audit.length, 1);
    assert.equal(audit[0].actor_user_id, f.ph.user_id);
});

test('an outcome that course outcomes are aligned to cannot be removed; an unused one can', async () => {
    const f = await fixture();
    const keepUsed = { id: f.used.po_id, text: 'Used outcome', peos: [], gas: [] };

    const refused = await call(f.ph, 'PUT', `/${f.programId}`, { peos: [], outcomes: [{ id: f.free.po_id, text: 'Free outcome', peos: [], gas: [] }] });
    assert.equal(refused.status, 409);
    assert.match((await refused.json()).error, /already aligned/);
    assert.equal(await ProgramOutcome.count({ where: { program_id: f.programId } }), 2, 'nothing was removed');
    assert.equal(await ProgramEducationalObjective.count({ where: { program_id: f.programId } }), 1, 'the PEOs were not replaced either');

    const ok = await call(f.ph, 'PUT', `/${f.programId}`, { peos: [], outcomes: [keepUsed] });
    assert.equal(ok.status, 200);
    assert.equal(await ProgramOutcome.count({ where: { program_id: f.programId } }), 1);
});

test('the program data of an offering (with its department) goes to people who can open that course only', async () => {
    const f = await fixture();
    const other = await fixture();
    const res = await call(f.ph, 'GET', `/offering/${f.offeringId}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.program.id, f.programId);
    assert.match(body.program.department, /^PO Dept /);
    assert.deepEqual(body.peos.map(p => p.statement), ['First PEO']);
    assert.equal(body.outcomes.length, 2);
    assert.equal((await call(other.ph, 'GET', `/offering/${f.offeringId}`)).status, 403, 'another program head');
    assert.equal((await call(f.ph, 'GET', '/offering/999999')).status, 404);
});
