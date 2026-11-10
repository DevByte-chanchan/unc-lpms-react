'use strict';

// The Program Head's program documents (front pages PDF, PO / PEO spreadsheet import) and the Director's per-course
// references. Runs against the test database (node run-tests.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { User, sequelize, Sequelize } = require('../models');

const select = (sql, r = []) => sequelize.query(sql, { replacements: r, type: Sequelize.QueryTypes.SELECT });
let server;
let base;
let head;
let other;
let director;
let programId;
test.before(async () => {
    const stamp = Date.now();
    head = await User.create({ name: 'DOCS, HEAD', email: `docs.head.${stamp}@unc.edu.ph`, role: 'program-head', password_hash: 'x' });
    other = await User.create({ name: 'DOCS, OTHER', email: `docs.other.${stamp}@unc.edu.ph`, role: 'program-head', password_hash: 'x' });
    director = await User.create({ name: 'DOCS, LIB', email: `docs.lib.${stamp}@unc.edu.ph`, role: 'director-of-libraries', password_hash: 'x' });
    const now = new Date();
    await sequelize.getQueryInterface().bulkInsert('Programs', [{ dept_id: 3, name: `Docs Program ${stamp}`, stakeholder_id: head.user_id, createdAt: now, updatedAt: now }]);
    programId = (await select('SELECT program_id FROM Programs WHERE stakeholder_id = ?', [head.user_id]))[0].program_id;

    const app = express();
    app.use(express.json());
    app.use((req, res, next) => { req.user = { id: Number(req.headers['x-id']), name: 'T', role: req.headers['x-role'] }; next(); });
    app.use('/api/program-outcomes', require('../routes/programOutcomes'));
    app.use('/api/course-references', require('../routes/courseReferences'));
    app.use('/api/course-documents', require('../routes/courseDocuments'));
    await new Promise(resolve => { server = app.listen(0, resolve); });
    base = `http://127.0.0.1:${server.address().port}/api`;
});
test.after(() => server.close());

const call = (as, method, path, { json, raw } = {}) => fetch(base + path, {
    method,
    headers: { 'x-id': String(as.user_id), 'x-role': as.role, 'Content-Type': raw ? 'application/octet-stream' : 'application/json' },
    body: raw || (json ? JSON.stringify(json) : undefined),
});

test('front pages: only the program\'s head uploads, only a PDF, and anyone can read it back', async () => {
    const pdf = Buffer.from('%PDF-1.4\n% a tiny stand-in\n');
    assert.equal((await call(other, 'PUT', `/program-outcomes/${programId}/front-pages`, { raw: pdf })).status, 403);
    assert.equal((await call(head, 'PUT', `/program-outcomes/${programId}/front-pages`, { raw: Buffer.from('hello') })).status, 400);
    assert.equal((await call(head, 'PUT', `/program-outcomes/${programId}/front-pages`, { raw: pdf })).status, 201);
    const back = await call(other, 'GET', `/program-outcomes/${programId}/front-pages`);
    assert.equal(back.status, 200);
    assert.equal(back.headers.get('content-type'), 'application/pdf');
    assert.deepEqual(Buffer.from(await back.arrayBuffer()), pdf);
    assert.equal((await call(head, 'DELETE', `/program-outcomes/${programId}/front-pages`)).status, 200);
    assert.equal((await call(head, 'GET', `/program-outcomes/${programId}/front-pages`)).status, 204, 'none uploaded');
});

