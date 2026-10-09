'use strict';

// seed-demo.js: loads the demo data into an empty database only. The full runs go through the real
// command line against throwaway SQLite files built from the real migrations, so they never touch the
// test database the other suites share (models/index.js honours LPMS_TEST_DB_FILE in test mode only).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const Database = require('better-sqlite3');
const { Sequelize } = require('sequelize');
const { Umzug, SequelizeStorage } = require('umzug');
const { runSeedDemo, findExistingData, SeedDemoError, GUARDED_TABLES } = require('../seed-demo');
const { verifyPassword } = require('./password');

const server = path.resolve(__dirname, '..');
const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'lpms-seed-demo-'));
test.after(() => fs.rmSync(folder, { recursive: true, force: true }));

// An empty database with the full schema, built once from the real migrations and copied per test.
let template;
test.before(async () => {
    template = path.join(folder, 'template-test.sqlite');
    const sequelize = new Sequelize({ dialect: 'sqlite', storage: template, logging: false });
    const migrationsDir = path.join(server, 'migrations').replace(/\\/g, '/');
    const umzug = new Umzug({
        migrations: {
            glob: `${migrationsDir}/*.js`,
            resolve: ({ name, path: file, context }) => {
                const migration = require(file);
                return { name, up: () => migration.up(context, Sequelize), down: () => migration.down(context, Sequelize) };
            }
        },
        context: sequelize.getQueryInterface(),
        storage: new SequelizeStorage({ sequelize }),
        logger: undefined
    });
    const warn = console.warn;
    console.warn = () => {};
    try { await umzug.up(); } finally { console.warn = warn; }
    await sequelize.close();
});

let counter = 0;
const freshDatabase = () => {
    const file = path.join(folder, `seed-test-${++counter}.sqlite`);
    fs.copyFileSync(template, file);
    return file;
};
const cli = (file, env = {}, args = []) => spawnSync(process.execPath, ['seed-demo.js', ...args], {
    cwd: server, encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test', LPMS_TEST_DB_FILE: file, ...env }
});
const withDb = (file, fn) => { const db = new Database(file); try { return fn(db); } finally { db.close(); } };
const snapshot = (file) => withDb(file, db => Object.fromEntries(
    db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all()
        .map(({ name }) => [name, db.prepare(`SELECT COUNT(*) AS n FROM \`${name}\``).get().n])));
const dataRows = (file) => {
    const all = snapshot(file);
    return Object.fromEntries([...GUARDED_TABLES, 'Users'].map(table => [table, all[table]]));
};

test('an empty database is seeded through the command line, and the six accounts are printed and work', async () => {
    const file = freshDatabase();
    assert.deepEqual(Object.values(dataRows(file)).filter(n => n > 0), []);

    const run = cli(file);
    assert.equal(run.status, 0, run.stderr);
    assert.equal((run.stdout.match(/^Seeded /gm) || []).length, 12, 'all 12 seeders');
    const order = ['20260512030000', '20260812000000', '20260901000000'].map(prefix => run.stdout.indexOf(`Seeded ${prefix}`));
    assert.ok(order.every(position => position >= 0) && order[0] < order[1] && order[1] < order[2], 'in filename order');
    assert.match(run.stdout, /password "demo1234"/);
    for (const email of ['monica.norton', 'junar.danila', 'maria.santos', 'roberto.cruz', 'agnes.reyes', 'carlos.garcia']) {
        assert.ok(run.stdout.includes(`${email}@unc.edu.ph`), email);
    }

    const rows = dataRows(file);
    assert.deepEqual([rows.Departments, rows.Programs, rows.Courses, rows.Users], [5, 2, 14, 6]);
    for (const table of ['ProgramCourseOfferings', 'IntendedLearningOutcomes', 'References', 'Comments', 'AssignmentWorkflowLogs']) {
        assert.ok(rows[table] > 0, `${table} has demo rows`);
    }
    const users = withDb(file, db => db.prepare('SELECT email, password_hash FROM Users').all());
    for (const user of users) assert.equal(await verifyPassword('demo1234', user.password_hash), true, user.email);
});

test('a populated database is refused and not one row changes', () => {
    const file = freshDatabase();
    assert.equal(cli(file).status, 0);
    // The groupmate's own work on top of the demo data.
    withDb(file, db => {
        db.prepare("INSERT INTO Comments (commenter_role, message, resolved_status, co_assign_id, ilo_id, comment_for, createdAt, updatedAt) VALUES ('PROGRAM_HEAD', 'MY OWN COMMENT', 0, 1, 1, 'references', datetime('now'), datetime('now'))").run();
        db.prepare("UPDATE IntendedLearningOutcomes SET description = 'EDITED BY ME' WHERE ilo_id = 1").run();
    });
    const before = snapshot(file);

    const run = cli(file);
    assert.equal(run.status, 1);
    assert.match(run.stderr, /already has data/);
    assert.match(run.stderr, /Nothing was changed/);
    assert.match(run.stderr, /Departments \(5\)/);
    assert.match(run.stderr, /docker compose down -v/, 'it says how to start over');
    assert.equal(run.stdout, '', 'no seeder ran');

    assert.deepEqual(snapshot(file), before, 'every table has the same row count');
    withDb(file, db => {
        assert.equal(db.prepare("SELECT COUNT(*) AS n FROM Comments WHERE message = 'MY OWN COMMENT'").get().n, 1);
        assert.equal(db.prepare("SELECT COUNT(*) AS n FROM IntendedLearningOutcomes WHERE description = 'EDITED BY ME'").get().n, 1);
    });
});

