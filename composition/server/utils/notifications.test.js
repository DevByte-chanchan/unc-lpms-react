'use strict';

// Notifications: recipients, safety, endpoints, poke, retention.
// Runs against the test database (node run-tests.js). Each test builds its own department,
// program, course and users so it never touches (or is disturbed by) the seeded plans.
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { Op } = require('sequelize');
const { sequelize, Sequelize, User, Notification, AuditLog } = require('../models');
const { pendingReviewerRoles } = require('./workflowRules');
const { planEvent, onComment, onCommentsResolved, onCourseAssigned, onRevisionStarted } = require('./notificationEvents');
const { createNotifier, eventMessage, TYPES } = require('./notify');
const { purgeReadNotifications, startRetention } = require('./notificationRetention');
const { recordWorkflowAction } = require('../controllers/assignmentController');
const { submitLearningPlan } = require('../controllers/submissionController');
const { cloneOfferingContent } = require('../services/offeringService');
const { issueSession, createRequireAuth, COOKIE_NAME } = require('../middleware/auth');

const stamp = Date.now();
let counter = 0;
const q = (sql, replacements = []) => sequelize.query(sql, { replacements, type: Sequelize.QueryTypes.SELECT });
const insert = async (table, row) => {
    const keys = Object.keys(row);
    const [id] = await sequelize.query(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')});`, {
        // Dates are written in the UTC text format the models use; raw Date binding would use local time and mis-sort.
        replacements: keys.map(k => (row[k] instanceof Date ? row[k].toISOString().replace('T', ' ').replace('Z', ' +00:00') : row[k])), type: Sequelize.QueryTypes.INSERT
    });
    return id;
};
const makeUser = (role, label) => User.create({
    name: `${label || role} ${++counter}`, email: `n${counter}.${stamp}@example.test`, role, password_hash: 'x'
});

// One isolated course: its own dean, program head, instructor and a plan, with only an ASSIGNED log.
const fixture = async () => {
    const [instructor, ph, dean, ld] = await Promise.all([makeUser('instructor'), makeUser('program-head'), makeUser('dean'), makeUser('director-of-libraries')]);
    const now = new Date();
    const stamps = { createdAt: now, updatedAt: now };
    const deptId = await insert('Departments', { stakeholder_id: dean.user_id, name: `Dept ${counter}.${stamp}`, code: `D${counter}`, ...stamps });
    const programId = await insert('Programs', { dept_id: deptId, name: `Program ${counter}.${stamp}`, stakeholder_id: ph.user_id, ...stamps });
    const code = `NT${counter}${String(stamp).slice(-4)}`;
    const courseId = await insert('Courses', { course_no: code, course_title: 'Notification Test', credit: 3, contact_hrs: 3, classification: 'Core', cmo: 'CMO', year_lvl: 1, term: '1st', ...stamps });
    const offeringId = await insert('ProgramCourseOfferings', {
        revision_number: 0, course_id: courseId, program_id: programId, dept_id: deptId, course_description: 'x',
        school_year: '2098-2099', semester: '1st', ...stamps
    });
    const assignmentId = await insert('CourseOfferingAssignments', { pc_offering_id: offeringId, stakeholder_id: String(instructor.user_id), date_assigned: now, ...stamps });
    await insert('AssignmentWorkflowLogs', { co_assign_id: assignmentId, actor_role: 'PROGRAM_HEAD', action_type: 'ASSIGNED', ...stamps });
    return { instructor, ph, dean, ld, offeringId, assignmentId, code };
};

