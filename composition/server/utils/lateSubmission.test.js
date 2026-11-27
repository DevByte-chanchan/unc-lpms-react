'use strict';

// Late submissions (panel feedback, Nov 2026): a first submission after the program's due date needs a reason.
// Runs against the test database (node run-tests.js); makes its own rows and removes them.
const test = require('node:test');
const assert = require('node:assert/strict');
const { sequelize, Sequelize, TermDeadline } = require('../models');
const { lateSubmission, lateReasonProblem } = require('./lateSubmission');

const insert = async (sql, r) => (await sequelize.query(sql, { replacements: r, type: Sequelize.QueryTypes.INSERT }))[0];
const stamp = Date.now();
const now = () => new Date();
const made = { programs: [], courses: [], offerings: [], assignments: [], depts: [] };
let plain;
let revision;

test.before(async () => {
    const dept = await insert('INSERT INTO Departments (name, code, createdAt, updatedAt) VALUES (?, ?, ?, ?)', [`ZZ late ${stamp}`, 'ZZL', now(), now()]);
    made.depts.push(dept);
    const program = await insert('INSERT INTO Programs (dept_id, name, createdAt, updatedAt) VALUES (?, ?, ?, ?)', [dept, `ZZ late program ${stamp}`, now(), now()]);
    made.programs.push(program);
    await TermDeadline.create({ program_id: program, school_year: '2030-2031', semester: '1st', syllabus_due: '2030-08-01' });
    const offering = async (label, base = null) => {
        const course = await insert(`INSERT INTO Courses (course_no, course_title, credit, contact_hrs, classification, cmo, year_lvl, term, createdAt, updatedAt) VALUES (?, 'Late test', '3', '3', 'x', 'x', 'FIRST YEAR', '1st', ?, ?)`, [`ZZL${label}`, now(), now()]);
        made.courses.push(course);
        const id = await insert('INSERT INTO ProgramCourseOfferings (course_id, program_id, dept_id, course_description, school_year, semester, base_offering_id, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [course, program, dept, 'x', '2030-2031', '1st', base, now(), now()]);
        const a = await insert('INSERT INTO CourseOfferingAssignments (pc_offering_id, stakeholder_id, date_assigned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [id, '1', now(), now(), now()]);
        made.offerings.push(id); made.assignments.push(a);
        return { id, assignment: a };
    };
    plain = await offering('A');
    revision = await offering('B', plain.id);
});

test.after(async () => {
    const list = (a) => (a.length ? a.join(', ') : '0');
    await sequelize.query(`DELETE FROM AssignmentWorkflowLogs WHERE co_assign_id IN (${list(made.assignments)})`);
    await sequelize.query(`DELETE FROM CourseOfferingAssignments WHERE co_assign_id IN (${list(made.assignments)})`);
    await sequelize.query(`DELETE FROM ProgramCourseOfferings WHERE pc_offering_id IN (${list(made.offerings)})`);
    await sequelize.query(`DELETE FROM Courses WHERE course_id IN (${list(made.courses)})`);
    await TermDeadline.destroy({ where: { program_id: made.programs } });
    await sequelize.query(`DELETE FROM Programs WHERE program_id IN (${list(made.programs)})`);
    await sequelize.query(`DELETE FROM Departments WHERE dept_id IN (${list(made.depts)})`);
});

test('a first submission after the due date is late, by school days; on or before it is not', async () => {
    assert.deepEqual(await lateSubmission(sequelize, plain.id, new Date('2030-08-04T03:00:00Z')), { late: true, daysLate: 3, dueDate: '2030-08-01' });
    assert.equal((await lateSubmission(sequelize, plain.id, new Date('2030-08-01T03:00:00Z'))).late, false, 'on the due day');
});

test('a revision of an approved plan is not a late term submission', async () => {
    assert.equal((await lateSubmission(sequelize, revision.id, new Date('2030-08-04T03:00:00Z'))).late, false);
});

test('a resubmission after a return is not late again', async () => {
    await insert('INSERT INTO AssignmentWorkflowLogs (co_assign_id, actor_role, action_type, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [plain.assignment, 'INSTRUCTOR', 'SUBMITTED', now(), now()]);
    assert.equal((await lateSubmission(sequelize, plain.id, new Date('2030-09-01T03:00:00Z'))).late, false);
});

test('the reason: required when late, a few words at least, not over 1000 characters', () => {
    const late = { late: true, daysLate: 2, dueDate: '2030-08-01' };
    assert.equal(lateReasonProblem({ late: false }, ''), null);
    assert.equal(lateReasonProblem(late, ' ok ').code, 'LATE_REASON_REQUIRED');
    assert.match(lateReasonProblem(late, '').error, /2 days late \(due 2030-08-01\)/);
    assert.equal(lateReasonProblem(late, 'I was sick for a week.'), null);
    assert.equal(lateReasonProblem(late, 'x'.repeat(1001)).code, 'LATE_REASON_TOO_LONG');
});
