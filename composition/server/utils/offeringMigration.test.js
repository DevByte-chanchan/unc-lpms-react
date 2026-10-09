'use strict';

// Migration 20260910000000 (terms and revisions) on OLD data: several offerings per course and
// program, which used to share the course's single term text. Runs on throwaway in-memory databases.
const test = require('node:test');
const assert = require('node:assert/strict');
const { Sequelize } = require('sequelize');
const migration = require('../migrations/20260910000000-offering-terms-and-revisions');
const { backfillOfferings } = require('./offeringBackfill');

// The tables as they were before the migration (no term / approval columns on the offerings).
const oldDatabase = async () => {
    const db = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    const q = (sql, replacements = []) => db.query(sql, { replacements });
    await q('CREATE TABLE Courses (course_id INTEGER PRIMARY KEY, course_no TEXT, term TEXT)');
    await q('CREATE TABLE Programs (program_id INTEGER PRIMARY KEY, name TEXT)');
    await q(`CREATE TABLE ProgramCourseOfferings (pc_offering_id INTEGER PRIMARY KEY AUTOINCREMENT, revision_number INTEGER NOT NULL,
             course_id INTEGER NOT NULL, program_id INTEGER NOT NULL, dept_id INTEGER, course_description TEXT, createdAt DATETIME, updatedAt DATETIME)`);
    await q('CREATE TABLE CourseOfferingAssignments (co_assign_id INTEGER PRIMARY KEY AUTOINCREMENT, pc_offering_id INTEGER NOT NULL)');
    await q('CREATE TABLE AssignmentWorkflowLogs (log_id INTEGER PRIMARY KEY AUTOINCREMENT, co_assign_id INTEGER, actor_role TEXT, action_type TEXT, createdAt DATETIME)');
    await q("INSERT INTO Programs VALUES (1, 'BS Information Technology')");
    await q("INSERT INTO Courses VALUES (1, 'BIT213L', '1st Semester SY 2026-2027'), (2, 'BIT313L', '1st Semester SY 2026-2027'), (3, 'BIT321L', '2nd Semester SY 2026-2027')");

    const offering = async ({ course, revision, approvedAt = null }) => {
        const [id] = await db.query('INSERT INTO ProgramCourseOfferings (revision_number, course_id, program_id, dept_id, course_description) VALUES (?, ?, 1, 1, ?)',
            { replacements: [revision, course, 'x'], type: Sequelize.QueryTypes.INSERT });
        const [assignment] = await db.query('INSERT INTO CourseOfferingAssignments (pc_offering_id) VALUES (?)', { replacements: [id], type: Sequelize.QueryTypes.INSERT });
        if (approvedAt) await q("INSERT INTO AssignmentWorkflowLogs (co_assign_id, actor_role, action_type, createdAt) VALUES (?, 'DEAN', 'ACCEPTED', ?)", [assignment, approvedAt]);
        return id;
    };
    const rows = async () => (await db.query(`SELECT pc_offering_id AS id, revision_number AS rev, school_year AS year, semester, approved_at AS approved, base_offering_id AS base
                                              FROM ProgramCourseOfferings ORDER BY pc_offering_id`, { type: Sequelize.QueryTypes.SELECT }));
    const indexes = async () => (await db.query("SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'offerings_one%'", { type: Sequelize.QueryTypes.SELECT })).map(r => r.name).sort();
    return { db, q, offering, rows, indexes, qi: db.getQueryInterface() };
};

const quietly = async (fn) => {
    const original = console.warn;
    const warnings = [];
    console.warn = (...args) => warnings.push(args.join(' '));
    try { return { result: await fn(), warnings }; } finally { console.warn = original; }
};

test('several approved revisions that share one term: the latest keeps it, the superseded ones are left without a term', async () => {
    const { db, offering, rows, indexes, qi } = await oldDatabase();
    // BIT213L has revisions 1, 2 and 3 approved over time; every one reads "1st Semester SY 2026-2027".
    const rev1 = await offering({ course: 1, revision: 1, approvedAt: '2026-01-10 00:00:00' });
    const rev2 = await offering({ course: 1, revision: 2, approvedAt: '2026-03-10 00:00:00' });
    const rev3 = await offering({ course: 1, revision: 3, approvedAt: '2026-05-10 00:00:00' });
    const other = await offering({ course: 2, revision: 1, approvedAt: '2026-02-01 00:00:00' });

    const { warnings } = await quietly(() => migration.up(qi, Sequelize));
    const byId = Object.fromEntries((await rows()).map(r => [r.id, r]));

    assert.deepEqual([byId[rev3].year, byId[rev3].semester], ['2026-2027', '1st'], 'the latest approved revision keeps the term');
    for (const id of [rev1, rev2]) assert.deepEqual([byId[id].year, byId[id].semester], [null, null], `offering ${id} is superseded, its term is unknown`);
    assert.deepEqual([byId[other].year, byId[other].semester], ['2026-2027', '1st'], 'another course is untouched');
    assert.deepEqual([rev1, rev2, rev3].map(id => byId[id].rev), [1, 2, 3], 'revision numbers are kept');
    assert.ok([rev1, rev2, rev3, other].every(id => byId[id].approved), 'approval dates come from the Dean\'s log');
    assert.equal(byId[rev3].base, rev2, 'a later revision still records the one it was based on');
    assert.equal(Object.keys(byId).length, 4, 'no offering was deleted');
    assert.deepEqual(await indexes(), ['offerings_one_new_revision_per_term', 'offerings_one_working_copy']);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], new RegExp(`${rev1}, ${rev2}.*${rev3}`));
    await db.close();
});