const ACCOUNT = { INSTRUCTOR: 'instructor', LIBRARY_DIRECTOR: 'director-of-libraries', PROGRAM_HEAD: 'program-head', DEAN: 'dean' };
// Drives the real workflow controller as the given person.
const act = async (f, who, role, action) => {
    const user = f[who];
    const res = { code: 200, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
    await recordWorkflowAction({
        body: { actor_role: role, action_type: action, pcId: f.offeringId },
        user: { id: user.user_id, name: user.name, role: ACCOUNT[role] }, ip: '::1'
    }, res, err => { throw err; });
    return res;
};
const inbox = (user, type) => Notification.findAll({ where: { recipient_user_id: user.user_id, ...(type ? { type } : {}) }, order: [['id', 'ASC']] });

// ------------------------------------------------------------------ pure rules

const L = (actor_role, action_type) => ({ actor_role, action_type });
test('pendingReviewerRoles: who must act now', () => {
    const sub = L('INSTRUCTOR', 'SUBMITTED');
    assert.deepEqual(pendingReviewerRoles([]), []);
    assert.deepEqual(pendingReviewerRoles([sub]), ['LIBRARY_DIRECTOR', 'PROGRAM_HEAD']);
    assert.deepEqual(pendingReviewerRoles([sub, L('LIBRARY_DIRECTOR', 'ACCEPTED')]), ['PROGRAM_HEAD']);
    assert.deepEqual(pendingReviewerRoles([sub, L('LIBRARY_DIRECTOR', 'ACCEPTED'), L('PROGRAM_HEAD', 'ACCEPTED')]), ['DEAN']);
    assert.deepEqual(pendingReviewerRoles([sub, L('PROGRAM_HEAD', 'RETURNED')]), [], 'waiting for the instructor');
    assert.deepEqual(pendingReviewerRoles([sub, L('PROGRAM_HEAD', 'RETURNED'), sub, L('LIBRARY_DIRECTOR', 'ACCEPTED')]), ['PROGRAM_HEAD'], 'resubmission goes to the returner only');
    assert.deepEqual(pendingReviewerRoles([sub, L('LIBRARY_DIRECTOR', 'ACCEPTED'), L('PROGRAM_HEAD', 'ACCEPTED'), L('DEAN', 'ACCEPTED')]), [], 'approved');
    assert.deepEqual(pendingReviewerRoles([sub, L('LIBRARY_DIRECTOR', 'ACCEPTED'), L('PROGRAM_HEAD', 'ACCEPTED'), L('DEAN', 'RETURNED'), sub]), ['DEAN'], 'a Dean return comes back to the Dean');
});

test('planEvent: resubmission, return, partial acceptance, ready for Dean, approval', () => {
    const people = { courseCode: 'X1', instructor: [1], programHead: [2], dean: [5], libraryDirectors: [3, 4] };
    const sub = L('INSTRUCTOR', 'SUBMITTED');
    const ev = (actorRole, action, logsAfter) => planEvent({ actorRole, action, logsAfter, people });

    assert.deepEqual(ev('INSTRUCTOR', 'SUBMITTED', [sub]).recipients, [3, 4, 2]);
    // The Library Director had accepted, the Program Head returned: only the Program Head hears about the resubmission.
    assert.deepEqual(ev('INSTRUCTOR', 'SUBMITTED', [sub, L('LIBRARY_DIRECTOR', 'ACCEPTED'), L('PROGRAM_HEAD', 'RETURNED'), sub]).recipients, [2]);
    assert.deepEqual([ev('PROGRAM_HEAD', 'RETURNED', [sub, L('PROGRAM_HEAD', 'RETURNED')]).type, ev('DEAN', 'RETURNED', []).recipients], ['plan_returned', [1]]);
    assert.equal(ev('LIBRARY_DIRECTOR', 'ACCEPTED', [sub, L('LIBRARY_DIRECTOR', 'ACCEPTED')]), null, 'the first of two reviewers accepting tells nobody');
    const ready = ev('PROGRAM_HEAD', 'ACCEPTED', [sub, L('LIBRARY_DIRECTOR', 'ACCEPTED'), L('PROGRAM_HEAD', 'ACCEPTED')]);
    assert.deepEqual([ready.type, ready.recipients], ['plan_ready_for_dean', [5]]);
    const approved = ev('DEAN', 'ACCEPTED', [sub, L('LIBRARY_DIRECTOR', 'ACCEPTED'), L('PROGRAM_HEAD', 'ACCEPTED'), L('DEAN', 'ACCEPTED')]);
    assert.deepEqual([approved.type, approved.recipients], ['plan_approved', [1, 2, 3, 4]]);
});

// ------------------------------------------------- the instructor's submit route

// A fixture whose plan passes the real submit gates: the content (outcomes, ILOs with I/E/D levels,
// assessments weighted 20/30/50) is copied from a seeded plan, which only reads the seed.
const withValidPlan = async (f) => {
    const [seed] = await q('SELECT pc_offering_id FROM ProgramCourseOfferings WHERE pc_offering_id = 1');
    assert.ok(seed, 'the seeded demo plan exists');
    const now = new Date();
    await sequelize.transaction(t => cloneOfferingContent(seed.pc_offering_id, f.offeringId, now, t));
    return f;
};
const submit = async (f) => {
    const res = { code: 200, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
    await submitLearningPlan({ params: { pcId: String(f.offeringId) }, user: { id: f.instructor.user_id, name: f.instructor.name, role: 'instructor' } }, res);
    return res;
};
const submittedLogs = (f) => q(`SELECT COUNT(*) AS n FROM AssignmentWorkflowLogs WHERE co_assign_id = ? AND action_type = 'SUBMITTED'`, [f.assignmentId]).then(r => r[0].n);

test('submit route: a valid plan is submitted and the reviewers are notified, not the instructor', async () => {
    const f = await withValidPlan(await fixture());
    const res = await submit(f);
    assert.equal(res.code, 200, JSON.stringify(res.body));
    assert.equal(await submittedLogs(f), 1);
    for (const reviewer of [f.ph, f.ld]) {
        const [n] = await inbox(reviewer, 'plan_submitted');
        assert.equal(n.message, `${f.code} — submitted for review by Instructor`);
        assert.equal(n.offering_id, f.offeringId);
    }
    assert.equal((await inbox(f.instructor)).length, 0);
    assert.equal((await inbox(f.dean)).length, 0);

    // Submitting again while pending is idempotent: no second log, no second notification.
    const again = await submit(f);
    assert.equal(again.code, 200);
    assert.equal(await submittedLogs(f), 1);
    assert.equal((await inbox(f.ph, 'plan_submitted')).length, 1);
});

test('submit route: a plan that fails the gates is refused and nobody is notified', async () => {
    const f = await fixture(); // no outcomes, no assessments
    const res = await submit(f);
    assert.equal(res.code, 400);
    assert.ok(res.body.blockers.length > 0);
    assert.equal(await submittedLogs(f), 0);
    assert.equal((await inbox(f.ph)).length + (await inbox(f.ld)).length, 0);
});

test('submit route: a notification failure does not undo or fail the submission', async () => {
    const f = await withValidPlan(await fixture());
    const original = Notification.bulkCreate;
    const originalError = console.error;
    const lines = [];
    Notification.bulkCreate = async () => { throw new Error('notifications are down'); };
    console.error = (...args) => lines.push(args.join(' '));
    let res;
    try { res = await submit(f); } finally { Notification.bulkCreate = original; console.error = originalError; }
    assert.equal(res.code, 200);
    assert.equal(res.body.status, 'success');
    assert.equal(await submittedLogs(f), 1, 'the submission stands');
    assert.equal(lines.length, 1);
    assert.match(lines[0], /notifications are down/);
});

// ------------------------------------------------------------------ notify()

test('notify never throws: a failing write is logged once and reported as 0', async () => {
    const logged = [];
    const failing = createNotifier({ getModel: () => ({ bulkCreate: async () => { throw new Error('disk full'); } }), log: (...a) => logged.push(a.join(' ')) });
    assert.equal(await failing.notify([1, 2], 'plan_submitted', 5, 'X — y', 'INSTRUCTOR'), 0);
    assert.equal(logged.length, 1);
    assert.match(logged[0], /disk full/);
    assert.equal(await failing.notify([1], 'not_a_type', 5, 'x'), 0, 'unknown type is rejected, not thrown');
    assert.equal(logged.length, 2);
    const broken = createNotifier({ getModel: () => { throw new Error('model missing'); }, log: () => {} });
    assert.equal(await broken.notify([1], 'poke', 1, 'x'), 0);
});

test('notify de-duplicates recipients, drops invalid ids and truncates the message', async () => {
    const rows = [];
    const n = createNotifier({ getModel: () => ({ bulkCreate: async r => { rows.push(...r); } }) });
    assert.equal(await n.notify([3, '3', 4, null, undefined, 'x', -1, 0, 1.5], 'plan_returned', 9, 'm'.repeat(500), 'DEAN'), 2);
    assert.deepEqual(rows.map(r => r.recipient_user_id), [3, 4]);
    assert.equal(rows[0].message.length, 200);
    assert.deepEqual([rows[0].offering_id, rows[0].actor_role, rows[0].is_read], [9, 'DEAN', false]);
    assert.equal(await n.notify([], 'poke', 1, 'x'), 0);
    assert.ok(TYPES.includes('poke'));
});

test('messages carry only the course code, the action and the actor role', () => {
    assert.equal(eventMessage('BIT321L', 'submitted for review', 'INSTRUCTOR'), 'BIT321L — submitted for review by Instructor');
    assert.equal(eventMessage('BIT321L', 'approved', 'DEAN'), 'BIT321L — approved by Dean');
    assert.equal(eventMessage('<b>X</b>;DROP', 'approved', 'dean'), 'bXbDROP — approved by Dean', 'markup characters are stripped from the code');
    assert.equal(eventMessage('', 'poked'), 'A course — poked');
});

// -------------------------------------------------------------- workflow hooks

test('the workflow notifies the right people at each step, and never the actor', async () => {
    const f = await fixture();
    const other = await makeUser('instructor');

    assert.equal((await act(f, 'instructor', 'INSTRUCTOR', 'SUBMITTED')).code, 201);
    for (const reviewer of [f.ph, f.ld]) {
        const [n] = await inbox(reviewer, 'plan_submitted');
        assert.equal(n.offering_id, f.offeringId);
        assert.equal(n.actor_role, 'INSTRUCTOR');
        assert.equal(n.message, `${f.code} — submitted for review by Instructor`);
        assert.equal(n.is_read, false);
    }
    assert.equal((await inbox(f.instructor)).length, 0, 'the actor is not told about their own action');
    assert.equal((await inbox(f.dean)).length, 0, 'the Dean is not told yet');
    assert.equal((await inbox(other)).length, 0, 'unrelated users are not told');

    // The Program Head returns it: the instructor hears, nobody else.
    assert.equal((await act(f, 'ph', 'PROGRAM_HEAD', 'RETURNED')).code, 201);
    assert.equal((await inbox(f.instructor, 'plan_returned')).length, 1);
    assert.equal((await inbox(f.ph, 'plan_returned')).length, 0);

    // Resubmission after the return: only the returner (the Program Head) is asked again.
    const phBefore = (await inbox(f.ph, 'plan_submitted')).length;
    const ldBefore = (await inbox(f.ld, 'plan_submitted')).length;
    await act(f, 'ld', 'LIBRARY_DIRECTOR', 'ACCEPTED');
    assert.equal((await act(f, 'instructor', 'INSTRUCTOR', 'SUBMITTED')).code, 201);
    assert.equal((await inbox(f.ph, 'plan_submitted')).length, phBefore + 1);
    assert.equal((await inbox(f.ld, 'plan_submitted')).length, ldBefore, 'the Director of Libraries had already accepted');

    // Second acceptance: now the Dean is told.
    assert.equal((await inbox(f.dean)).length, 0);
    await act(f, 'ph', 'PROGRAM_HEAD', 'ACCEPTED');
    const [ready] = await inbox(f.dean, 'plan_ready_for_dean');
    assert.equal(ready.message, `${f.code} — accepted, ready for the Dean by Program Head`);

    // Final approval: instructor, Program Head and Library Director hear, the Dean (actor) does not.
    assert.equal((await act(f, 'dean', 'DEAN', 'ACCEPTED')).code, 201);
    for (const person of [f.instructor, f.ph, f.ld]) assert.equal((await inbox(person, 'plan_approved')).length, 1);
    assert.equal((await inbox(f.dean, 'plan_approved')).length, 0);
    assert.equal((await inbox(other)).length, 0);
});

test('a notification failure never breaks the main action', async () => {
    const f = await fixture();
    await act(f, 'instructor', 'INSTRUCTOR', 'SUBMITTED');
    await act(f, 'ph', 'PROGRAM_HEAD', 'ACCEPTED');

    const original = Notification.bulkCreate;
    const originalError = console.error;
    const lines = [];
    Notification.bulkCreate = async () => { throw new Error('notifications table is gone'); };
    console.error = (...args) => lines.push(args.join(' '));
    let res;
    try {
        res = await act(f, 'ld', 'LIBRARY_DIRECTOR', 'ACCEPTED'); // would notify the Dean
    } finally {
        Notification.bulkCreate = original;
        console.error = originalError;
    }
    assert.equal(res.code, 201, 'the acceptance is still recorded');
    const [{ n }] = await q(`SELECT COUNT(*) AS n FROM AssignmentWorkflowLogs WHERE co_assign_id = ? AND actor_role = 'LIBRARY_DIRECTOR' AND action_type = 'ACCEPTED'`, [f.assignmentId]);
    assert.equal(n, 1);
    assert.equal(lines.length, 1, 'one console line');
    assert.match(lines[0], /notifications table is gone/);
    assert.equal((await inbox(f.dean)).length, 0);
});

test('comments, resolved comments, assignments and revisions reach the right person with a plain message', async () => {
    const f = await fixture();
    const author = await makeUser('program-head');

    // A reviewer's comment goes to the instructor; the comment text is never in the message.
    await onComment({ offeringId: f.offeringId, actorUserId: f.ph.user_id, commenterRole: 'PROGRAM_HEAD' });
    const [comment] = await inbox(f.instructor, 'comment_added');
    assert.equal(comment.message, `${f.code} — comment added by Program Head`);
    assert.equal((await inbox(f.ph, 'comment_added')).length, 0);

    // The instructor resolves two of the author's comments on one plan: one notification, to the author.
    await onCommentsResolved({
        resolved: [{ authorUserId: author.user_id, offeringId: f.offeringId }, { authorUserId: author.user_id, offeringId: f.offeringId }, { authorUserId: null, offeringId: f.offeringId }],
        actorUserId: f.instructor.user_id, actorRole: 'instructor'
    });
    const resolved = await inbox(author, 'comment_resolved');
    assert.equal(resolved.length, 1);
    assert.equal(resolved[0].message, `${f.code} — comments marked resolved by Instructor`);

    await onCourseAssigned({ offeringId: f.offeringId, instructorUserId: f.instructor.user_id, actorUserId: f.ph.user_id });
    assert.equal((await inbox(f.instructor, 'course_assigned'))[0].message, `${f.code} — course assigned to you by Program Head`);

    await onRevisionStarted({ offeringId: f.offeringId, actorUserId: f.instructor.user_id });
    assert.equal((await inbox(f.ph, 'revision_started')).length, 1);
    assert.equal((await inbox(f.instructor, 'revision_started')).length, 0);

    for (const n of [...await inbox(f.instructor), ...await inbox(f.ph), ...resolved]) {
        assert.match(n.message, /^[A-Za-z0-9 ._-]+ — [a-z ,:]+( by [A-Za-z ]+)?$/, n.message);
    }
});

// ------------------------------------------------------------------ endpoints

let server;
let base;
test.before(async () => {
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => { req.user = { id: Number(req.headers['x-id']), name: 'T', role: req.headers['x-role'] || 'instructor' }; next(); });
    app.use('/api/notifications', require('../routes/notifications'));
    await new Promise(resolve => { server = app.listen(0, resolve); });
    base = `http://127.0.0.1:${server.address().port}/api/notifications`;
});
test.after(() => server.close());

const call = (as, method, path = '', body) => fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-id': String(as.user_id), 'x-role': as.role },
    body: body ? JSON.stringify(body) : undefined
});
const give = (user, count, extra = {}) => Notification.bulkCreate(Array.from({ length: count }, (_, i) => ({
    recipient_user_id: user.user_id, type: 'plan_submitted', offering_id: null, message: `T${i} — x`, actor_role: 'INSTRUCTOR',
    created_at: new Date(Date.now() - (count - i) * 1000), ...extra
})));

