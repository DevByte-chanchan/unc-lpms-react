'use strict';

// An approved plan's review record is frozen: renaming a reference or deleting a comment afterwards does not
// change it, and a plan still under review is read live. Through the real router, against the test database.
// It makes its own people, plan and reference and removes them. (node run-tests.js)
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { Op } = require('sequelize');
const models = require('../models');
const { freezeReviewRecord, approvedOrigin } = require('./reviewRecordInputs');
const { requireOfferingAccess } = require('../middleware/courseAuthorization');
const { getReviewRecord } = require('../controllers/reviewRecordController');

const { sequelize, Sequelize, User, Comment, CommentTarget, CourseOutcome, Week, Reference, WeeklyReference, ReviewRecordSnapshot } = models;
const insert = async (sql, replacements) => (await sequelize.query(sql, { replacements, type: Sequelize.QueryTypes.INSERT }))[0];
const stamp = Date.now();
const now = () => new Date();
const made = { users: [], courses: [], programs: [], depts: [], offerings: [], assignments: [], references: [], outcomes: [], weeks: [] };
const ids = {};
let server;
let base;

const makeUser = async (label, role) => {
    const row = await User.create({ name: `ZZ ${label} ${stamp}`, email: `zzsnap.${label}.${stamp}@example.test`, role, password_hash: 'x', is_active: true });
    made.users.push(row.user_id);
    return row.user_id;
};

