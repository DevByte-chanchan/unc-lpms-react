'use strict';

// Who may open the review record of a plan (GET /api/assignments/offering/:pcId/review-record), and
// which comments it holds for each role. Runs against the test database (node run-tests.js): it makes
// its own department, program, course and two offerings (one pending, one approved), and removes them.
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { sequelize, Sequelize } = require('../models');
const { requireOfferingAccess } = require('../middleware/courseAuthorization');
const { getReviewRecord } = require('../controllers/reviewRecordController');
const assignmentRoutes = require('../routes/assignments');

const ID = { instructor: 9001, programHead: 9002, director: 9003, consultant: 9004, dean: 9005, vpaa: 9006,
             otherInstructor: 9101, otherProgramHead: 9102, otherConsultant: 9104, otherDean: 9105 };

const insert = async (sql, replacements) => (await sequelize.query(sql, { replacements, type: Sequelize.QueryTypes.INSERT }))[0];
const created = { assignments: [], offerings: [] };
let pending;
let approved;
let server;
let base;

test.before(async () => {
    const dept = await insert('INSERT INTO Departments (name, code, stakeholder_id, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
        ['ZZ access test dept', 'ZZA', ID.dean, new Date(), new Date()]);
    const program = await insert('INSERT INTO Programs (dept_id, name, stakeholder_id, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
        [dept, 'ZZ access test program', ID.programHead, new Date(), new Date()]);
    const course = await insert(`INSERT INTO Courses (course_no, course_title, credit, contact_hrs, classification, cmo, year_lvl, term, createdAt, updatedAt)
                                 VALUES ('ZZA100', 'Access test', '3', '3', 'x', 'x', 'FIRST YEAR', '1st', ?, ?)`, [new Date(), new Date()]);
    created.dept = dept; created.program = program; created.course = course;
    await insert('INSERT INTO CourseConsultants (course_id, consultant_user_id, is_active, createdAt, updatedAt) VALUES (?, ?, 1, ?, ?)',
        [course, ID.consultant, new Date(), new Date()]);

    const makeOffering = async (approvedAt) => {
        const offering = await insert(`INSERT INTO ProgramCourseOfferings (course_id, program_id, dept_id, course_description, approved_at, createdAt, updatedAt)
                                       VALUES (?, ?, ?, 'x', ?, ?, ?)`, [course, program, dept, approvedAt, new Date(), new Date()]);
        const assignment = await insert('INSERT INTO CourseOfferingAssignments (pc_offering_id, stakeholder_id, createdAt, updatedAt) VALUES (?, ?, ?, ?)',
            [offering, ID.instructor, new Date(), new Date()]);
        const comment = (role, userId, forWhat, message) => insert(
            `INSERT INTO Comments (commenter_role, commenter_user_id, message, co_assign_id, comment_for, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [role, userId, message, assignment, forWhat, new Date(), new Date()]);
        await comment('PROGRAM_HEAD', ID.programHead, 'topics', 'program head on topics');
        await comment('DEAN', ID.dean, 'tlas', 'dean on activities');
        await comment('LIBRARY_DIRECTOR', ID.director, 'references', 'director on references');
        await comment('INDUSTRY_CONSULTANT', ID.consultant, 'topics', 'consultant on topics');
        created.offerings.push(offering); created.assignments.push(assignment);
        return offering;
    };
    pending = await makeOffering(null);
    approved = await makeOffering(new Date('2026-01-01T00:00:00Z'));

    const app = express();
    app.use((req, res, next) => {
        const [id, role] = String(req.get('x-user') || '').split(':');
        req.user = id ? { id: Number(id), role } : undefined;
        next();
    });
    // The assignments router signs requests in with a session cookie before this route; the test stands in
    // for that sign-in (req.user above) and mounts the same two handlers the router gives the route.
    app.get('/api/assignments/offering/:pcId/review-record', requireOfferingAccess, getReviewRecord);
    await new Promise(resolve => { server = app.listen(0, resolve); });
    base = `http://127.0.0.1:${server.address().port}/api/assignments`;
});

test.after(async () => {
    server.close();
    const list = (ids) => ids.join(', ');
    if (created.assignments.length) await sequelize.query(`DELETE FROM Comments WHERE co_assign_id IN (${list(created.assignments)})`);
    if (created.assignments.length) await sequelize.query(`DELETE FROM CourseOfferingAssignments WHERE co_assign_id IN (${list(created.assignments)})`);
    if (created.offerings.length) await sequelize.query(`DELETE FROM ProgramCourseOfferings WHERE pc_offering_id IN (${list(created.offerings)})`);
    if (created.course) {
        await sequelize.query('DELETE FROM CourseConsultants WHERE course_id = ?', { replacements: [created.course] });
        await sequelize.query('DELETE FROM Courses WHERE course_id = ?', { replacements: [created.course] });
    }
    if (created.program) await sequelize.query('DELETE FROM Programs WHERE program_id = ?', { replacements: [created.program] });
    if (created.dept) await sequelize.query('DELETE FROM Departments WHERE dept_id = ?', { replacements: [created.dept] });
});

const open = async (who, offering) => {
    const res = await fetch(`${base}/offering/${offering}/review-record`, { headers: { 'x-user': who } });
    const body = res.status === 200 ? await res.json() : null;
    return { status: res.status, messages: body ? body.comments.map(c => c.message).sort() : null };
};

const OWNERS = [
    [`${ID.instructor}:instructor`, 'the course instructor'],
    [`${ID.programHead}:program-head`, "the program's Program Head"],
    [`${ID.dean}:dean`, "the department's Dean"],
    [`${ID.director}:director-of-libraries`, 'the Director of Libraries (institution-wide)'],
    [`${ID.consultant}:industry-consultant`, 'the consultant assigned to the course']
];
const OUTSIDERS = [
    [`${ID.otherInstructor}:instructor`, 'another instructor'],
    [`${ID.otherProgramHead}:program-head`, "another program's Program Head"],
    [`${ID.otherDean}:dean`, "another department's Dean"],
    [`${ID.otherConsultant}:industry-consultant`, 'a consultant not assigned to the course']
];
const VPAA = `${ID.vpaa}:vpaa`;

test('the people on a plan can open its record, and outsiders get 403, whatever the plan state', async () => {
    for (const offering of [pending, approved]) {
        for (const [who, label] of OWNERS) assert.equal((await open(who, offering)).status, 200, `${label} (offering ${offering})`);
        for (const [who, label] of OUTSIDERS) assert.equal((await open(who, offering)).status, 403, `${label} (offering ${offering})`);
    }
});

test('the VPAA can open the record of an approved plan only', async () => {
    assert.equal((await open(VPAA, approved)).status, 200);
    assert.equal((await open(VPAA, pending)).status, 403);
});

const ALL = ['consultant on topics', 'dean on activities', 'director on references', 'program head on topics'];

test('under review, an approver gets only their own comments; the instructor gets them all', async () => {
    assert.deepEqual((await open(`${ID.instructor}:instructor`, pending)).messages, ALL);
    assert.deepEqual((await open(`${ID.programHead}:program-head`, pending)).messages, ['program head on topics']);
    assert.deepEqual((await open(`${ID.dean}:dean`, pending)).messages, ['dean on activities']);
    assert.deepEqual((await open(`${ID.director}:director-of-libraries`, pending)).messages, ['director on references']);
    assert.deepEqual((await open(`${ID.consultant}:industry-consultant`, pending)).messages, ['consultant on topics']);
});

test('once approved, the instructor, Program Head, Dean and VPAA get the whole record', async () => {
    for (const who of [`${ID.instructor}:instructor`, `${ID.programHead}:program-head`, `${ID.dean}:dean`, VPAA]) {
        assert.deepEqual((await open(who, approved)).messages, ALL, who);
    }
});

test('once approved, the Director and the Consultant get the whole record of only their part', async () => {
    assert.deepEqual((await open(`${ID.director}:director-of-libraries`, approved)).messages, ['director on references']);
    assert.deepEqual((await open(`${ID.consultant}:industry-consultant`, approved)).messages,
        ['consultant on topics', 'dean on activities', 'program head on topics']);
});

test('the real router serves the record through the same two handlers, behind its sign-in', () => {
    const layer = assignmentRoutes.stack.find(l => l.route && l.route.path === '/offering/:pcId/review-record');
    assert.ok(layer, 'the route exists');
    const handlers = layer.route.stack.map(l => l.handle);
    assert.deepEqual(handlers, [requireOfferingAccess, getReviewRecord]);
    assert.equal(assignmentRoutes.stack.findIndex(l => !l.route && l.handle.name === 'requireAuth' || (!l.route && l.handle === require('../middleware/auth').requireAuth)) , 0, 'the router signs requests in first');
});

test('no signed-in user gets a record', async () => {
    const res = await fetch(`${base}/offering/${pending}/review-record`);
    assert.notEqual(res.status, 200);
});