test('endpoints are scoped to the signed-in user: list, count, paging, mark read, read all', async () => {
    const a = await makeUser('instructor');
    const b = await makeUser('instructor');
    await give(a, 5);
    await give(b, 3);

    const list = await (await call(a, 'GET')).json();
    assert.equal(list.total, 5);
    assert.equal(list.unread, 5);
    assert.equal(list.rows.length, 5);
    assert.deepEqual(list.rows.map(r => r.message), ['T4 — x', 'T3 — x', 'T2 — x', 'T1 — x', 'T0 — x'], 'newest first');
    assert.deepEqual(Object.keys(list.rows[0]).sort(), ['actorRole', 'createdAt', 'id', 'isRead', 'message', 'offeringId', 'readAt', 'type']);
    const page = await (await call(a, 'GET', '?limit=2&offset=2')).json();
    assert.deepEqual(page.rows.map(r => r.message), ['T2 — x', 'T1 — x']);
    assert.equal(page.total, 5);
    assert.equal((await (await call(a, 'GET', '/unread-count')).json()).count, 5);
    assert.equal((await (await call(b, 'GET', '/unread-count')).json()).count, 3);

    // Someone else's notification is "not found", and stays unread.
    const bOwn = list.rows[0].id;
    const forB = await Notification.findOne({ where: { recipient_user_id: b.user_id } });
    assert.equal((await call(a, 'PUT', `/${forB.id}/read`)).status, 404);
    assert.equal((await Notification.findByPk(forB.id)).is_read, false);
    assert.equal((await call(a, 'PUT', '/abc/read')).status, 404);

    assert.equal((await call(a, 'PUT', `/${bOwn}/read`)).status, 200);
    const read = await Notification.findByPk(bOwn);
    assert.equal(read.is_read, true);
    assert.ok(read.read_at);
    assert.equal((await (await call(a, 'GET', '?unread=1')).json()).total, 4);

    const all = await (await call(a, 'PUT', '/read-all')).json();
    assert.equal(all.updated, 4);
    assert.equal((await (await call(a, 'GET', '/unread-count')).json()).count, 0);
    assert.equal((await (await call(b, 'GET', '/unread-count')).json()).count, 3, 'read-all leaves other users alone');
});

