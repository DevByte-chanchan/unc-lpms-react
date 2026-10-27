'use strict';

// The term deadline and the "not yet submitted" API, through the real routers, against the test database.
// Each person sees and changes only the programs they head. It makes its own departments, programs,
// instructors and plans, and removes them. (node run-tests.js)
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { Op } = require('sequelize');
const models = require('../models');
const { schoolClock, timezoneOf } = require('./reminderRules');

const { sequelize, Sequelize, User, Notification, ReminderPause, TermDeadline } = models;
const insert = async (sql, replacements) => (await sequelize.query(sql, { replacements, type: Sequelize.QueryTypes.INSERT }))[0];
const stamp = Date.now();
const now = () => new Date();
const made = { users: [], offerings: [], assignments: [], courses: [], programs: [], depts: [] };
const plan = {};
const ids = {};
let server;
let base;

const today = schoolClock(new Date(), timezoneOf()).day;
const addDays = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
// The school year that contains today, as 2026-2027 style, and a due date relative to today.
const year = Number(today.slice(0, 4));
const SCHOOL_YEAR = `${year}-${year + 1}`;

const makeUser = async (label, role) => {
    const row = await User.create({ name: `ZZ ${label} ${stamp}`, email: `zzapi.${label}.${stamp}@example.test`, role, password_hash: 'x', is_active: true });
    made.users.push(row.user_id);
    return row;
};