test('the migration, and the backfill the seeders rerun, can run again without changing or breaking anything', async () => {
    const { db, offering, rows, qi } = await oldDatabase();
    await offering({ course: 1, revision: 1, approvedAt: '2026-01-10 00:00:00' });
    await offering({ course: 1, revision: 2, approvedAt: '2026-03-10 00:00:00' });
    await offering({ course: 2, revision: 1 });
    await offering({ course: 2, revision: 2 });

    await quietly(() => migration.up(qi, Sequelize));
    const first = JSON.stringify(await rows());
    // With the unique indexes in place, refilling a cleared term would violate them: it must not try.
    await quietly(() => migration.up(qi, Sequelize));
    await quietly(() => backfillOfferings(qi));
    assert.equal(JSON.stringify(await rows()), first);
    await db.close();
});

test('several unapproved offerings: the newest becomes the working copy, older ones keep their revision number', async () => {
    const { db, offering, rows, indexes, qi } = await oldDatabase();
    const approved = await offering({ course: 2, revision: 1, approvedAt: '2026-01-10 00:00:00' });
    const older = await offering({ course: 2, revision: 2 });
    const newest = await offering({ course: 2, revision: 3 });

    await quietly(() => migration.up(qi, Sequelize));
    const byId = Object.fromEntries((await rows()).map(r => [r.id, r]));
    assert.equal(byId[newest].rev, 0, 'the working copy has no revision number yet');
    assert.equal(byId[older].rev, 2, 'an older unapproved offering keeps the number it had');
    assert.equal(byId[approved].rev, 1);
    assert.equal((await indexes()).length, 2);
    await db.close();
});

test('two unapproved offerings with no revision number stop the migration with a message that says what to do, and it works after the fix', async () => {
    const { db, q, offering, indexes, qi } = await oldDatabase();
    await offering({ course: 3, revision: 1, approvedAt: '2026-01-10 00:00:00' });
    const draftA = await offering({ course: 3, revision: 0 });
    const draftB = await offering({ course: 3, revision: 0 });
    await offering({ course: 1, revision: 1 }); // unrelated and fine

    const count = async () => (await q('SELECT COUNT(*) AS n FROM ProgramCourseOfferings', []))[0][0].n;
    const before = await count();
    const failure = await quietly(() => migration.up(qi, Sequelize)).then(() => null, e => e);
    assert.ok(failure, 'the migration refuses to finish');
    assert.match(failure.message, /BIT321L/);
    assert.match(failure.message, new RegExp(`${draftA}, ${draftB}`));
    assert.match(failure.message, /unapproved/);
    assert.match(failure.message, /What to do/);
    assert.match(failure.message, /safe to run repeatedly/);
    assert.doesNotMatch(failure.message, /SQLITE|constraint/i, 'a readable message, not a SQL error');
    assert.equal(await count(), before, 'nothing was deleted');
    assert.deepEqual(await indexes(), [], 'no half-made index');

    // The fix the message asks for: keep one working copy. Then the same migration completes.
    await q('DELETE FROM CourseOfferingAssignments WHERE pc_offering_id = ?', [draftA]);
    await q('DELETE FROM ProgramCourseOfferings WHERE pc_offering_id = ?', [draftA]);
    await quietly(() => migration.up(qi, Sequelize));
    assert.equal((await indexes()).length, 2);
    await db.close();
});

test('a conflict between approved revisions in the same term cannot reach the indexes', async () => {
    const { db, offering, indexes, qi } = await oldDatabase();
    // Same term, same approval moment: a tie must still resolve to exactly one holder.
    await offering({ course: 1, revision: 1, approvedAt: '2026-04-01 00:00:00' });
    await offering({ course: 1, revision: 2, approvedAt: '2026-04-01 00:00:00' });
    await quietly(() => migration.up(qi, Sequelize));
    assert.equal((await indexes()).length, 2);
    const [{ n }] = await db.query("SELECT COUNT(*) AS n FROM ProgramCourseOfferings WHERE school_year IS NOT NULL", { type: Sequelize.QueryTypes.SELECT });
    assert.equal(n, 1);
    await db.close();
});