test.before(async () => {
    ids.dean = await makeUser('dean', 'dean');
    ids.head = await makeUser('head', 'program-head');
    ids.instructor = await makeUser('ins', 'instructor');
    const dept = await insert('INSERT INTO Departments (name, code, stakeholder_id, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [`ZZ snap dept ${stamp}`, 'ZZS', ids.dean, now(), now()]);
    made.depts.push(dept);
    const program = await insert('INSERT INTO Programs (dept_id, name, stakeholder_id, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [dept, `ZZ snap program ${stamp}`, ids.head, now(), now()]);
    made.programs.push(program);
    const course = await insert(`INSERT INTO Courses (course_no, course_title, credit, contact_hrs, classification, cmo, year_lvl, term, createdAt, updatedAt) VALUES (?, 'Snapshot test', '3', '3', 'x', 'x', 'FIRST YEAR', '1st', ?, ?)`, [`ZZS${stamp}`.slice(0, 20), now(), now()]);
    made.courses.push(course);
    const offering = async (revision, approved, extra = {}) => {
        const columns = ['course_id', 'program_id', 'dept_id', 'course_description', 'school_year', 'semester', 'revision_number', 'approved_at', 'createdAt', 'updatedAt', ...Object.keys(extra)];
        const values = [course, program, dept, 'x', '2030-2031', '1st', revision, approved ? now() : null, now(), now(), ...Object.values(extra)];
        const id = await insert(`INSERT INTO ProgramCourseOfferings (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`, values);
        const assignment = await insert('INSERT INTO CourseOfferingAssignments (pc_offering_id, stakeholder_id, date_assigned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [id, String(ids.instructor), now(), now(), now()]);
        made.offerings.push(id); made.assignments.push(assignment);
        return { id, assignment };
    };
    ids.approved = await offering(1, true);
    ids.review = await offering(0, false, { school_year: '2031-2032' });
    ids.carried = await offering(1, false, { school_year: '2032-2033', carried_from_offering_id: ids.approved.id });

    const outcome = await CourseOutcome.create({ pc_offering_id: ids.approved.id, co_description: 'Outcome' });
    const week = await Week.create({ co_id: outcome.co_id, hours: 5 });
    made.outcomes.push(outcome.co_id); made.weeks.push(week.week_id);
    const reference = await Reference.create({ title: `ZZ original title ${stamp}`, type: 'Textbook', author: 'ZZ', isbn: `978${String(stamp).slice(-9)}9`, publication_year: new Date('2025-01-01'), status: 'available' });
    made.references.push(reference.reference_id);
    ids.reference = reference.reference_id;
    const link = await WeeklyReference.create({ week_id: week.week_id, reference_id: reference.reference_id });

    const comment = await Comment.create({ co_assign_id: ids.approved.assignment, commenter_role: 'PROGRAM_HEAD', commenter_user_id: ids.head, message: 'Please replace this title', resolved_status: false, week_id: week.week_id, comment_for: 'references' });
    await CommentTarget.create({ comment_id: comment.comment_id, target_id: link.weekly_reference_id });
    ids.comment = comment.comment_id;
    for (const [role, action] of [['INSTRUCTOR', 'SUBMITTED'], ['LIBRARY_DIRECTOR', 'ACCEPTED'], ['PROGRAM_HEAD', 'ACCEPTED'], ['DEAN', 'ACCEPTED']]) {
        await insert('INSERT INTO AssignmentWorkflowLogs (co_assign_id, actor_role, action_type, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [ids.approved.assignment, role, action, now(), now()]);
    }

    const app = express();
    app.use(express.json());
    app.use((req, res, next) => { const [id, role] = String(req.get('x-user') || '').split(':'); req.user = id ? { id: Number(id), role, name: 'T' } : undefined; next(); });
    // The route as routes/assignments.js declares it, without the login-session gate in front of it.
    app.get('/api/assignments/offering/:pcId/review-record', requireOfferingAccess, getReviewRecord);
    await new Promise(resolve => { server = app.listen(0, resolve); });
    base = `http://127.0.0.1:${server.address().port}/api/assignments`;
});

test.after(async () => {
    server.close();
    const list = (a) => (a.length ? a.join(', ') : '0');
    await ReviewRecordSnapshot.destroy({ where: { offering_id: { [Op.in]: made.offerings } } });
    await sequelize.query(`DELETE FROM CommentTargets WHERE comment_id IN (SELECT comment_id FROM Comments WHERE co_assign_id IN (${list(made.assignments)}))`);
    await sequelize.query(`DELETE FROM Comments WHERE co_assign_id IN (${list(made.assignments)})`);
    await WeeklyReference.destroy({ where: { week_id: { [Op.in]: made.weeks } } });
    await Reference.destroy({ where: { reference_id: { [Op.in]: made.references } } });
    await Week.destroy({ where: { week_id: { [Op.in]: made.weeks } } });
    await CourseOutcome.destroy({ where: { co_id: { [Op.in]: made.outcomes } } });
    await sequelize.query(`DELETE FROM AssignmentWorkflowLogs WHERE co_assign_id IN (${list(made.assignments)})`);
    await sequelize.query(`DELETE FROM CourseOfferingAssignments WHERE co_assign_id IN (${list(made.assignments)})`);
    await sequelize.query(`DELETE FROM ProgramCourseOfferings WHERE pc_offering_id IN (${list(made.offerings)})`);
    await sequelize.query(`DELETE FROM Courses WHERE course_id IN (${list(made.courses)})`);
    await sequelize.query(`DELETE FROM Programs WHERE program_id IN (${list(made.programs)})`);
    await sequelize.query(`DELETE FROM Departments WHERE dept_id IN (${list(made.depts)})`);
    await User.destroy({ where: { user_id: { [Op.in]: made.users } } });
});

const record = async (offeringId) => {
    const res = await fetch(`${base}/offering/${offeringId}/review-record`, { headers: { 'x-user': `${ids.dean}:dean` } });
    return { status: res.status, body: await res.json() };
};
const titleOf = (body) => JSON.stringify(body.comments || body);

test('the origin of a carry-over is the approved plan it came from; a plan under review has none', async () => {
    assert.equal(await approvedOrigin(ids.approved.id), ids.approved.id);
    assert.equal(await approvedOrigin(ids.carried.id), ids.approved.id);
    assert.equal(await approvedOrigin(ids.review.id), null);
});

test('freezing takes one copy and never overwrites it', async () => {
    assert.equal(await freezeReviewRecord(ids.approved.id), true);
    assert.equal(await freezeReviewRecord(ids.approved.id), false);
    assert.equal(await ReviewRecordSnapshot.count({ where: { offering_id: ids.approved.id } }), 1);
});

test('an approved record keeps the reference title and the comment after they are renamed and deleted', async () => {
    const before = await record(ids.approved.id);
    assert.equal(before.status, 200);
    assert.match(titleOf(before.body), /ZZ original title/);
    assert.match(titleOf(before.body), /Please replace this title/);

    await Reference.update({ title: `ZZ renamed title ${stamp}` }, { where: { reference_id: ids.reference } });
    await sequelize.query('DELETE FROM Comments WHERE comment_id = ?', { replacements: [ids.comment] });

    const after = await record(ids.approved.id);
    assert.equal(after.status, 200);
    assert.match(titleOf(after.body), /ZZ original title/, 'the frozen title');
    assert.doesNotMatch(titleOf(after.body), /renamed/);
    assert.match(titleOf(after.body), /Please replace this title/, 'the deleted comment is still in the record');
});

test('a carried-over plan\'s record is the frozen record of the plan it carries', async () => {
    const carried = await record(ids.carried.id);
    assert.equal(carried.status, 200);
    assert.match(titleOf(carried.body), /ZZ original title/);
});

test('a plan under review is read live and gets no snapshot', async () => {
    const live = await record(ids.review.id);
    assert.equal(live.status, 200);
    assert.equal(await ReviewRecordSnapshot.count({ where: { offering_id: ids.review.id } }), 0);
});