test('PO / PEO import: the downloadable template reads back as PEOs and POs, without saving', async () => {
    const template = Buffer.from(await (await call(head, 'GET', '/program-outcomes/template.xlsx')).arrayBuffer());
    const res = await call(head, 'POST', `/program-outcomes/${programId}/import`, { raw: template });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.peos.length, 1);
    assert.equal(body.peos[0].missionAligned, true);
    assert.deepEqual(body.outcomes[0].peos, [1], 'PEO2 is ticked in the template but the sheet has one PEO');
    assert.deepEqual(body.outcomes[0].gas, [2, 3, 4], 'CL, ERC, LL');
    assert.equal((await select('SELECT COUNT(*) AS n FROM ProgramOutcomes WHERE program_id = ?', [programId]))[0].n, 0, 'nothing saved');
    assert.equal((await call(head, 'POST', `/program-outcomes/${programId}/import`, { raw: Buffer.from('nope') })).status, 400);
});

test('course references: the Director files references under a course; others only read', async () => {
    const tree = await (await call(director, 'GET', '/course-references/tree')).json();
    const course = tree.departments.flatMap(d => d.programs).flatMap(p => p.courses)[0];
    assert.ok(course, 'the tree has courses');
    const [reference] = await select('SELECT reference_id FROM `References` LIMIT 1');
    assert.equal((await call(head, 'POST', `/course-references/${course.id}`, { json: { reference_id: reference.reference_id } })).status, 403);
    assert.equal((await call(director, 'POST', `/course-references/${course.id}`, { json: { reference_id: reference.reference_id } })).status, 201);
    assert.equal((await call(director, 'POST', `/course-references/${course.id}`, { json: { reference_id: reference.reference_id } })).status, 200, 'filed once');
    const listed = await (await call(head, 'GET', `/course-references/${course.id}`)).json();
    const filedUnder = await (await call(head, 'GET', `/course-references/by-reference/${reference.reference_id}`)).json();
    assert.ok(filedUnder.courses.some(c => c.course_id === course.id));
    assert.deepEqual(listed.references.map(r => r.reference_id), [reference.reference_id]);
    assert.equal((await call(director, 'DELETE', `/course-references/${course.id}/${reference.reference_id}`)).status, 200);
    assert.equal((await (await call(director, 'GET', `/course-references/${course.id}`)).json()).references.length, 0);
});

test('course documents: the program head uploads a PDF or Excel CO-PO / COAEP file; the bytes decide the type', async () => {
    const now = new Date();
    const [course] = await select('SELECT course_id FROM Courses LIMIT 1');
    await sequelize.getQueryInterface().bulkInsert('ProgramCourseOfferings', [{
        revision_number: 0, course_id: course.course_id, program_id: programId, dept_id: 3, course_description: 'x',
        school_year: '2030-2031', semester: '1st', createdAt: now, updatedAt: now,
    }]);
    const [{ pc_offering_id: pcId }] = await select('SELECT pc_offering_id FROM ProgramCourseOfferings WHERE program_id = ?', [programId]);
    const pdf = Buffer.from('%PDF-1.4\n%coaep\n');

    assert.equal((await call(other, 'PUT', `/course-documents/${pcId}/coaep`, { raw: pdf })).status, 403, 'another program head');
    assert.equal((await call(head, 'PUT', `/course-documents/${pcId}/coaep`, { raw: Buffer.from('<html>') })).status, 400, 'not PDF or Excel');
    assert.equal((await call(head, 'PUT', `/course-documents/${pcId}/syllabus`, { raw: pdf })).status, 400, 'unknown kind');
    const put = await call(head, 'PUT', `/course-documents/${pcId}/coaep`, { raw: pdf });
    assert.equal(put.status, 201);
    assert.equal((await put.json()).contentType, 'application/pdf');

    const info = await (await call(head, 'GET', `/course-documents/${pcId}`)).json();
    assert.equal(info['co-po'], null);
    assert.equal(info.coaep.contentType, 'application/pdf');
    const file = await call(head, 'GET', `/course-documents/${pcId}/coaep`);
    assert.deepEqual(Buffer.from(await file.arrayBuffer()), pdf);

    assert.equal((await call(head, 'DELETE', `/course-documents/${pcId}/coaep`)).status, 200);
    assert.equal((await call(head, 'GET', `/course-documents/${pcId}/coaep`)).status, 404);
});
