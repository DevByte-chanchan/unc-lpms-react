'use strict';

// Course Assignment: the registrar's Subject Offerings export, and the pre-assignment compared with it.
// Runs against the test database (node run-tests.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { User, sequelize, Sequelize } = require('../models');
const service = require('../services/offeringService');
const so = require('./subjectOfferings');

const FIXTURE = fs.readFileSync(path.join(__dirname, 'fixtures', 'CS_26271-Course-OFferings.xls'));
const parsed = so.parseSubjectOfferings(so.readWorkbook(FIXTURE));

test('the Subject Offerings export: term from the title row, one section per block, lab rows folded in', () => {
    assert.equal(parsed.schoolYear, '2026-2027');
    assert.equal(parsed.semester, '1st');
    const bit111 = parsed.sections.filter(s => s.courseNo === 'BIT111L');
    assert.deepEqual(bit111.map(s => s.section), ['OBa', 'OBb', 'OBc', 'OBd'], 'lab rows (OBaL) are not sections');
    const oop = parsed.sections.find(s => s.courseNo === 'BIT213L' && s.section === 'OBa');
    assert.deepEqual(oop.faculty, ['CASIMERO DANNY BOY'], 'the faculty on the lab row belongs to the block');
    assert.equal(so.parseSubjectOfferings([['just', 'a', 'table']]), null);
});

test('names: LPMS "SURNAME, FIRST" against the export\'s "SURNAME FIRST MIDDLE"', () => {
    assert.equal(so.sameName('CASIMERO, DANNY BOY', 'CASIMERO DANNY BOY'), true);
    assert.equal(so.sameName('ALEGRE, AMY', 'ALEGRE AMY A.'), true);
    assert.equal(so.sameName('DANILA, JUNAR', 'DANILA MARIA ARKA'), false);
});

const select = (sql, r = []) => sequelize.query(sql, { replacements: r, type: Sequelize.QueryTypes.SELECT });
let server;
let base;
let head;
let ana;
let danny;
test.before(async () => {
    const stamp = Date.now();
    head = await User.create({ name: 'HEAD, TEST', email: `ca.head.${stamp}@unc.edu.ph`, role: 'program-head', password_hash: 'x' });
    ana = await User.create({ name: 'REYES, ANA', email: `ca.ana.${stamp}@unc.edu.ph`, role: 'instructor', password_hash: 'x' });
    danny = await User.create({ name: 'VALEROS, ANDREW', email: `ca.danny.${stamp}@unc.edu.ph`, role: 'instructor', password_hash: 'x' });
    const now = new Date();
    await sequelize.getQueryInterface().bulkInsert('Programs', [{ dept_id: 3, name: `Test Program ${stamp}`, stakeholder_id: head.user_id, createdAt: now, updatedAt: now }]);
    const [program] = await select('SELECT program_id FROM Programs WHERE stakeholder_id = ?', [head.user_id]);
    // complete program documents: plans are only started for such a program (utils/programReadiness.js)
    await sequelize.getQueryInterface().bulkInsert('ProgramEducationalObjectives', [{ program_id: program.program_id, statement: 'PEO', mission_aligned: true, createdAt: now, updatedAt: now }]);
    await sequelize.getQueryInterface().bulkInsert('ProgramOutcomes', [{ program_id: program.program_id, description: 'PO', peo_numbers: '[1]', ga_numbers: '[]', createdAt: now, updatedAt: now }]);
    const course = async (no) => (await select('SELECT course_id FROM Courses WHERE course_no = ?', [no]))[0].course_id;
    const user = { id: head.user_id, name: head.name };
    // BIT311L pre-assigned to Ana for 2026-2027 1st; MATH311L only known from an earlier term (so not pre-assigned).
    await service.assignCourseForTerm({ courseId: await course('BIT311L'), programId: program.program_id, schoolYear: '2026-2027', semester: '1st', instructorUserId: ana.user_id, user });
    await service.assignCourseForTerm({ courseId: await course('MATH311L'), programId: program.program_id, schoolYear: '2025-2026', semester: '1st', instructorUserId: ana.user_id, user });

    const app = express();
    app.use(express.json());
    app.use((req, res, next) => { req.user = { id: Number(req.headers['x-id']), name: 'T', role: req.headers['x-role'] }; next(); });
    app.use('/api/course-assignments', require('../routes/courseAssignments'));
    await new Promise(resolve => { server = app.listen(0, resolve); });
    base = `http://127.0.0.1:${server.address().port}/api/course-assignments`;
});
test.after(() => server.close());

const call = (as, method, pathAndQuery, body, raw) => fetch(base + pathAndQuery, {
    method,
    headers: { 'x-id': String(as.user_id), 'x-role': as.role, ...(raw ? { 'Content-Type': 'application/octet-stream' } : { 'Content-Type': 'application/json' }) },
    body: raw || (body ? JSON.stringify(body) : undefined),
});
const TERM = '?school_year=2026-2027&semester=1st';
const rowFor = (list, no) => list.rows.find(r => r.course_no === no);

test('pre-assign, import the official list, compare, and switch to the official instructor', async () => {
    const before = await (await call(head, 'GET', TERM)).json();
    assert.equal(before.official, null);
    assert.equal(rowFor(before, 'BIT311L').status, 'assigned');
    assert.equal(rowFor(before, 'MATH311L').status, 'unassigned');

    assert.equal((await call(ana, 'GET', TERM)).status, 403, 'Program Head only');
    assert.equal((await call(head, 'POST', '/official?school_year=2025-2026&semester=1st', null, FIXTURE)).status, 400, 'the file is for another term');
    assert.equal((await call(head, 'POST', `/official${TERM}`, null, Buffer.from('not a spreadsheet'))).status, 400);

    const imported = await call(head, 'POST', `/official${TERM}`, null, FIXTURE);
    assert.equal(imported.status, 201);
    assert.deepEqual(await imported.json(), { sections: 7, courses: 2 }, 'only this program\'s courses are kept');

    const after = await (await call(head, 'GET', TERM)).json();
    const oop = rowFor(after, 'BIT311L');
    assert.equal(oop.status, 'different');
    assert.equal(oop.pre.instructor_name, 'REYES, ANA');
    assert.deepEqual(oop.suggested, { user_id: danny.user_id, name: 'VALEROS, ANDREW' });
    assert.equal(rowFor(after, 'MATH311L').status, 'official-only');

    assert.equal((await call(ana, 'PUT', `/${oop.pre.pc_offering_id}/instructor`, { instructor_user_id: danny.user_id })).status, 403);
    const switched = await call(head, 'PUT', `/${oop.pre.pc_offering_id}/instructor`, { instructor_user_id: danny.user_id });
    assert.equal(switched.status, 200);
    assert.equal(rowFor(await (await call(head, 'GET', TERM)).json(), 'BIT311L').status, 'match');

    // A re-import replaces the term's rows instead of adding to them.
    await call(head, 'POST', `/official${TERM}`, null, FIXTURE);
    assert.equal((await (await call(head, 'GET', TERM)).json()).official.sections, 7);
});
