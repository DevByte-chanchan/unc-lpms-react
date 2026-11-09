'use strict';

// GET /api/comments/by-course/:code without a pcId: the access check runs on one offering of the course, so only that
// offering's comments may come back, never those of other offerings that share the course code (other programs,
// instructors, revisions). Real router, test database; it makes its own rows and removes them. (node run-tests.js)
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { Op } = require('sequelize');
const { sequelize, Sequelize, User, Comment, CourseOutcome, Week } = require('../models');

const insert = async (sql, replacements) => (await sequelize.query(sql, { replacements, type: Sequelize.QueryTypes.INSERT }))[0];
const stamp = Date.now();
const now = () => new Date();
const made = { users: [], depts: [], programs: [], courses: [], offerings: [], assignments: [], outcomes: [], weeks: [], comments: [] };
const ids = {};
const code = `ZZBC${stamp}`.slice(0, 20);
let server;
let base;

const makeUser = async (label, role) => {
    const row = await User.create({ name: `ZZ ${label} ${stamp}`, email: `zzbc.${label}.${stamp}@example.test`, role, password_hash: 'x', is_active: true });
    made.users.push(row.user_id);
    return row.user_id;
};

test.before(async () => {
    ids.dean = await makeUser('dean', 'dean');
    ids.mine = await makeUser('mine', 'instructor');
    ids.other = await makeUser('other', 'instructor');
    const dept = await insert('INSERT INTO Departments (name, code, stakeholder_id, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [`ZZ bc dept ${stamp}`, 'ZZB', ids.dean, now(), now()]);
    made.depts.push(dept);
    const program = async (label) => { const id = await insert('INSERT INTO Programs (dept_id, name, createdAt, updatedAt) VALUES (?, ?, ?, ?)', [dept, `ZZ bc program ${label} ${stamp}`, now(), now()]); made.programs.push(id); return id; };
    const course = await insert(`INSERT INTO Courses (course_no, course_title, credit, contact_hrs, classification, cmo, year_lvl, term, createdAt, updatedAt) VALUES (?, 'By-code test', '3', '3', 'x', 'x', 'FIRST YEAR', '1st', ?, ?)`, [code, now(), now()]);
    made.courses.push(course);

    const offering = async (programId, revision, instructor, message) => {
        const id = await insert('INSERT INTO ProgramCourseOfferings (course_id, program_id, dept_id, course_description, school_year, semester, revision_number, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [course, programId, dept, 'x', '2030-2031', '1st', revision, now(), now()]);
        const assignment = await insert('INSERT INTO CourseOfferingAssignments (pc_offering_id, stakeholder_id, date_assigned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [id, String(instructor), now(), now(), now()]);
        made.offerings.push(id); made.assignments.push(assignment);
        const outcome = await CourseOutcome.create({ pc_offering_id: id, co_description: 'Outcome' });
        made.outcomes.push(outcome.co_id);
        const week = await Week.create({ co_id: outcome.co_id, hours: 5 });
        made.weeks.push(week.week_id);
        const comment = await Comment.create({ co_assign_id: assignment, commenter_role: 'DEAN', commenter_user_id: ids.dean, message, resolved_status: false, week_id: week.week_id });
        made.comments.push(comment.comment_id);
    };
    // The newest revision is the one the access check picks when no pcId is given.
    await offering(await program('mine'), 2, ids.mine, `ZZ mine ${stamp}`);
    await offering(await program('other'), 1, ids.other, `ZZ other ${stamp}`);

    const app = express();
    app.use(express.json());
    app.use((req, res, next) => { const [id, role] = String(req.get('x-user') || '').split(':'); req.user = id ? { id: Number(id), role, name: 'T' } : undefined; next(); });
    app.use('/api/comments', require('../routes/comments'));
    await new Promise(resolve => { server = app.listen(0, resolve); });
    base = `http://127.0.0.1:${server.address().port}/api`;
});

test.after(async () => {
    server.close();
    const list = (a) => (a.length ? a.join(', ') : '0');
    await Comment.destroy({ where: { comment_id: { [Op.in]: made.comments } } });
    await Week.destroy({ where: { week_id: { [Op.in]: made.weeks } } });
    await CourseOutcome.destroy({ where: { co_id: { [Op.in]: made.outcomes } } });
    await sequelize.query(`DELETE FROM CourseOfferingAssignments WHERE co_assign_id IN (${list(made.assignments)})`);
    await sequelize.query(`DELETE FROM ProgramCourseOfferings WHERE pc_offering_id IN (${list(made.offerings)})`);
    await sequelize.query(`DELETE FROM Courses WHERE course_id IN (${list(made.courses)})`);
    await sequelize.query(`DELETE FROM Programs WHERE program_id IN (${list(made.programs)})`);
    await sequelize.query(`DELETE FROM Departments WHERE dept_id IN (${list(made.depts)})`);
    await User.destroy({ where: { user_id: { [Op.in]: made.users } } });
});

test('comments by course code come only from the offering that passed the access check', async () => {
    const res = await fetch(`${base}/comments/by-course/${encodeURIComponent(code)}`, { headers: { 'x-user': `${ids.mine}:instructor` } });
    assert.equal(res.status, 200);
    const messages = (await res.json()).map(c => c.message);
    assert.ok(messages.includes(`ZZ mine ${stamp}`), 'their own offering\'s comment is returned');
    assert.ok(!messages.includes(`ZZ other ${stamp}`), 'another program\'s offering of the same course is not');
});

test('a comment is saved on the plan being reviewed, not the newest plan with that course code', async () => {
    const otherOffering = made.offerings[1];
    const res = await fetch(`${base}/comments/by-course`, {
        method: 'POST',
        headers: { 'x-user': `${ids.dean}:dean`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, pcId: otherOffering, commenter_role: 'DEAN', message: `ZZ posted ${stamp}`, co_index: 1, week_index: 1 })
    });
    assert.equal(res.status, 201);
    const [row] = await sequelize.query(
        `SELECT c.comment_id, co.pc_offering_id FROM Comments c JOIN Weeks w ON w.week_id = c.week_id
         JOIN CourseOutcomes co ON co.co_id = w.co_id WHERE c.message = ?;`,
        { replacements: [`ZZ posted ${stamp}`], type: Sequelize.QueryTypes.SELECT });
    made.comments.push(row.comment_id);
    assert.equal(row.pc_offering_id, otherOffering);
});