test('existing users alone do not block it, and they are kept', () => {
    const file = freshDatabase();
    withDb(file, db => db.prepare("INSERT INTO Users (name, email, password_hash, role, is_active, createdAt, updatedAt) VALUES ('ADMIN, FIRST', 'admin@unc.edu.ph', 'x', 'superuser', 1, datetime('now'), datetime('now'))").run());
    const run = cli(file);
    assert.equal(run.status, 0, run.stderr);
    const emails = withDb(file, db => db.prepare('SELECT email FROM Users').all().map(user => user.email));
    assert.equal(emails.length, 7);
    assert.ok(emails.includes('admin@unc.edu.ph'));
});

test('NODE_ENV=production is refused before the database is even opened', async () => {
    const file = path.join(folder, 'seed-test-never-created.sqlite');
    const run = cli(file, { NODE_ENV: 'production' });
    assert.equal(run.status, 1);
    assert.match(run.stderr, /production/);
    assert.equal(fs.existsSync(file), false, 'no database file was created');

    // The function itself refuses too, whoever calls it, without reading the database.
    const calls = [];
    const fake = { query: async (sql) => { calls.push(sql); return [[{ n: 0 }]]; }, getQueryInterface: () => ({}) };
    const failure = await runSeedDemo({ sequelize: fake, Sequelize, env: { NODE_ENV: 'production' } }).then(() => null, error => error);
    assert.equal(failure.code, 'PRODUCTION');
    assert.deepEqual(calls, []);
});

test('every one of the guarded tables is checked, and users are not among them', async () => {
    assert.deepEqual([...GUARDED_TABLES].sort(), [
        'AssignmentWorkflowLogs', 'Comments', 'CourseOfferingAssignments', 'Courses', 'Departments',
        'IntendedLearningOutcomes', 'ProgramCourseOfferings', 'Programs', 'References'
    ].sort());
    assert.ok(!GUARDED_TABLES.includes('Users'));
    for (const populated of GUARDED_TABLES) { // any one of them, alone, is enough to refuse
        const fake = { query: async (sql) => [[{ n: sql.includes(`\`${populated}\``) ? 3 : 0 }]] };
        assert.deepEqual(await findExistingData(fake), [{ table: populated, count: 3 }], populated);
    }
    assert.deepEqual(await findExistingData({ query: async () => [[{ n: 0 }]] }), []);
});

test('it stops at the first failing seeder, does not run the rest, and says what state it left', async () => {
    const dir = fs.mkdtempSync(path.join(folder, 'seeders-'));
    global.__seedRan = [];
    fs.writeFileSync(path.join(dir, '1-ok.js'), "module.exports = { up: async () => { global.__seedRan.push('1'); } };");
    fs.writeFileSync(path.join(dir, '2-fails.js'), "module.exports = { up: async () => { global.__seedRan.push('2'); throw new Error('boom'); } };");
    fs.writeFileSync(path.join(dir, '3-never.js'), "module.exports = { up: async () => { global.__seedRan.push('3'); } };");
    const empty = { query: async () => [[{ n: 0 }]], getQueryInterface: () => ({}) };
    try {
        const failure = await runSeedDemo({ sequelize: empty, Sequelize, env: { NODE_ENV: 'development' }, seedersDir: dir }).then(() => null, error => error);
        assert.ok(failure instanceof SeedDemoError);
        assert.equal(failure.code, 'SEEDER_FAILED');
        assert.match(failure.message, /2-fails\.js failed: boom/);
        assert.match(failure.message, /1 earlier seeder/);
        assert.match(failure.message, /empty database/);
        assert.deepEqual(global.__seedRan, ['1', '2'], 'the third never ran');
    } finally {
        delete global.__seedRan;
    }
});

test('seed.js no longer seeds: it points to seed-demo.js and exits without running anything', () => {
    const retired = spawnSync(process.execPath, ['seed.js'], { cwd: server, env: { ...process.env, NODE_ENV: 'test' }, encoding: 'utf8' });
    assert.equal(retired.status, 1);
    assert.match(retired.stderr, /seed-demo\.js/);
    assert.match(retired.stderr, /EMPTY database/);
    assert.equal(retired.stdout, '');
});

test('--if-empty seeds an empty database, then skips quietly (exit 0, nothing changed) once it has data', () => {
    const file = freshDatabase();
    const first = cli(file, {}, ['--if-empty']);
    assert.equal(first.status, 0, first.stderr);
    assert.match(first.stdout, /Demo data loaded/);
    const after = snapshot(file);

    const second = cli(file, {}, ['--if-empty']);
    assert.equal(second.status, 0, second.stderr);
    assert.match(second.stdout, /skipped: the database already has data/);
    assert.deepEqual(snapshot(file), after, 'the second run changed nothing');
});

test('--if-empty in production exits 0 without touching the database', () => {
    const file = freshDatabase();
    const before = snapshot(file);
    const run = cli(file, { NODE_ENV: 'production' }, ['--if-empty']);
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /skipped: NODE_ENV is "production"/);
    assert.deepEqual(snapshot(file), before);
});