test('no route takes a user id, and the only user-id input is the poke target', () => {
    const router = require('../routes/notifications');
    const paths = router.stack.map(layer => layer.route?.path).filter(Boolean);
    assert.ok(paths.length >= 6);
    assert.ok(paths.every(p => !/user/i.test(p)), paths.join(', '));
});

test('the forced-password gate also covers notifications', async () => {
    const user = await makeUser('instructor');
    await User.update({ must_change_password: true, temp_password_expires_at: new Date(Date.now() + 3600000) }, { where: { user_id: user.user_id } });
    const app = express();
    app.use(express.json());
    app.use('/api', createRequireAuth());
    app.use('/api/notifications', require('../routes/notifications'));
    const gate = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)); });
    const url = `http://127.0.0.1:${gate.address().port}/api/notifications/unread-count`;
    const headers = { cookie: `${COOKIE_NAME}=${issueSession({ user_id: user.user_id, name: user.name, role: 'instructor' })}` };
    try {
        const blocked = await fetch(url, { headers });
        assert.equal(blocked.status, 403);
        assert.equal((await blocked.json()).code, 'PASSWORD_CHANGE_REQUIRED');
        await User.update({ must_change_password: false, temp_password_expires_at: null }, { where: { user_id: user.user_id } });
        assert.equal((await fetch(url, { headers })).status, 200);
    } finally { gate.close(); }
});

