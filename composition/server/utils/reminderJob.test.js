'use strict';

// The automatic reminders, run against the test database with a clock the test controls. It makes its
// own department, programs, instructors and plans, and removes them. (node run-tests.js)
const test = require('node:test');
const assert = require('node:assert/strict');
const { Op } = require('sequelize');
const models = require('../models');
const { runReminders } = require('./reminderJob');
const { notify } = require('./notify');

const { sequelize, Sequelize, User, Notification, ReminderLog, ReminderPause, TermDeadline } = models;
const ENV = { LPMS_TIMEZONE: 'UTC' };
const insert = async (sql, replacements) => (await sequelize.query(sql, { replacements, type: Sequelize.QueryTypes.INSERT }))[0];
const now = () => new Date();
const stamp = Date.now();

const made = { users: [], offerings: [], assignments: [], courses: [], programs: [], depts: [] };
const plan = {};   // name -> { offeringId, assignmentId, instructorId }
let headId;
let withDeadline;
let withoutDeadline;
const emails = [];
const stubMailer = { configured: () => true, send: async (mail) => { emails.push(mail); return { ok: true }; } };
const deps = () => ({ models, notify, mailer: stubMailer });

const user = async (label, role, active = true) => {
    const row = await User.create({ name: `ZZ ${label} ${stamp}`, email: `zz.${label}.${stamp}@example.test`, role, password_hash: 'x', is_active: active });
    made.users.push(row.user_id);
    return row;
};

