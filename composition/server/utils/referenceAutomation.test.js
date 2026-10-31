'use strict';

// The automatic reference jobs, against the test database with a clock the test controls: the Director's weekly
// digest of references that need attention, the heads-up when a submitted plan uses flagged titles, and the
// alert to Program Heads when a title they use stops being available. It makes its own people, program, plan
// and references and removes them. (node run-tests.js)
const test = require('node:test');
const assert = require('node:assert/strict');
const { Op } = require('sequelize');
const models = require('../models');
const { remindDirectors } = require('./reminderJob');
const { onWorkflowAction } = require('./notificationEvents');
const { onReferenceEdited } = require('./referenceAlerts');
const { notify } = require('./notify');
const health = require('./referenceHealth');

const { sequelize, Sequelize, User, Notification, ReminderLog, Reference, CourseOutcome, IntendedLearningOutcome, ILOReference } = models;
const insert = async (sql, replacements) => (await sequelize.query(sql, { replacements, type: Sequelize.QueryTypes.INSERT }))[0];
const stamp = Date.now();
const now = () => new Date();
const DAYS = ['2031-04-07', '2031-04-08', '2031-04-14'];
const made = { users: [], references: [], courses: [], programs: [], depts: [], offerings: [], assignments: [], outcomes: [], ilos: [] };
const ids = {};

const makeUser = async (label, role) => {
    const row = await User.create({ name: `ZZ ${label} ${stamp}`, email: `zzauto.${label}.${stamp}@example.test`, role, password_hash: 'x', is_active: true });
    made.users.push(row.user_id);
    return row.user_id;
};