// ------------------------------------------------------------------------ poke

const poke = (as, offeringId, targetUserId) => call(as, 'POST', '/poke', { offeringId, targetUserId });

test('poke permissions: Program Head and Dean only, and only for the assigned instructor', async () => {
    const f = await fixture(); // assigned, not yet submitted

    for (const nobody of [f.instructor, f.ld, { user_id: f.instructor.user_id, role: 'industry-consultant' }, { user_id: f.instructor.user_id, role: 'vpaa' }]) {
        assert.equal((await poke(nobody, f.offeringId, f.instructor.user_id)).status, 403, nobody.role);
    }
    assert.equal((await call(f.ld, 'GET', `/poke-targets/${f.offeringId}`)).status, 403);

    assert.equal((await poke(f.ph, f.offeringId, f.ph.user_id)).status, 400, 'not yourself');
    assert.equal((await poke(f.ph, 'x', f.instructor.user_id)).status, 400);
    assert.equal((await poke(f.ph, f.offeringId, undefined)).status, 400);
    assert.equal((await poke(f.ph, 999999, f.instructor.user_id)).status, 404, 'unknown offering');
    assert.equal((await poke({ user_id: 999999, role: 'program-head' }, f.offeringId, f.instructor.user_id)).status, 403, 'a Program Head of another program has no access');
    assert.equal((await poke(f.ph, f.offeringId, f.ld.user_id)).status, 409, 'a reviewer is not the instructor');
    assert.equal((await poke(f.ph, f.offeringId, f.dean.user_id)).status, 409, 'the Dean is not the instructor');
    assert.equal((await poke(f.ph, f.offeringId, 999999)).status, 409, 'unknown person');
    const other = await makeUser('instructor'); // an instructor, but not the one assigned here
    assert.equal((await poke(f.ph, f.offeringId, other.user_id)).status, 409, 'an instructor of another course');
    other.is_active = false;
    await other.save();
    assert.equal((await poke(f.ph, f.offeringId, other.user_id)).status, 409, 'inactive account');
    assert.equal((await Notification.count({ where: { type: 'poke', offering_id: f.offeringId } })), 0, 'nothing was sent by the refusals');
});

