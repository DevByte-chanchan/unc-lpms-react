'use strict';

// The course list's school year and semester filter: a plan is listed under the term written on its offering, not the
// day it was assigned (next year's plan is often assigned this year). Real router, test database; it makes its own
// rows and removes them. (node run-tests.js)
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { Op } = require('sequelize');
const { sequelize, Sequelize, User } = require('../models');

const insert = async (sql, replacements) => (await sequelize.query(sql, { replacements, type: Sequelize.QueryTypes.INSERT }))[0];
const stamp = Date.now();
const now = () => new Date();
const made = { users: [], depts: [], programs: [], courses: [], offerings: [], assignments: [] };
const ids = {};
let server;
let base;

test.before(async () => {
    const head = await User.create({ name: `ZZ head ${stamp}`, email: `zzterm.head.${stamp}@example.test`, role: 'program-head', password_hash: 'x', is_active: true });
    const instructor = await User.create({ name: `ZZ ins ${stamp}`, email: `zzterm.ins.${stamp}@example.test`, role: 'instructor', password_hash: 'x', is_active: true });
    made.users.push(head.user_id, instructor.user_id);
    ids.head = head.user_id;
    const dept = await insert('INSERT INTO Departments (name, code, createdAt, updatedAt) VALUES (?, ?, ?, ?)', [`ZZ term dept ${stamp}`, 'ZZT', now(), now()]);
    made.depts.push(dept);
    const program = await insert('INSERT INTO Programs (dept_id, name, stakeholder_id, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [dept, `ZZ term program ${stamp}`, head.user_id, now(), now()]);
    made.programs.push(program);
    const course = await insert(`INSERT INTO Courses (course_no, course_title, credit, contact_hrs, classification, cmo, year_lvl, term, createdAt, updatedAt) VALUES (?, 'Term test', '3', '3', 'x', 'x', 'FIRST YEAR', '1st', ?, ?)`, [`ZZT${stamp}`.slice(0, 20), now(), now()]);
    made.courses.push(course);
    const offering = async (schoolYear, semester, assigned) => {
        const id = await insert('INSERT INTO ProgramCourseOfferings (course_id, program_id, dept_id, course_description, school_year, semester, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [course, program, dept, 'x', schoolYear, semester, now(), now()]);
        made.assignments.push(await insert('INSERT INTO CourseOfferingAssignments (pc_offering_id, stakeholder_id, date_assigned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [id, String(instructor.user_id), new Date(assigned), now(), now()]));
        made.offerings.push(id);
        return id;
    };
    // Assigned in October 2030, for the next school year.
    ids.nextYear = await offering('2031-2032', '1st', '2030-10-05T00:00:00Z');
    ids.summer = await offering('2030-2031', 'Summer', '2031-03-01T00:00:00Z');

    const app = express();
    app.use(express.json());
    app.use((req, res, next) => { const [id, role] = String(req.get('x-user') || '').split(':'); req.user = id ? { id: Number(id), role, name: 'T' } : undefined; next(); });
    // The router checks the real session first; the list handler is what is under test.
    app.get('/api/assignments', require('../controllers/assignmentController').listAssignments);
    await new Promise(resolve => { server = app.listen(0, resolve); });
    base = `http://127.0.0.1:${server.address().port}/api`;
});

test.after(async () => {
    server.close();
    const list = (a) => (a.length ? a.join(', ') : '0');
    await sequelize.query(`DELETE FROM CourseOfferingAssignments WHERE co_assign_id IN (${list(made.assignments)})`);
    await sequelize.query(`DELETE FROM ProgramCourseOfferings WHERE pc_offering_id IN (${list(made.offerings)})`);
    await sequelize.query(`DELETE FROM Courses WHERE course_id IN (${list(made.courses)})`);
    await sequelize.query(`DELETE FROM Programs WHERE program_id IN (${list(made.programs)})`);
    await sequelize.query(`DELETE FROM Departments WHERE dept_id IN (${list(made.depts)})`);
    await User.destroy({ where: { user_id: { [Op.in]: made.users } } });
});

const listed = async (year, semester) => {
    const res = await fetch(`${base}/assignments?year=${year}&semester=${encodeURIComponent(semester)}&limit=200`, { headers: { 'x-user': `${ids.head}:program-head` } });
    assert.equal(res.status, 200);
    return (await res.json()).data.map(row => row.ProgramCourseOffering.pc_offering_id);
};

test('a plan is listed under the school year and semester on its offering, not the day it was assigned', async () => {
    assert.ok((await listed(2031, '1st Sem')).includes(ids.nextYear), 'under 2031-2032 1st semester');
    assert.ok(!(await listed(2030, '1st Sem')).includes(ids.nextYear), 'not under the year it was assigned in');
});

test('summer plans have their own term', async () => {
    assert.ok((await listed(2030, 'Summer')).includes(ids.summer));
    assert.ok(!(await listed(2030, '2nd Sem')).includes(ids.summer));
});
