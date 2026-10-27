'use strict';

// GET /api/assignments (the plan list) returns each role only the plans it may see: a Program Head the
// plans of the programs they head, a Dean those of their departments, the instructor their own, a
// Consultant the courses they are assigned to, the VPAA approved plans, the Director of Libraries all.
// Runs against the test database (node run-tests.js): it makes two departments, two programs and three
// offerings of its own, and removes them.
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { sequelize, Sequelize } = require('../models');
const { listAssignments } = require('../controllers/assignmentController');

const U = { deanA: 9201, deanB: 9202, headA: 9211, headB: 9212, instructorA: 9221, instructorB: 9222, consultantA: 9231, director: 9241, vpaa: 9251, nobody: 9299 };
const insert = async (sql, replacements) => (await sequelize.query(sql, { replacements, type: Sequelize.QueryTypes.INSERT }))[0];
const now = () => new Date();
const made = { assignments: [], offerings: [], courses: [], programs: [], depts: [] };
const offeringOf = {};
let server;
let base;

test.before(async () => {
    const dept = async (name, code, dean) => { const id = await insert('INSERT INTO Departments (name, code, stakeholder_id, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [name, code, dean, now(), now()]); made.depts.push(id); return id; };
    const program = async (deptId, name, head) => { const id = await insert('INSERT INTO Programs (dept_id, name, stakeholder_id, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [deptId, name, head, now(), now()]); made.programs.push(id); return id; };
    const course = async (no) => { const id = await insert(`INSERT INTO Courses (course_no, course_title, credit, contact_hrs, classification, cmo, year_lvl, term, createdAt, updatedAt) VALUES (?, 'Scope test', '3', '3', 'x', 'x', 'FIRST YEAR', '1st', ?, ?)`, [no, now(), now()]); made.courses.push(id); return id; };
    const offering = async (key, courseId, programId, deptId, instructor, approvedAt) => {
        const id = await insert('INSERT INTO ProgramCourseOfferings (course_id, program_id, dept_id, course_description, approved_at, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)', [courseId, programId, deptId, 'x', approvedAt, now(), now()]);
        const assignment = await insert('INSERT INTO CourseOfferingAssignments (pc_offering_id, stakeholder_id, date_assigned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [id, instructor, now(), now(), now()]);
        made.offerings.push(id); made.assignments.push(assignment); offeringOf[key] = id;
    };

    const deptA = await dept('ZZ scope dept A', 'ZZA', U.deanA);
    const deptB = await dept('ZZ scope dept B', 'ZZB', U.deanB);
    const progA = await program(deptA, 'ZZ scope program A', U.headA);
    const progB = await program(deptB, 'ZZ scope program B', U.headB);
    const courseA = await course('ZZS100');
    const courseB = await course('ZZS200');
    await offering('A_pending', courseA, progA, deptA, U.instructorA, null);
    await offering('A_approved', courseB, progA, deptA, U.instructorA, new Date('2026-01-01T00:00:00Z'));
    await offering('B_pending', courseA, progB, deptB, U.instructorB, null);
    await insert('INSERT INTO CourseConsultants (course_id, consultant_user_id, is_active, createdAt, updatedAt) VALUES (?, ?, 1, ?, ?)', [courseB, U.consultantA, now(), now()]);

    const app = express();
    app.use((req, res, next) => { const [id, role] = String(req.get('x-user') || '').split(':'); req.user = id ? { id: Number(id), role } : undefined; next(); });
    app.get('/api/assignments', listAssignments);
    await new Promise(resolve => { server = app.listen(0, resolve); });
    base = `http://127.0.0.1:${server.address().port}/api/assignments`;
});

test.after(async () => {
    server.close();
    const list = (ids) => ids.join(', ');
    if (made.assignments.length) await sequelize.query(`DELETE FROM CourseOfferingAssignments WHERE co_assign_id IN (${list(made.assignments)})`);
    if (made.offerings.length) await sequelize.query(`DELETE FROM ProgramCourseOfferings WHERE pc_offering_id IN (${list(made.offerings)})`);
    if (made.courses.length) {
        await sequelize.query(`DELETE FROM CourseConsultants WHERE course_id IN (${list(made.courses)})`);
        await sequelize.query(`DELETE FROM Courses WHERE course_id IN (${list(made.courses)})`);
    }
    if (made.programs.length) await sequelize.query(`DELETE FROM Programs WHERE program_id IN (${list(made.programs)})`);
    if (made.depts.length) await sequelize.query(`DELETE FROM Departments WHERE dept_id IN (${list(made.depts)})`);
});

// The offerings this test made that the role gets back, by name.
const seen = async (who) => {
    const res = await fetch(`${base}?page=1&limit=100`, { headers: { 'x-user': who } });
    assert.equal(res.status, 200, who);
    const rows = (await res.json()).data.map(row => row.ProgramCourseOffering.pc_offering_id);
    return Object.entries(offeringOf).filter(([, id]) => rows.includes(id)).map(([key]) => key).sort();
};

test('a Program Head gets only the plans of the program they head', async () => {
    assert.deepEqual(await seen(`${U.headA}:program-head`), ['A_approved', 'A_pending']);
    assert.deepEqual(await seen(`${U.headB}:program-head`), ['B_pending']);
    assert.deepEqual(await seen(`${U.nobody}:program-head`), [], 'a Program Head of no program');
});

test('a Dean gets only the plans of their department', async () => {
    assert.deepEqual(await seen(`${U.deanA}:dean`), ['A_approved', 'A_pending']);
    assert.deepEqual(await seen(`${U.deanB}:dean`), ['B_pending']);
    assert.deepEqual(await seen(`${U.nobody}:dean`), []);
});

test('an instructor gets only their own plans', async () => {
    assert.deepEqual(await seen(`${U.instructorA}:instructor`), ['A_approved', 'A_pending']);
    assert.deepEqual(await seen(`${U.instructorB}:instructor`), ['B_pending']);
});

test('a consultant gets only the courses they are assigned to', async () => {
    assert.deepEqual(await seen(`${U.consultantA}:industry-consultant`), ['A_approved']);
    assert.deepEqual(await seen(`${U.nobody}:industry-consultant`), []);
});

test('the VPAA gets approved plans only, and the Director of Libraries every plan', async () => {
    assert.deepEqual(await seen(`${U.vpaa}:vpaa`), ['A_approved']);
    assert.deepEqual(await seen(`${U.director}:director-of-libraries`), ['A_approved', 'A_pending', 'B_pending']);
});