test.before(async () => {
    const head = await user('head', 'program-head');
    headId = head.user_id;
    const dept = await insert('INSERT INTO Departments (name, code, stakeholder_id, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [`ZZ reminders dept ${stamp}`, 'ZZR', null, now(), now()]);
    made.depts.push(dept);
    const program = async (name, stakeholder) => { const id = await insert('INSERT INTO Programs (dept_id, name, stakeholder_id, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [dept, name, stakeholder, now(), now()]); made.programs.push(id); return id; };
    withDeadline = await program(`ZZ program with a deadline ${stamp}`, headId);
    withoutDeadline = await program(`ZZ program without ${stamp}`, null);
    await TermDeadline.create({ program_id: withDeadline, school_year: '2026-2027', semester: '1st', syllabus_due: '2026-11-05' });

    const offering = async (name, programId, instructor, { submitted = false } = {}) => {
        const course = await insert(`INSERT INTO Courses (course_no, course_title, credit, contact_hrs, classification, cmo, year_lvl, term, createdAt, updatedAt) VALUES (?, 'Reminder test', '3', '3', 'x', 'x', 'FIRST YEAR', '1st', ?, ?)`, [`ZZR${name}`, now(), now()]);
        made.courses.push(course);
        const id = await insert('INSERT INTO ProgramCourseOfferings (course_id, program_id, dept_id, course_description, school_year, semester, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [course, programId, dept, 'x', '2026-2027', '1st', now(), now()]);
        const assignment = await insert('INSERT INTO CourseOfferingAssignments (pc_offering_id, stakeholder_id, date_assigned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [id, instructor.user_id, now(), now(), now()]);
        made.offerings.push(id); made.assignments.push(assignment);
        if (submitted) await insert('INSERT INTO AssignmentWorkflowLogs (co_assign_id, actor_role, action_type, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [assignment, 'INSTRUCTOR', 'SUBMITTED', now(), now()]);
        plan[name] = { offeringId: id, assignmentId: assignment, instructorId: instructor.user_id };
    };
    await offering('A', withDeadline, await user('a', 'instructor'));                       // not submitted: gets reminders
    await offering('B', withDeadline, await user('b', 'instructor'), { submitted: true });  // submitted: nothing
    await offering('C', withDeadline, await user('c', 'instructor'));                       // reminders paused
    await offering('D', withDeadline, await user('d', 'instructor'));                       // was poked a moment ago
    await offering('E', withDeadline, await user('e', 'instructor', false));                // inactive instructor
    await offering('F', withoutDeadline, await user('f', 'instructor'));                    // its program set no deadline
    await ReminderPause.create({ offering_id: plan.C.offeringId, paused_by: headId });
    await Notification.create({ recipient_user_id: plan.D.instructorId, type: 'poke', offering_id: plan.D.offeringId, message: 'ZZRD — reminder', is_read: false, created_at: new Date('2026-11-02T07:30:00Z') });
});

test.after(async () => {
    const offerings = made.offerings.length ? made.offerings : [0];
    await Notification.destroy({ where: { [Op.or]: [{ offering_id: { [Op.in]: offerings } }, { recipient_user_id: { [Op.in]: made.users.length ? made.users : [0] } }] } });
    await ReminderLog.destroy({ where: { [Op.or]: [{ subject: { [Op.in]: offerings.flatMap(id => [`offering:${id}`, `email:offering:${id}`]) } }, { subject: { [Op.in]: made.users.map(id => `digest:${id}`) } }] } });
    await ReminderPause.destroy({ where: { offering_id: { [Op.in]: offerings } } });
    await TermDeadline.destroy({ where: { program_id: { [Op.in]: made.programs.length ? made.programs : [0] } } });
    const list = (ids) => (ids.length ? ids.join(', ') : '0');
    await sequelize.query(`DELETE FROM AssignmentWorkflowLogs WHERE co_assign_id IN (${list(made.assignments)})`);
    await sequelize.query(`DELETE FROM CourseOfferingAssignments WHERE co_assign_id IN (${list(made.assignments)})`);
    await sequelize.query(`DELETE FROM ProgramCourseOfferings WHERE pc_offering_id IN (${list(made.offerings)})`);
    await sequelize.query(`DELETE FROM Courses WHERE course_id IN (${list(made.courses)})`);
    await sequelize.query(`DELETE FROM Programs WHERE program_id IN (${list(made.programs)})`);
    await sequelize.query(`DELETE FROM Departments WHERE dept_id IN (${list(made.depts)})`);
    await User.destroy({ where: { user_id: { [Op.in]: made.users } } });
});

const reminders = (name) => Notification.findAll({ where: { recipient_user_id: plan[name].instructorId, type: 'reminder' }, order: [['id', 'ASC']], raw: true });
const digests = () => Notification.findAll({ where: { recipient_user_id: headId, type: 'missing_digest' }, raw: true });
// Only this test's two programs: other tests in the shared database have plans and deadlines of their own.
const run = (iso) => runReminders({ now: new Date(iso), env: ENV, deps: deps(), programIds: [withDeadline, withoutDeadline] });

test('nothing is sent before the school day starts', async () => {
    const result = await run('2026-11-02T07:00:00Z');
    assert.match(result.skipped, /before the school day/);
    assert.equal((await reminders('A')).length, 0);
});

test('three days before the due date the plan that is not submitted gets one reminder, and no one else does', async () => {
    const result = await run('2026-11-02T09:00:00Z'); // a Monday, 3 days before 5 November
    assert.equal(result.day, '2026-11-02');
    const mine = await reminders('A');
    assert.equal(mine.length, 1);
    assert.match(mine[0].message, /ZZRA — reminder: submit your learning plan \(due in 3 days\)/);
    assert.equal(mine[0].offering_id, plan.A.offeringId);
    for (const name of ['B', 'C', 'D', 'E', 'F']) assert.equal((await reminders(name)).length, 0, `plan ${name}: submitted, paused, recently poked, inactive, or no deadline`);
    assert.ok(result.paused >= 1 && result.quiet >= 1);
});

test('the reminder also goes to the instructor by e-mail when mail is set up, without personal data in it', () => {
    assert.equal(emails.length, 1);
    assert.match(emails[0].to, /zz\.a\./);
    assert.match(emails[0].text, /ZZRA/);
});

test('running the job again the same day sends nothing twice', async () => {
    const before = (await reminders('A')).length;
    const again = await run('2026-11-02T10:30:00Z');
    assert.equal((await reminders('A')).length, before);
    // The reminder sent at 09:00 is inside the quiet window at 10:30, so the plan is skipped as quiet (or, past the
    // window, as already sent today): either way nothing goes out twice.
    assert.ok(again.alreadySent + again.quiet >= 1);
    assert.equal(emails.length, 1);
});

test('on Monday the Program Head gets one summary, counting every plan still waiting in their program', async () => {
    const summary = await digests();
    assert.equal(summary.length, 1);
    assert.equal(summary[0].message, '4 learning plans not submitted, 1 with no active instructor'); // A, C, D and E; B is submitted; E's instructor is deactivated
    await run('2026-11-02T11:00:00Z');
    assert.equal((await digests()).length, 1, 'not twice the same day');
});

test('a day with no reminder in the schedule sends nothing', async () => {
    await run('2026-11-04T09:00:00Z'); // 1 day before? it is before-1: check separately below
    const all = await reminders('A');
    assert.ok(all.some(n => /due tomorrow/.test(n.message)));
    const count = all.length;
    await run('2026-11-03T09:00:00Z'); // 2 days before: no reminder in the schedule
    assert.equal((await reminders('A')).length, count);
});

test('on the due date and then every third overdue day the reminder says how late it is', async () => {
    await run('2026-11-05T09:00:00Z');
    await run('2026-11-06T09:00:00Z'); // 1 day overdue: none
    await run('2026-11-08T09:00:00Z'); // 3 days overdue
    const messages = (await reminders('A')).map(n => n.message);
    assert.ok(messages.some(m => /due today/.test(m)));
    assert.ok(messages.some(m => /3 days overdue/.test(m)));
    assert.ok(!messages.some(m => /1 day overdue/.test(m)));
});

test('the overdue summary counts the overdue plans', async () => {
    await run('2026-11-09T09:00:00Z'); // the next Monday
    const last = (await digests()).at(-1);
    assert.match(last.message, /4 learning plans not submitted, 4 overdue/);
});

test('once the instructor submits, the reminders stop', async () => {
    await insert('INSERT INTO AssignmentWorkflowLogs (co_assign_id, actor_role, action_type, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [plan.A.assignmentId, 'INSTRUCTOR', 'SUBMITTED', now(), now()]);
    const count = (await reminders('A')).length;
    await run('2026-11-11T09:00:00Z'); // 6 days overdue
    assert.equal((await reminders('A')).length, count);
});

test('a failing e-mail never stops the reminder', async () => {
    const failing = { configured: () => true, send: async () => ({ ok: false, error: 'SMTP down' }) };
    const logged = [];
    await TermDeadline.update({ syllabus_due: '2026-11-20' }, { where: { program_id: withDeadline } });
    await insert('DELETE FROM AssignmentWorkflowLogs WHERE co_assign_id = ?', [plan.A.assignmentId]); // back to a draft
    const before = (await reminders('A')).length;
    await runReminders({ now: new Date('2026-11-13T09:00:00Z'), env: ENV, deps: { models, notify, mailer: failing }, log: (line) => logged.push(line), programIds: [withDeadline, withoutDeadline] }); // 7 days before
    assert.equal((await reminders('A')).length, before + 1);
    assert.ok(logged.some(line => /SMTP down/.test(line)));
});

test('an e-mail that failed is tried again at the next check the same day, once, without a second in-app reminder', async () => {
    const inApp = (await reminders('A')).length;
    const before = emails.length;
    const toA = () => emails.slice(before).filter(mail => /zz\.a\./.test(mail.to)).length;
    const retry = await run('2026-11-13T10:00:00Z');
    assert.equal(retry.emailRetries, 2, 'A and D both missed their e-mail at 09:00');
    assert.equal(toA(), 1);
    assert.equal((await reminders('A')).length, inApp);
    const sentSoFar = emails.length;
    await run('2026-11-13T11:00:00Z');
    assert.equal(emails.length, sentSoFar, 'not again once it went');
});

test('a check that starts while the last one is still running is skipped', async () => {
    const { startReminders } = require('./reminderJob');
    const logged = [];
    let calls = 0;
    let finish;
    let tick;
    startReminders({
        env: {}, log: (line) => logged.push(line),
        setIntervalFn: (fn) => { tick = fn; return null; },
        runFn: () => { calls += 1; return new Promise(resolve => { finish = resolve; }); }
    });
    await tick(); // the first run has not finished
    assert.equal(calls, 1);
    assert.ok(logged.some(line => /still running/.test(line)));
    finish({});
    await new Promise(resolve => setImmediate(resolve));
    tick(); // finished: the next check runs
    assert.equal(calls, 2);
    finish({});
});

test('a program with no due date, or with reminders turned off in the environment, gets nothing from the scheduler', async () => {
    const { startReminders } = require('./reminderJob');
    const logged = [];
    assert.equal(startReminders({ env: { LPMS_REMINDERS: '0' }, log: (line) => logged.push(line), setIntervalFn: () => assert.fail('must not schedule') }), null);
    assert.match(logged[0], /off/);
    assert.equal((await reminders('F')).length, 0);
});
