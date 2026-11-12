'use strict';

// Course consultant assignments, through the real router, against the test database: only the head of a program that
// offers the course may remove its consultant, and a Program Head lists only their own programs' courses.
// It makes its own programs, course, offering and accounts, and removes them. (node run-tests.js)
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { Op } = require('sequelize');
const { sequelize, Sequelize, User, CourseConsultant, Notification } = require('../models');

const insert = async (sql, replacements) => (await sequelize.query(sql, { replacements, type: Sequelize.QueryTypes.INSERT }))[0];
const stamp = Date.now();
const now = () => new Date();
const made = { users: [], programs: [], depts: [], courses: [], offerings: [] };
const ids = {};
let server;
let base;

const makeUser = async (label, role) => {
    const row = await User.create({ name: `ZZ ${label} ${stamp}`, email: `zzcc.${label}.${stamp}@example.test`, role, password_hash: 'x', is_active: true });
    made.users.push(row.user_id);
    return row.user_id;
};

test.before(async () => {
    ids.headA = await makeUser('headA', 'program-head');
    ids.headB = await makeUser('headB', 'program-head');
    ids.consultant = await makeUser('consultant', 'industry-consultant');
    ids.dean = await makeUser('dean', 'dean');
    ids.otherDean = await makeUser('otherDean', 'dean');
    const dept = await insert('INSERT INTO Departments (name, code, stakeholder_id, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [`ZZ cc dept ${stamp}`, 'ZZC', ids.dean, now(), now()]);
    made.depts.push(dept);
    made.depts.push(await insert('INSERT INTO Departments (name, code, stakeholder_id, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [`ZZ cc other dept ${stamp}`, 'ZZD', ids.otherDean, now(), now()]));
    const program = async (label, head) => { const id = await insert('INSERT INTO Programs (dept_id, name, stakeholder_id, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [dept, `ZZ cc program ${label} ${stamp}`, head, now(), now()]); made.programs.push(id); return id; };
    await program('A', ids.headA);
    const progB = await program('B', ids.headB);
    ids.course = await insert(`INSERT INTO Courses (course_no, course_title, credit, contact_hrs, classification, cmo, year_lvl, term, createdAt, updatedAt) VALUES (?, 'Consultant test', '3', '3', 'x', 'x', 'FIRST YEAR', '1st', ?, ?)`, [`ZZCC${stamp % 100000}`, now(), now()]);
    made.courses.push(ids.course);
    made.offerings.push(await insert('INSERT INTO ProgramCourseOfferings (course_id, program_id, dept_id, course_description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)', [ids.course, progB, dept, 'x', now(), now()]));

    const app = express();
    app.use(express.json());
    app.use((req, res, next) => { const [id, role] = String(req.get('x-user') || '').split(':'); req.user = id ? { id: Number(id), role, name: 'T' } : undefined; next(); });
    app.use('/api/course-consultants', require('../routes/courseConsultants'));
    await new Promise(resolve => { server = app.listen(0, resolve); });
    base = `http://127.0.0.1:${server.address().port}/api`;
});

test.after(async () => {
    server.close();
    const list = (a) => (a.length ? a.join(', ') : '0');
    await Notification.destroy({ where: { recipient_user_id: { [Op.in]: made.users } } });
    await CourseConsultant.destroy({ where: { course_id: { [Op.in]: made.courses } } });
    await sequelize.query(`DELETE FROM ProgramCourseOfferings WHERE pc_offering_id IN (${list(made.offerings)})`);
    await sequelize.query(`DELETE FROM Courses WHERE course_id IN (${list(made.courses)})`);
    await sequelize.query(`DELETE FROM Programs WHERE program_id IN (${list(made.programs)})`);
    await sequelize.query(`DELETE FROM Departments WHERE dept_id IN (${list(made.depts)})`);
    await User.destroy({ where: { user_id: { [Op.in]: made.users } } });
});

const call = async (who, method, path, body) => {
    const res = await fetch(base + path, { method, headers: { 'x-user': who, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: await res.json().catch(() => ({})) };
};
const HEAD_A = () => `${ids.headA}:program-head`;
const HEAD_B = () => `${ids.headB}:program-head`;

test('a consultant can be assigned only once the course has a Dean-approved plan', async () => {
    const before = await call(HEAD_B(), 'POST', '/course-consultants', { course_id: ids.course, consultant_user_id: ids.consultant });
    assert.equal(before.status, 409);
    assert.match(before.body.message, /no approved learning plan/);
    const listed = (await call(HEAD_B(), 'GET', '/course-consultants/candidates')).body.courses.find(c => c.course_id === ids.course);
    assert.equal(listed.approved, 0, 'the dialog is told why it cannot assign');
    await sequelize.query('UPDATE ProgramCourseOfferings SET approved_at = ? WHERE pc_offering_id = ?', { replacements: [now(), made.offerings[0]] });
    assert.equal((await call(HEAD_B(), 'GET', '/course-consultants/candidates')).body.courses.find(c => c.course_id === ids.course).approved, 1);
});

test('another program head can neither see nor remove a consultant assignment', async () => {
    const assigned = await call(HEAD_B(), 'POST', '/course-consultants', { course_id: ids.course, consultant_user_id: ids.consultant });
    assert.equal(assigned.status, 201);
    const told = await Notification.findAll({ where: { recipient_user_id: ids.consultant, type: 'course_assigned' }, raw: true });
    assert.equal(told.length, 1, 'the consultant is told they were assigned');
    assert.match(told[0].message, /assigned as the industry consultant/);
    assert.equal(told[0].offering_id, made.offerings[0]);
    const id = assigned.body.course_consultant_id;

    const seenByA = await call(HEAD_A(), 'GET', `/course-consultants?courseId=${ids.course}`);
    assert.equal(seenByA.status, 200);
    assert.equal(seenByA.body.length, 0);
    const seenByB = await call(HEAD_B(), 'GET', `/course-consultants?courseId=${ids.course}`);
    assert.equal(seenByB.body.length, 1);
    assert.equal((await call(`${ids.dean}:dean`, 'GET', `/course-consultants?courseId=${ids.course}`)).body.length, 1);
    assert.equal((await call(`${ids.otherDean}:dean`, 'GET', `/course-consultants?courseId=${ids.course}`)).body.length, 0);

    assert.equal((await call(HEAD_A(), 'PUT', `/course-consultants/${id}/deactivate`)).status, 403);
    assert.equal((await CourseConsultant.findByPk(id)).is_active, true);

    const removed = await call(HEAD_B(), 'PUT', `/course-consultants/${id}/deactivate`);
    assert.equal(removed.status, 200);
    assert.equal((await CourseConsultant.findByPk(id)).is_active, false);
    const gone = await Notification.findAll({ where: { recipient_user_id: ids.consultant, type: 'course_unassigned' }, raw: true });
    assert.equal(gone.length, 1, 'the consultant is told they were removed');
    assert.match(gone[0].message, /removed as the industry consultant/);
});

test('the assigned consultant signs an approved plan as reviewed, once; others cannot sign', async () => {
    const consultant = `${ids.consultant}:industry-consultant`;
    assert.equal((await call(HEAD_B(), 'POST', '/course-consultants', { course_id: ids.course, consultant_user_id: ids.consultant })).status, 200, 'reassigned');
    const pc = made.offerings[0];
    const signed = await call(consultant, 'POST', `/course-consultants/signoffs/${pc}`);
    assert.equal(signed.status, 201);
    assert.match(signed.body.name, /consultant/);
    assert.equal((await call(consultant, 'POST', `/course-consultants/signoffs/${pc}`)).status, 409, 'only once');
    assert.equal((await call(HEAD_B(), 'POST', `/course-consultants/signoffs/${pc}`)).status, 403, 'a Program Head does not sign');
    const list = await call(HEAD_B(), 'GET', `/course-consultants/signoffs/${pc}`);
    assert.equal(list.status, 200);
    assert.deepEqual(list.body.map(s => s.mine), [false]);
    assert.deepEqual((await call(consultant, 'GET', `/course-consultants/signoffs/${pc}`)).body.map(s => s.mine), [true]);
    await sequelize.query('DELETE FROM ConsultantSignoffs WHERE offering_id = ?', { replacements: [pc] });
});