test('poke: delivered, audited, and limited to one per instructor per offering per 4 hours', async () => {
    const f = await fixture();

    const first = await poke(f.ph, f.offeringId, f.instructor.user_id);
    assert.equal(first.status, 201);
    const [n] = await inbox(f.instructor, 'poke');
    assert.equal(n.message, `${f.code} — reminder: submit your learning plan by Program Head`);
    assert.equal(n.actor_role, 'PROGRAM_HEAD');
    assert.equal(n.offering_id, f.offeringId);

    const audit = await AuditLog.findAll({ where: { action: 'NOTIFICATION_POKE', entity_id: String(f.offeringId) } });
    assert.equal(audit.length, 1);
    assert.deepEqual(JSON.parse(audit[0].details), { target_user_id: f.instructor.user_id, offering_id: f.offeringId });
    assert.equal(audit[0].actor_user_id, f.ph.user_id);

    const again = await poke(f.ph, f.offeringId, f.instructor.user_id);
    assert.equal(again.status, 429);
    const body = await again.json();
    assert.ok(body.retryAfterSeconds > 4 * 3600 - 60 && body.retryAfterSeconds <= 4 * 3600);
    assert.equal(again.headers.get('retry-after'), String(body.retryAfterSeconds));
    assert.equal((await poke(f.dean, f.offeringId, f.instructor.user_id)).status, 429, 'the limit is per target and offering, whoever pokes');
    assert.equal((await Notification.count({ where: { type: 'poke', recipient_user_id: f.instructor.user_id } })), 1);

    const targets = await (await call(f.ph, 'GET', `/poke-targets/${f.offeringId}`)).json();
    assert.deepEqual(targets.targets.map(t => t.userId), [f.instructor.user_id], 'the instructor is the only target');
    assert.ok(targets.targets[0].nextPokeAt, 'the poked instructor shows when they can be poked again');

    // After the window the same pair can be poked again.
    await Notification.update({ created_at: new Date(Date.now() - 5 * 3600 * 1000) }, { where: { id: n.id } }); // via the model, so it is stored in the same UTC format
    assert.equal((await poke(f.ph, f.offeringId, f.instructor.user_id)).status, 201);
});

