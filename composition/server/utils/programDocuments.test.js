'use strict';

// The Program Head's program documents (front pages PDF, PO / PEO spreadsheet import) and the Director's per-course
// references. Runs against the test database (node run-tests.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { User, sequelize, Sequelize } = require('../models');
const { textPdf } = require('./testPdf');

// Small real PDFs: the uploads read them (utils/documentScan.js frontPagesProblem / courseDocumentProblem).
const FRONT_PDF = textPdf([[[50, 780, 'UNIVERSITY VISION STATEMENT'], [50, 760, 'Our vision is to be the top university.'], [50, 730, 'MISSION STATEMENT'],
    [50, 710, 'Our mission is to expand opportunities.'], [50, 680, 'PROGRAM EDUCATIONAL OBJECTIVES (PEOs)'], [50, 660, '1. Utilize competently the acquired skills.'],
    [50, 630, 'PROGRAM OUTCOMES (POs)'], [50, 610, 'PO1 Apply knowledge of computing.']]]);
const COAEP_PDF = textPdf([[[40, 780, 'Course Outcome Statement'], [200, 780, 'Intended Learning Outcome'], [360, 780, 'Assessment Tool'], [470, 780, 'Performance Target'],
    [40, 750, '1 Explain the core concepts.'], [200, 750, 'Describe the parts.'], [360, 750, 'Quiz'], [470, 750, '70% get 70%'],
    [200, 720, 'Apply the parts.'], [360, 720, 'Project'], [470, 720, '70% get 70%']]]);
const OTHER_PDF = textPdf([[[50, 780, 'The United Nations: from the Atlantic Charter of 1941 to 2026.'], [50, 760, 'Group 2 report on non-state actors of globalization.']]]);

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
    const pdf = FRONT_PDF;
    assert.equal((await call(other, 'PUT', `/program-outcomes/${programId}/front-pages`, { raw: pdf })).status, 403);
    assert.equal((await call(head, 'PUT', `/program-outcomes/${programId}/front-pages`, { raw: Buffer.from('hello') })).status, 400);
    const wrong = await call(head, 'PUT', `/program-outcomes/${programId}/front-pages`, { raw: OTHER_PDF });
    assert.equal(wrong.status, 400, 'a PDF that is not the front pages');
    assert.match((await wrong.json()).error, /does not look like the front pages: the vision statement/);
    const long = textPdf(Array.from({ length: 7 }, () => [[50, 780, 'VISION MISSION PROGRAM EDUCATIONAL OBJECTIVES PROGRAM OUTCOMES and a few more words here']]));
    assert.match((await (await call(head, 'PUT', `/program-outcomes/${programId}/front-pages`, { raw: long })).json()).error, /at most 6\. This PDF has 7 pages/);
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
    const pdf = COAEP_PDF;

    assert.equal((await call(other, 'PUT', `/course-documents/${pcId}/coaep`, { raw: pdf })).status, 403, 'another program head');
    assert.equal((await call(head, 'PUT', `/course-documents/${pcId}/coaep`, { raw: Buffer.from('<html>') })).status, 400, 'not PDF or Excel');
    assert.equal((await call(head, 'PUT', `/course-documents/${pcId}/syllabus`, { raw: pdf })).status, 400, 'unknown kind');
    const wrong = await call(head, 'PUT', `/course-documents/${pcId}/coaep`, { raw: OTHER_PDF });
    assert.equal(wrong.status, 400, 'a PDF that is not a COAEP');
    assert.match((await wrong.json()).error, /does not look like a COAEP/);
    assert.equal((await call(head, 'PUT', `/course-documents/${pcId}/co-po`, { raw: COAEP_PDF })).status, 400, 'a COAEP is not a CO and PO alignment');
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
