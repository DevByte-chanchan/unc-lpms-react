'use strict';

// Reminders to the approvers about plans that have waited on them, run against the test database with a
// clock the test controls. It makes its own people, programs and plans and removes them, and uses dates
// no real data has. (node run-tests.js)
const test = require('node:test');
const assert = require('node:assert/strict');
const { Op } = require('sequelize');
const models = require('../models');
const { runReminders } = require('./reminderJob');
const { notify } = require('./notify');
const { waitingSince } = require('./approverWaiting');
const rules = require('./reminderRules');

const { sequelize, Sequelize, User, Notification, ReminderLog } = models;
const ENV = { LPMS_TIMEZONE: 'UTC' };
const insert = async (sql, replacements) => (await sequelize.query(sql, { replacements, type: Sequelize.QueryTypes.INSERT }))[0];
const stamp = Date.now();
const startedAt = new Date();
const DAYS = ['2031-03-05', '2031-03-06', '2031-03-08', '2031-03-09'];
const made = { users: [], offerings: [], assignments: [], courses: [], programs: [], depts: [] };
const ids = {};
let programId;

const user = async (label, role) => {
    const row = await User.create({ name: `ZZ ${label} ${stamp}`, email: `zzwait.${label}.${stamp}@example.test`, role, password_hash: 'x', is_active: true });
    made.users.push(row.user_id);
    return row.user_id;
};
const at = (day) => new Date(`${day}T03:00:00Z`);