test('poke only while the plan is unsubmitted or returned', async () => {
    const f = await fixture();
    await act(f, 'instructor', 'INSTRUCTOR', 'SUBMITTED');
    assert.equal((await poke(f.ph, f.offeringId, f.instructor.user_id)).status, 409, 'submitted: nothing to remind');
    assert.deepEqual((await (await call(f.ph, 'GET', `/poke-targets/${f.offeringId}`)).json()).targets, []);

    await act(f, 'ph', 'PROGRAM_HEAD', 'RETURNED');
    assert.equal((await poke(f.ph, f.offeringId, f.instructor.user_id)).status, 201, 'returned: waiting for the instructor again');
});

// ------------------------------------------------------------------ retention

test('retention purges read notifications older than 90 days, keeps unread and recent ones', async () => {
    const user = await makeUser('instructor');
    const day = 24 * 3600 * 1000;
    const make = (age, isRead, message) => Notification.create({
        recipient_user_id: user.user_id, type: 'plan_submitted', message, is_read: isRead, created_at: new Date(Date.now() - age * day)
    });
    await make(100, true, 'old read');
    await make(100, false, 'old unread');
    await make(10, true, 'recent read');
    await make(91, true, 'just over 90 days');
    await make(89, true, 'just under 90 days');

    // Exactly the read notifications older than 90 days go: the number the purge reports, the number
    // that were eligible, and the number gone afterwards must all agree (and include the two above).
    const cutoff = new Date(Date.now() - 90 * day);
    const eligible = () => Notification.count({ where: { is_read: true, created_at: { [Op.lt]: cutoff } } });
    const eligibleBefore = await eligible();
    assert.ok(eligibleBefore >= 2, 'the old read notifications created above are eligible');
    const removed = await purgeReadNotifications({ Notification });
    assert.equal(removed, eligibleBefore, 'the purge reports every eligible row and nothing else');
    assert.equal(await eligible(), 0, 'no read notification older than 90 days is left');
    const left = (await Notification.findAll({ where: { recipient_user_id: user.user_id } })).map(n => n.message).sort();
    assert.deepEqual(left, ['just under 90 days', 'old unread', 'recent read']);

    // Boot: runs once immediately and schedules itself daily without holding the process open.
    await make(200, true, 'old read at boot');
    let scheduled = null;
    const timer = startRetention({ Notification, log: () => {}, setIntervalFn: (fn, ms) => { scheduled = { fn, ms }; return { unref() { this.unrefd = true; }, unrefd: false }; } });
    assert.equal(scheduled.ms, 24 * 3600 * 1000);
    assert.equal(timer.unrefd, true);
    for (let i = 0; i < 50 && await Notification.count({ where: { message: 'old read at boot' } }); i += 1) await new Promise(r => setTimeout(r, 20));
    assert.equal(await Notification.count({ where: { message: 'old read at boot' } }), 0, 'purged at boot');
});

test('the migration removes the old reviewer reminders and nothing else', async () => {
    const user = await makeUser('director-of-libraries');
    const row = (type, message) => ({ recipient_user_id: user.user_id, type, offering_id: null, message, actor_role: 'PROGRAM_HEAD', is_read: false });
    const [oldPoke, newPoke, other] = await Notification.bulkCreate([
        row('poke', 'MATH311L — reminder: review pending by Program Head'),
        row('poke', 'BIT312L — reminder: submit your learning plan by Program Head'),
        row('plan_submitted', 'BIT312L — submitted for review by Instructor')
    ]);
    await require('../migrations/20260917000000-remove-reviewer-pokes').up(sequelize.getQueryInterface());
    assert.equal(await Notification.findByPk(oldPoke.id), null, 'the old reviewer reminder is gone');
    assert.ok(await Notification.findByPk(newPoke.id), 'the new instructor reminder stays');
    assert.ok(await Notification.findByPk(other.id), 'other notifications stay');
});