test.before(async () => {
    ids.deanA = (await makeUser('deanA', 'dean')).user_id;
    ids.deanB = (await makeUser('deanB', 'dean')).user_id;
    ids.headA = (await makeUser('headA', 'program-head')).user_id;
    ids.headB = (await makeUser('headB', 'program-head')).user_id;
    const dept = async (code, dean) => { const id = await insert('INSERT INTO Departments (name, code, stakeholder_id, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [`ZZ api dept ${code} ${stamp}`, code, dean, now(), now()]); made.depts.push(id); return id; };
    const program = async (deptId, label, head) => { const id = await insert('INSERT INTO Programs (dept_id, name, stakeholder_id, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [deptId, `ZZ api program ${label} ${stamp}`, head, now(), now()]); made.programs.push(id); return id; };
    const deptA = await dept('ZZA', ids.deanA);
    const deptB = await dept('ZZB', ids.deanB);
    ids.progA = await program(deptA, 'A', ids.headA);
    ids.progB = await program(deptB, 'B', ids.headB);

    const offering = async (name, programId, deptId, semester, { submitted = false } = {}) => {
        const instructor = await makeUser(`ins${name}`, 'instructor');
        const course = await insert(`INSERT INTO Courses (course_no, course_title, credit, contact_hrs, classification, cmo, year_lvl, term, createdAt, updatedAt) VALUES (?, 'Missing list test', '3', '3', 'x', 'x', 'FIRST YEAR', '1st', ?, ?)`, [`ZZM${name}`, now(), now()]);
        made.courses.push(course);
        const id = await insert('INSERT INTO ProgramCourseOfferings (course_id, program_id, dept_id, course_description, school_year, semester, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [course, programId, deptId, 'x', SCHOOL_YEAR, semester, now(), now()]);
        const assignment = await insert('INSERT INTO CourseOfferingAssignments (pc_offering_id, stakeholder_id, date_assigned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [id, instructor.user_id, now(), now(), now()]);
        made.offerings.push(id); made.assignments.push(assignment);
        if (submitted) await insert('INSERT INTO AssignmentWorkflowLogs (co_assign_id, actor_role, action_type, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [assignment, 'INSTRUCTOR', 'SUBMITTED', now(), now()]);
        plan[name] = { offeringId: id, instructorId: instructor.user_id };
    };
    await offering('X', ids.progA, deptA, '1st');                       // program A, due in 5 days
    await offering('Y', ids.progA, deptA, '2nd');                       // program A, due 2 days ago
    await offering('Z', ids.progA, deptA, 'Summer');                    // program A, no deadline
    await offering('S', ids.progA, deptA, '1st', { submitted: true });  // program A, already submitted
    await offering('W', ids.progB, deptB, '1st');                       // program B
    await TermDeadline.create({ program_id: ids.progA, school_year: SCHOOL_YEAR, semester: '1st', syllabus_due: addDays(today, 5) });
    await TermDeadline.create({ program_id: ids.progA, school_year: SCHOOL_YEAR, semester: '2nd', syllabus_due: addDays(today, -2) });

    const app = express();
    app.use(express.json());
    app.use((req, res, next) => { const [id, role] = String(req.get('x-user') || '').split(':'); req.user = id ? { id: Number(id), role, name: 'T' } : undefined; next(); });
    app.use('/api/term-deadlines', require('../routes/termDeadlines'));
    app.use('/api/missing-submissions', require('../routes/missingSubmissions'));
    await new Promise(resolve => { server = app.listen(0, resolve); });
    base = `http://127.0.0.1:${server.address().port}/api`;
});

test.after(async () => {
    server.close();
    const list = (a) => (a.length ? a.join(', ') : '0');
    await Notification.destroy({ where: { [Op.or]: [{ offering_id: { [Op.in]: made.offerings.length ? made.offerings : [0] } }, { recipient_user_id: { [Op.in]: made.users } }] } });
    await ReminderPause.destroy({ where: { offering_id: { [Op.in]: made.offerings.length ? made.offerings : [0] } } });
    await TermDeadline.destroy({ where: { program_id: { [Op.in]: made.programs.length ? made.programs : [0] } } });
    await sequelize.query(`DELETE FROM AssignmentWorkflowLogs WHERE co_assign_id IN (${list(made.assignments)})`);
    await sequelize.query(`DELETE FROM CourseOfferingAssignments WHERE co_assign_id IN (${list(made.assignments)})`);
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
const DEAN_A = () => `${ids.deanA}:dean`;

// ---- who may use it ----

test('only the Program Head and the Dean may use these routes', async () => {
    for (const role of ['instructor', 'director-of-libraries', 'industry-consultant', 'vpaa']) {
        assert.equal((await call(`999:${role}`, 'GET', '/term-deadlines')).status, 403, `${role} deadlines`);
        assert.equal((await call(`999:${role}`, 'GET', '/missing-submissions')).status, 403, `${role} list`);
        assert.equal((await call(`999:${role}`, 'POST', '/missing-submissions/remind', { offeringIds: [1] })).status, 403, `${role} remind`);
    }
});

// ---- the deadline ----

test('a Program Head sees only the programs they head and their deadlines', async () => {
    const mine = await call(HEAD_A(), 'GET', `/term-deadlines?school_year=${SCHOOL_YEAR}`);
    assert.equal(mine.status, 200);
    assert.deepEqual(mine.body.programs.map(p => p.program_id), [ids.progA]);
    assert.equal(mine.body.deadlines.length, 2);
    const other = await call(HEAD_B(), 'GET', `/term-deadlines?school_year=${SCHOOL_YEAR}`);
    assert.deepEqual(other.body.programs.map(p => p.program_id), [ids.progB]);
    assert.equal(other.body.deadlines.length, 0);
    const dean = await call(DEAN_A(), 'GET', '/term-deadlines');
    assert.deepEqual(dean.body.programs.map(p => p.program_id), [ids.progA], 'a Dean sees the programs of their department');
});

test('a deadline can be set, changed and removed, only for a program the person heads', async () => {
    const due = addDays(today, 30);
    const set = await call(HEAD_B(), 'PUT', '/term-deadlines', { program_id: ids.progB, school_year: SCHOOL_YEAR, semester: '1st', syllabus_due: due });
    assert.equal(set.status, 201);
    const changed = await call(HEAD_B(), 'PUT', '/term-deadlines', { program_id: ids.progB, school_year: SCHOOL_YEAR, semester: '1st', syllabus_due: addDays(today, 31) });
    assert.equal(changed.status, 200);
    assert.equal(changed.body.id, set.body.id, 'one row per program and term');
    assert.equal(changed.body.syllabus_due, addDays(today, 31));

    assert.equal((await call(HEAD_A(), 'PUT', '/term-deadlines', { program_id: ids.progB, school_year: SCHOOL_YEAR, semester: '1st', syllabus_due: due })).status, 403, "another head's program");
    assert.equal((await call(HEAD_A(), 'DELETE', `/term-deadlines/${set.body.id}`)).status, 403);
    assert.equal((await call(DEAN_A(), 'PUT', '/term-deadlines', { program_id: ids.progB, school_year: SCHOOL_YEAR, semester: '1st', syllabus_due: due })).status, 403, "another department's program");
    const dean = await call(`${ids.deanB}:dean`, 'PUT', '/term-deadlines', { program_id: ids.progB, school_year: SCHOOL_YEAR, semester: '2nd', syllabus_due: addDays(today, 90) });
    assert.equal(dean.status, 201, 'a Dean sets one for their department');

    assert.equal((await call(HEAD_B(), 'DELETE', `/term-deadlines/${set.body.id}`)).status, 200);
    assert.equal((await call(HEAD_B(), 'DELETE', `/term-deadlines/${set.body.id}`)).status, 404);
});

test('a bad deadline is refused with the fields that are wrong', async () => {
    const bad = await call(HEAD_A(), 'PUT', '/term-deadlines', { program_id: ids.progA, school_year: '2026', semester: 'Fall', syllabus_due: 'soon' });
    assert.equal(bad.status, 400);
    assert.deepEqual(Object.keys(bad.body.errors).sort(), ['school_year', 'semester', 'syllabus_due']);
});

// ---- the list ----

const names = (body) => body.missing.map(m => m.courseCode).sort();

test('the Program Head sees only the not-yet-submitted plans of their own programs, with where each stands', async () => {
    const list = await call(HEAD_A(), 'GET', `/missing-submissions?school_year=${SCHOOL_YEAR}`);
    assert.equal(list.status, 200);
    assert.deepEqual(names(list.body), ['ZZMX', 'ZZMY', 'ZZMZ'], 'S is submitted and W is in another program');
    const byCode = Object.fromEntries(list.body.missing.map(m => [m.courseCode, m]));
    assert.deepEqual([byCode.ZZMX.status, byCode.ZZMX.daysLeft], ['on-track', 5]);
    assert.deepEqual([byCode.ZZMY.status, byCode.ZZMY.daysLeft], ['overdue', -2]);
    assert.deepEqual([byCode.ZZMZ.status, byCode.ZZMZ.daysLeft], ['no-deadline', null]);
    assert.equal(byCode.ZZMX.state, 'Draft');
    assert.deepEqual(list.body.summary, { notSubmitted: 3, overdue: 1, dueSoon: 0, noDeadline: 1 });
    assert.match(byCode.ZZMX.instructorName, /insX/);
    assert.equal(byCode.ZZMX.remindersPaused, false);
});

test('a Dean sees their department, and the other head sees only their own plan', async () => {
    assert.deepEqual(names((await call(DEAN_A(), 'GET', `/missing-submissions?school_year=${SCHOOL_YEAR}`)).body), ['ZZMX', 'ZZMY', 'ZZMZ']);
    assert.deepEqual(names((await call(HEAD_B(), 'GET', `/missing-submissions?school_year=${SCHOOL_YEAR}`)).body), ['ZZMW']);
});

test('the list can be narrowed to one semester', async () => {
    assert.deepEqual(names((await call(HEAD_A(), 'GET', `/missing-submissions?school_year=${SCHOOL_YEAR}&semester=2nd`)).body), ['ZZMY']);
});

// ---- remind now and pause ----

test('remind now writes one reminder to the instructor, and a second one within hours is refused', async () => {
    const first = await call(HEAD_A(), 'POST', '/missing-submissions/remind', { offeringIds: [plan.X.offeringId] });
    assert.equal(first.status, 200);
    assert.equal(first.body.sent, 1);
    const notice = await Notification.findOne({ where: { recipient_user_id: plan.X.instructorId, type: 'poke' }, raw: true });
    assert.match(notice.message, /ZZMX — reminder: submit your learning plan by Program Head/);
    const second = await call(HEAD_A(), 'POST', '/missing-submissions/remind', { offeringIds: [plan.X.offeringId] });
    assert.deepEqual(second.body.results.map(r => r.status), ['limited']);
    const listed = (await call(HEAD_A(), 'GET', `/missing-submissions?school_year=${SCHOOL_YEAR}&semester=1st`)).body.missing.find(m => m.courseCode === 'ZZMX');
    assert.equal(listed.lastReminderBy, 'a person');
    assert.ok(listed.lastReminderAt);
});

test('a plan that is submitted, or in another program, cannot be reminded', async () => {
    const res = await call(HEAD_A(), 'POST', '/missing-submissions/remind', { offeringIds: [plan.S.offeringId, plan.W.offeringId] });
    assert.deepEqual(res.body.results.map(r => r.status), ['not-waiting', 'not-waiting']);
    assert.equal(res.body.sent, 0);
    assert.equal((await call(HEAD_A(), 'POST', '/missing-submissions/remind', { offeringIds: [] })).status, 400);
    assert.equal((await call(HEAD_A(), 'POST', '/missing-submissions/remind', { offeringIds: Array.from({ length: 101 }, (_, i) => i + 1) })).status, 400);
});

test('reminders for a plan can be paused and resumed, only by the person who heads its program', async () => {
    assert.equal((await call(HEAD_B(), 'PUT', `/missing-submissions/${plan.Y.offeringId}/pause`, { paused: true })).status, 404, "another head's plan");
    assert.equal((await call(HEAD_A(), 'PUT', `/missing-submissions/${plan.Y.offeringId}/pause`, { paused: 'yes' })).status, 400);
    assert.equal((await call(HEAD_A(), 'PUT', `/missing-submissions/${plan.Y.offeringId}/pause`, { paused: true })).status, 200);
    const paused = (await call(HEAD_A(), 'GET', `/missing-submissions?school_year=${SCHOOL_YEAR}&semester=2nd`)).body.missing[0];
    assert.equal(paused.remindersPaused, true);
    assert.equal((await call(HEAD_A(), 'PUT', `/missing-submissions/${plan.Y.offeringId}/pause`, { paused: false })).status, 200);
    const resumed = (await call(HEAD_A(), 'GET', `/missing-submissions?school_year=${SCHOOL_YEAR}&semester=2nd`)).body.missing[0];
    assert.equal(resumed.remindersPaused, false);
});