test.before(async () => {
    ids.dean = await makeUser('dean', 'dean');
    ids.head = await makeUser('head', 'program-head');
    ids.otherHead = await makeUser('otherHead', 'program-head');
    ids.director = await makeUser('director', 'director-of-libraries');
    ids.instructor = await makeUser('ins', 'instructor');
    const dept = await insert('INSERT INTO Departments (name, code, stakeholder_id, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [`ZZ auto dept ${stamp}`, 'ZZU', ids.dean, now(), now()]);
    made.depts.push(dept);
    const program = await insert('INSERT INTO Programs (dept_id, name, stakeholder_id, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [dept, `ZZ auto program ${stamp}`, ids.head, now(), now()]);
    made.programs.push(program);
    const course = await insert(`INSERT INTO Courses (course_no, course_title, credit, contact_hrs, classification, cmo, year_lvl, term, createdAt, updatedAt) VALUES (?, 'Automation test', '3', '3', 'x', 'x', 'FIRST YEAR', '1st', ?, ?)`, [`ZZU${stamp}`.slice(0, 20), now(), now()]);
    made.courses.push(course);
    ids.code = `ZZU${stamp}`.slice(0, 20);
    ids.offering = await insert('INSERT INTO ProgramCourseOfferings (course_id, program_id, dept_id, course_description, school_year, semester, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [course, program, dept, 'x', '2030-2031', '1st', now(), now()]);
    made.offerings.push(ids.offering);
    ids.assignment = await insert('INSERT INTO CourseOfferingAssignments (pc_offering_id, stakeholder_id, date_assigned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [ids.offering, String(ids.instructor), now(), now(), now()]);
    made.assignments.push(ids.assignment);
    await insert('INSERT INTO AssignmentWorkflowLogs (co_assign_id, actor_role, action_type, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [ids.assignment, 'INSTRUCTOR', 'SUBMITTED', now(), now()]);

    const outcome = await CourseOutcome.create({ pc_offering_id: ids.offering, co_description: 'Test outcome' });
    const ilo = await IntendedLearningOutcome.create({ co_id: outcome.co_id, description: 'Test ILO' });
    made.outcomes.push(outcome.co_id); made.ilos.push(ilo.ilo_id);
    const reference = async (title, fields) => {
        const row = await Reference.create({ title: `ZZ ${title} ${stamp}`, type: 'Textbook', author: 'ZZ Author', isbn: `978${String(stamp).slice(-9)}${made.references.length}`, publication_year: new Date('2025-01-01'), status: 'available', ...fields });
        made.references.push(row.reference_id);
        await ILOReference.create({ ilo_id: ilo.ilo_id, reference_id: row.reference_id });
        return row;
    };
    ids.good = await reference('good', {});
    ids.old = await reference('old', { publication_year: new Date('2001-01-01') });
});

test.after(async () => {
    const list = (a) => (a.length ? a.join(', ') : '0');
    await Notification.destroy({ where: { [Op.or]: [{ offering_id: { [Op.in]: made.offerings } }, { recipient_user_id: { [Op.in]: made.users } }, { type: 'reference_health', created_at: { [Op.gte]: new Date(Date.now() - 600000) } }] } });
    await ReminderLog.destroy({ where: { kind: 'digest', subject: { [Op.like]: 'refhealth:%' }, day: { [Op.in]: DAYS } } });
    await ILOReference.destroy({ where: { ilo_id: { [Op.in]: made.ilos } } });
    await Reference.destroy({ where: { reference_id: { [Op.in]: made.references } } });
    await IntendedLearningOutcome.destroy({ where: { ilo_id: { [Op.in]: made.ilos } } });
    await CourseOutcome.destroy({ where: { co_id: { [Op.in]: made.outcomes } } });
    await sequelize.query(`DELETE FROM AssignmentWorkflowLogs WHERE co_assign_id IN (${list(made.assignments)})`);
    await sequelize.query(`DELETE FROM CourseOfferingAssignments WHERE co_assign_id IN (${list(made.assignments)})`);
    await sequelize.query(`DELETE FROM ProgramCourseOfferings WHERE pc_offering_id IN (${list(made.offerings)})`);
    await sequelize.query(`DELETE FROM Courses WHERE course_id IN (${list(made.courses)})`);
    await sequelize.query(`DELETE FROM Programs WHERE program_id IN (${list(made.programs)})`);
    await sequelize.query(`DELETE FROM Departments WHERE dept_id IN (${list(made.depts)})`);
    await User.destroy({ where: { user_id: { [Op.in]: made.users } } });
});

const inbox = async (id, type) => (await Notification.findAll({ where: { recipient_user_id: id, type }, order: [['id', 'ASC']], raw: true })).map(n => n.message);

test('the health rules: unavailable, outdated by the Director\'s years, no year, no ISBN or link', () => {
    const ref = { type: 'Textbook', isbn: '9', publication_year: '2025-01-01', status: 'available', copies: 2 };
    assert.equal(health.needsAttention(health.flagsOf(ref, { years: 5, currentYear: 2026 })), false);
    assert.equal(health.flagsOf({ ...ref, status: 'lost' }).unavailable, true);
    assert.equal(health.flagsOf({ ...ref, copies: 0 }).unavailable, true);
    assert.equal(health.flagsOf({ ...ref, publication_year: '2021-01-01' }, { years: 5, currentYear: 2026 }).outdated, true);
    assert.equal(health.flagsOf({ ...ref, publication_year: '2021-01-01' }, { years: 6, currentYear: 2026 }).outdated, false);
    assert.equal(health.flagsOf({ ...ref, isbn: '' }).noIsbn, true);
    assert.equal(health.flagsOf({ type: 'Online Resources', link: '#', publication_year: '2025-01-01' }).noLink, true);
    assert.equal(health.flagsOf({ ...ref, publication_year: null }).noYear, true);
});

test('the Director gets one weekly digest of the references that need attention, never twice the same day', async () => {
    const run = async (day) => { const result = { referenceDigests: 0 }; await remindDirectors({ deps: { models, notify }, clock: { day }, result }); return result; };
    const first = await run('2031-04-07');
    assert.ok(first.referenceDigests >= 1);
    const messages = await inbox(ids.director, 'reference_health');
    assert.equal(messages.length, 1);
    assert.match(messages[0], /^[0-9]+ of [0-9]+ active references need attention: .*outdated/, 'the 2001 title is outdated');
    await run('2031-04-07');
    assert.equal((await inbox(ids.director, 'reference_health')).length, 1, 'not twice the same day');
    await run('2031-04-14');
    assert.equal((await inbox(ids.director, 'reference_health')).length, 2, 'the next week');
});

test('when a plan is submitted with flagged references, the Director is told which plan and how many', async () => {
    const written = await onWorkflowAction({ offeringId: ids.offering, actorUserId: ids.instructor, actorRole: 'INSTRUCTOR', action: 'SUBMITTED', assignmentId: ids.assignment });
    assert.ok(written >= 1);
    assert.deepEqual(await inbox(ids.director, 'reference_flags'), [`${ids.code} — 1 of 2 references need a look`]);
    assert.equal((await inbox(ids.head, 'reference_flags')).length, 0, 'only the Director');
});

test('when a title the program\'s plans use is marked lost, its Program Head is told; others are not', async () => {
    const before = (await Reference.findByPk(ids.good.reference_id)).get({ plain: true });
    const after = { ...before, status: 'lost' };
    const written = await onReferenceEdited({ sequelize, before, after });
    assert.equal(written, 1);
    assert.deepEqual(await inbox(ids.head, 'reference_unavailable'), [`${ids.code} — a reference is no longer available (lost) by Director of Libraries`]);
    assert.equal((await inbox(ids.otherHead, 'reference_unavailable')).length, 0);
});

test('no alert when it was already unavailable, or is still usable, and an alert failure never throws', async () => {
    const base = (await Reference.findByPk(ids.good.reference_id)).get({ plain: true });
    assert.equal(await onReferenceEdited({ sequelize, before: { ...base, status: 'lost' }, after: { ...base, status: 'withdrawn' } }), 0);
    assert.equal(await onReferenceEdited({ sequelize, before: base, after: { ...base, title: 'renamed' } }), 0);
    const broken = { query: async () => { throw new Error('db down'); } };
    assert.equal(await onReferenceEdited({ sequelize: broken, before: base, after: { ...base, copies: 0 } }), 0);
});
