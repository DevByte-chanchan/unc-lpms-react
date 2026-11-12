'use strict';

// The consultant's comments on the earlier versions of a plan, through the real router, against the test
// database. It makes its own people, program and versions and removes them. (node run-tests.js)
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { Op } = require('sequelize');
const models = require('../models');

const { sequelize, Sequelize, User, CourseConsultant } = models;
const insert = async (sql, replacements) => (await sequelize.query(sql, { replacements, type: Sequelize.QueryTypes.INSERT }))[0];
const select = (sql, replacements = []) => sequelize.query(sql, { replacements, type: Sequelize.QueryTypes.SELECT });
const stamp = Date.now();
const now = () => new Date();
const made = { users: [], courses: [], programs: [], depts: [], offerings: [], assignments: [] };
const ids = {};
let server;
let base;

const makeUser = async (label, role) => {
    const row = await User.create({ name: `ZZ ${label} ${stamp}`, email: `zzearlier.${label}.${stamp}@example.test`, role, password_hash: 'x', is_active: true });
    made.users.push(row.user_id);
    return row.user_id;
};

test.before(async () => {
    ids.dean = await makeUser('dean', 'dean');
    ids.head = await makeUser('head', 'program-head');
    ids.otherHead = await makeUser('otherHead', 'program-head');
    ids.consultantA = await makeUser('consA', 'industry-consultant');
    ids.consultantB = await makeUser('consB', 'industry-consultant');
    ids.instructor = await makeUser('ins', 'instructor');
    const dept = await insert('INSERT INTO Departments (name, code, stakeholder_id, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [`ZZ earlier dept ${stamp}`, 'ZZE', ids.dean, now(), now()]);
    made.depts.push(dept);
    const programId = await insert('INSERT INTO Programs (dept_id, name, stakeholder_id, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [dept, `ZZ earlier program ${stamp}`, ids.head, now(), now()]);
    made.programs.push(programId);
    const course = await insert(`INSERT INTO Courses (course_no, course_title, credit, contact_hrs, classification, cmo, year_lvl, term, createdAt, updatedAt) VALUES (?, 'Earlier comments test', '3', '3', 'x', 'x', 'FIRST YEAR', '1st', ?, ?)`, [`ZZE${stamp}`.slice(0, 20), now(), now()]);
    made.courses.push(course);
    await CourseConsultant.create({ course_id: course, consultant_user_id: ids.consultantA, is_active: true });
    await CourseConsultant.create({ course_id: course, consultant_user_id: ids.consultantB, is_active: true });

    const offering = async (year, extra = {}) => {
        const columns = ['course_id', 'program_id', 'dept_id', 'course_description', 'school_year', 'semester', 'revision_number', 'createdAt', 'updatedAt', ...Object.keys(extra)];
        const values = [course, programId, dept, 'x', year, '1st', extra.revision_number ?? 0, now(), now(), ...Object.values(extra)];
        const id = await insert(`INSERT INTO ProgramCourseOfferings (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`, values);
        const assignment = await insert('INSERT INTO CourseOfferingAssignments (pc_offering_id, stakeholder_id, date_assigned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [id, String(ids.instructor), now(), now(), now()]);
        made.offerings.push(id); made.assignments.push(assignment);
        return { id, assignment };
    };
    // 2025 (the first version) <- 2026 revision <- 2027 revision
    ids.v1 = await offering('2024-2025', { revision_number: 1 });
    ids.v2 = await offering('2025-2026', { revision_number: 2, base_offering_id: ids.v1.id });
    // v3 is Dean-approved: the consultant opens approved plans only.
    ids.v3 = await offering('2026-2027', { revision_number: 3, base_offering_id: ids.v2.id, approved_at: now() });

    const comment = (assignment, role, userId, message) => insert(
        'INSERT INTO Comments (co_assign_id, commenter_role, commenter_user_id, message, resolved_status, createdAt, updatedAt) VALUES (?, ?, ?, ?, 0, ?, ?)',
        [assignment, role, userId, message, now(), now()]);
    await comment(ids.v1.assignment, 'INDUSTRY_CONSULTANT', ids.consultantA, 'A: add cloud computing');
    await comment(ids.v1.assignment, 'INDUSTRY_CONSULTANT', ids.consultantB, 'B: more on testing');
    await comment(ids.v1.assignment, 'PROGRAM_HEAD', ids.head, 'PH: not a consultant comment');
    await comment(ids.v2.assignment, 'INDUSTRY_CONSULTANT', ids.consultantA, 'A: revise the rubric');

    const app = express();
    app.use(express.json());
    app.use((req, res, next) => { const [id, role] = String(req.get('x-user') || '').split(':'); req.user = id ? { id: Number(id), role, name: 'T' } : undefined; next(); });
    app.use('/api/comments', require('../routes/comments'));
    await new Promise(resolve => { server = app.listen(0, resolve); });
    base = `http://127.0.0.1:${server.address().port}/api/comments`;
});

test.after(async () => {
    server.close();
    const list = (a) => (a.length ? a.join(', ') : '0');
    await sequelize.query(`DELETE FROM Comments WHERE co_assign_id IN (${list(made.assignments)})`);
    await CourseConsultant.destroy({ where: { course_id: { [Op.in]: made.courses } } });
    await sequelize.query(`DELETE FROM CourseOfferingAssignments WHERE co_assign_id IN (${list(made.assignments)})`);
    await sequelize.query(`DELETE FROM ProgramCourseOfferings WHERE pc_offering_id IN (${list(made.offerings)})`);
    await sequelize.query(`DELETE FROM Courses WHERE course_id IN (${list(made.courses)})`);
    await sequelize.query(`DELETE FROM Programs WHERE program_id IN (${list(made.programs)})`);
    await sequelize.query(`DELETE FROM Departments WHERE dept_id IN (${list(made.depts)})`);
    await User.destroy({ where: { user_id: { [Op.in]: made.users } } });
});

const call = async (who, offeringId) => {
    const res = await fetch(`${base}/earlier-consultant/${offeringId}`, { headers: { 'x-user': who } });
    return { status: res.status, body: await res.json().catch(() => ({})) };
};
const messages = (body) => body.versions.flatMap(v => v.comments.map(c => c.message)).sort();

test('the Program Head of the program sees every consultant\'s comments on the versions before this one, nearest first', async () => {
    const { status, body } = await call(`${ids.head}:program-head`, ids.v3.id);
    assert.equal(status, 200);
    assert.deepEqual(body.versions.map(v => v.schoolYear), ['2025-2026', '2024-2025']);
    assert.deepEqual(messages(body), ['A: add cloud computing', 'A: revise the rubric', 'B: more on testing']);
});

test('only consultant comments are included, never another role\'s', async () => {
    const { body } = await call(`${ids.head}:program-head`, ids.v2.id);
    assert.deepEqual(messages(body), ['A: add cloud computing', 'B: more on testing']);
    assert.ok(!messages(body).some(m => m.startsWith('PH:')));
});

test('a consultant sees only their own earlier comments', async () => {
    assert.deepEqual(messages((await call(`${ids.consultantA}:industry-consultant`, ids.v3.id)).body), ['A: add cloud computing', 'A: revise the rubric']);
    assert.deepEqual(messages((await call(`${ids.consultantB}:industry-consultant`, ids.v3.id)).body), ['B: more on testing']);
    assert.equal((await call(`${ids.consultantA}:industry-consultant`, ids.v2.id)).status, 403, 'a plan not approved yet is not theirs to open');
});

test('the first version has nothing before it', async () => {
    assert.deepEqual((await call(`${ids.head}:program-head`, ids.v1.id)).body.versions, []);
});

test('no author id is sent, and other roles and another program\'s head are refused', async () => {
    const { body } = await call(`${ids.head}:program-head`, ids.v3.id);
    assert.ok(!JSON.stringify(body).includes('commenter_user_id'));
    for (const role of ['instructor', 'dean', 'director-of-libraries', 'vpaa']) {
        assert.equal((await call(`${ids.dean}:${role}`, ids.v3.id)).status, 403, role);
    }
    assert.equal((await call(`${ids.otherHead}:program-head`, ids.v3.id)).status, 403);
});

const suggestions = async (who, offeringId) => {
    const res = await fetch(`${base}/suggestions/${offeringId}`, { headers: { 'x-user': who } });
    return { status: res.status, body: await res.json().catch(() => ({})) };
};

test('Future Suggestions: the consultant suggestions on this plan and its earlier versions, for its instructor', async () => {
    const { status, body } = await suggestions(`${ids.instructor}:instructor`, ids.v2.id);
    assert.equal(status, 200);
    assert.deepEqual(body.suggestions.map(s => s.message).sort(), ['A: add cloud computing', 'A: revise the rubric', 'B: more on testing']);
    assert.deepEqual(body.suggestions.filter(s => s.thisPlan).map(s => s.message), ['A: revise the rubric']);
    assert.ok(!JSON.stringify(body).includes('commenter_user_id'));
    assert.deepEqual((await suggestions(`${ids.consultantB}:industry-consultant`, ids.v3.id)).body.suggestions.map(s => s.message), ['B: more on testing']);
    assert.equal((await suggestions(`${ids.dean}:dean`, ids.v2.id)).status, 403);
});