test.before(async () => {
    ids.dean = await user('dean', 'dean');
    ids.head = await user('head', 'program-head');
    ids.director = await user('director', 'director-of-libraries');
    const instructor = await user('ins', 'instructor');
    ids.instructor = instructor;
    const dept = await insert('INSERT INTO Departments (name, code, stakeholder_id, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [`ZZ wait dept ${stamp}`, 'ZZW', ids.dean, new Date(), new Date()]);
    made.depts.push(dept);
    programId = await insert('INSERT INTO Programs (dept_id, name, stakeholder_id, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [dept, `ZZ wait program ${stamp}`, ids.head, new Date(), new Date()]);
    made.programs.push(programId);

    // logs: [role, action, day]
    const offering = async (name, logs) => {
        const course = await insert(`INSERT INTO Courses (course_no, course_title, credit, contact_hrs, classification, cmo, year_lvl, term, createdAt, updatedAt) VALUES (?, 'Waiting test', '3', '3', 'x', 'x', 'FIRST YEAR', '1st', ?, ?)`, [`ZZW${name}`, new Date(), new Date()]);
        made.courses.push(course);
        const id = await insert('INSERT INTO ProgramCourseOfferings (course_id, program_id, dept_id, course_description, school_year, semester, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [course, programId, dept, 'x', '2030-2031', '2nd', new Date(), new Date()]);
        const assignment = await insert('INSERT INTO CourseOfferingAssignments (pc_offering_id, stakeholder_id, date_assigned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [id, instructor, new Date(), new Date(), new Date()]);
        made.offerings.push(id); made.assignments.push(assignment);
        for (const [role, action, day] of logs) {
            await insert('INSERT INTO AssignmentWorkflowLogs (co_assign_id, actor_role, action_type, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [assignment, role, action, at(day), at(day)]);
        }
    };
    await offering('A', [['INSTRUCTOR', 'SUBMITTED', '2031-03-02']]);                    // waits on the Director and the Program Head
    await offering('B', [['INSTRUCTOR', 'SUBMITTED', '2031-02-20'], ['LIBRARY_DIRECTOR', 'ACCEPTED', '2031-02-28'], ['PROGRAM_HEAD', 'ACCEPTED', '2031-03-01']]); // waits on the Dean since 1 March
    await offering('C', [['INSTRUCTOR', 'SUBMITTED', '2031-02-01'], ['PROGRAM_HEAD', 'RETURNED', '2031-02-05']]);   // returned: with the instructor
    await offering('D', []);                                                                  // not submitted
    await offering('E', [['INSTRUCTOR', 'SUBMITTED', '2031-02-25'], ['LIBRARY_DIRECTOR', 'RETURNED', '2031-03-02']]); // returned on 2 March, not resubmitted
});

test.after(async () => {
    const list = (a) => (a.length ? a.join(', ') : '0');
    await Notification.destroy({ where: { [Op.or]: [{ recipient_user_id: { [Op.in]: made.users } }, { type: 'approval_waiting', created_at: { [Op.gte]: startedAt } }] } });
    await ReminderLog.destroy({ where: { kind: { [Op.in]: ['waiting', 'returned-3', 'returned-7'] }, day: { [Op.in]: DAYS } } });
    await sequelize.query(`DELETE FROM AssignmentWorkflowLogs WHERE co_assign_id IN (${list(made.assignments)})`);
    await sequelize.query(`DELETE FROM CourseOfferingAssignments WHERE co_assign_id IN (${list(made.assignments)})`);
    await sequelize.query(`DELETE FROM ProgramCourseOfferings WHERE pc_offering_id IN (${list(made.offerings)})`);
    await sequelize.query(`DELETE FROM Courses WHERE course_id IN (${list(made.courses)})`);
    await sequelize.query(`DELETE FROM Programs WHERE program_id IN (${list(made.programs)})`);
    await sequelize.query(`DELETE FROM Departments WHERE dept_id IN (${list(made.depts)})`);
    await User.destroy({ where: { user_id: { [Op.in]: made.users } } });
});

const deps = () => ({ models, notify, mailer: { configured: () => false } });
const run = (day) => runReminders({ now: new Date(`${day}T09:00:00Z`), env: ENV, deps: deps(), programIds: [programId] });
const inbox = async (id) => (await Notification.findAll({ where: { recipient_user_id: id, type: 'approval_waiting' }, order: [['id', 'ASC']], raw: true })).map(n => n.message);

test('who waits since when: the reviewers from the submission, the Dean from the later acceptance', () => {
    const logs = [
        { actor_role: 'INSTRUCTOR', action_type: 'SUBMITTED', createdAt: 'one' },
        { actor_role: 'LIBRARY_DIRECTOR', action_type: 'ACCEPTED', createdAt: 'two' },
        { actor_role: 'PROGRAM_HEAD', action_type: 'ACCEPTED', createdAt: 'three' }
    ];
    assert.equal(waitingSince(logs, 'PROGRAM_HEAD'), 'one');
    assert.equal(waitingSince(logs, 'DEAN'), 'three');
    assert.equal(waitingSince([], 'DEAN'), null);
});

test('the limits: 3 days for the Director and Program Head, 7 for the Dean, then every multiple', () => {
    assert.equal(rules.isWaitingTrigger(2, 'PROGRAM_HEAD'), false);
    assert.equal(rules.isWaitingTrigger(3, 'LIBRARY_DIRECTOR'), true);
    assert.equal(rules.isWaitingTrigger(4, 'PROGRAM_HEAD'), false);
    assert.equal(rules.isWaitingTrigger(6, 'PROGRAM_HEAD'), true);
    assert.equal(rules.isWaitingTrigger(6, 'DEAN'), false);
    assert.equal(rules.isWaitingTrigger(14, 'DEAN'), true);
});

test('the text names no course and no person', () => {
    assert.equal(rules.waitingText({ waiting: 1, long: 0 }), '1 learning plan is waiting for your review');
    assert.equal(rules.waitingText({ waiting: 3, long: 2, stalled: 1 }), '3 learning plans are waiting for your review, 2 for 7 days or more; 1 learning plan stalled with another reviewer for 7 days or more');
    assert.equal(rules.waitingText({ waiting: 0, long: 0, stalled: 2 }), '2 learning plans stalled with another reviewer for 7 days or more');
});

test('after 3 days the Director and the Program Head are told once; the Dean is not, and returned or unsubmitted plans are ignored', async () => {
    const result = await run('2031-03-05');                  // plan A has waited 3 days
    assert.ok(result.approverReminders >= 2);
    assert.deepEqual(await inbox(ids.head), ['1 learning plan is waiting for your review']);
    assert.deepEqual(await inbox(ids.director), ['1 learning plan is waiting for your review']);
    assert.deepEqual(await inbox(ids.dean), [], 'plan B has waited 4 days on the Dean, under his 7');
    await run('2031-03-05');
    assert.equal((await inbox(ids.head)).length, 1, 'not twice the same day');
    // About one plan, so it names that plan and opens it directly.
    const [row] = await Notification.findAll({ where: { recipient_user_id: ids.director, type: 'approval_waiting' }, raw: true });
    assert.equal(row.offering_id, made.offerings[0]);
});

test('a day that is not a multiple of the limit sends nothing', async () => {
    await run('2031-03-06');                                 // A: 4 days
    assert.equal((await inbox(ids.head)).length, 1);
    assert.equal((await inbox(ids.dean)).length, 0);
});

test('after 7 days on the Dean they are told; at 6 days the Program Head is reminded again', async () => {
    await run('2031-03-08');                                 // A: 6 days, B on the Dean: 7 days
    assert.equal((await inbox(ids.head)).length, 2);
    assert.deepEqual(await inbox(ids.dean), ['1 learning plan is waiting for your review, 1 for 7 days or more']);
});

test('the Dean is also told when a plan has stalled with another reviewer for 7 days', async () => {
    await run('2031-03-09');                                 // A: 7 days with the Director and Program Head
    const dean = await inbox(ids.dean);
    assert.equal(dean.length, 2);
    assert.equal(dean[1], '1 learning plan is waiting for your review, 1 for 7 days or more; 1 learning plan stalled with another reviewer for 7 days or more');
    const rows = await Notification.findAll({ where: { recipient_user_id: ids.dean, type: 'approval_waiting' }, order: [['id', 'ASC']], raw: true });
    assert.equal(rows[1].offering_id, null, 'two plans: it opens the list');
});

test('a returned plan not resubmitted: on day 3 and day 7 the instructor is reminded and the Program Head told, once each', async () => {
    const of = async (id, type) => (await Notification.findAll({ where: { recipient_user_id: id, type }, order: [['id', 'ASC']], raw: true })).map(n => n.message);
    const instructorReminders = (await of(ids.instructor, 'reminder')).filter(m => /ZZWE/.test(m));
    const headNotes = await of(ids.head, 'returned_waiting');
    // The earlier tests already ran 5 March (day 3 for E) and 9 March (day 7); 6 and 8 March sent nothing for it.
    assert.deepEqual(instructorReminders, [
        'ZZWE — reminder: resubmit your learning plan (returned 3 days ago)',
        'ZZWE — reminder: resubmit your learning plan (returned 7 days ago)'
    ]);
    assert.deepEqual(headNotes.filter(m => /ZZWE/.test(m)), ['ZZWE — returned 3 days ago and not resubmitted yet', 'ZZWE — returned 7 days ago and not resubmitted yet']);
    assert.ok(!headNotes.some(m => /ZZWC/.test(m)), 'plan C was returned weeks ago: no day 3 or 7 in this run');
    await run('2031-03-09');
    assert.equal((await of(ids.head, 'returned_waiting')).length, headNotes.length, 'not twice the same day');
});
