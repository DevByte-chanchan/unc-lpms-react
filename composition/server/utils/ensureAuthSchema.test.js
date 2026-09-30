'use strict';

// node utils/ensureAuthSchema.test.js
//
// Runs against a THROWAWAY sqlite file, never the real one. The point is the
// exact situation that took the backend down: a database that has the app's
// other tables but has never had `Users`.

const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');

const DB = path.join(__dirname, '..', 'tmp-ensure-test.sqlite');

let passed = 0;
const test = async (name, fn) => {
    try { await fn(); passed++; console.log(`✓ ${name}`); }
    catch (error) { console.error(`✗ ${name}\n  ${error.message}`); process.exitCode = 1; }
};
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const freshDb = async ({ withUsers = false, withResetColumns = true } = {}) => {
    if (fs.existsSync(DB)) fs.unlinkSync(DB);
    const sequelize = new Sequelize({ dialect: 'sqlite', storage: DB, logging: false });
    // A stand-in for the tables this database already has.
    await sequelize.query('CREATE TABLE Assignments (id INTEGER PRIMARY KEY, name TEXT)');
    await sequelize.query("INSERT INTO Assignments (name) VALUES ('a real row')");
    if (withUsers) {
        const cols = withResetColumns ? ', reset_token_hash TEXT, reset_expires_at DATETIME' : '';
        await sequelize.query(`CREATE TABLE Users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT UNIQUE,
            password_hash TEXT, role TEXT, is_active TINYINT DEFAULT 1, last_login_at DATETIME,
            createdAt DATETIME, updatedAt DATETIME${cols})`);
    }
    return sequelize;
};

// The subject takes its models as an argument, so the test hands it a
// throwaway database and the REAL model definition — what is checked is the
// schema the app actually expects, not a hand-copied version of it that could
// drift from models/user.js without anyone noticing.
const { ensureAuthSchema } = require('./ensureAuthSchema');
const modelsFor = (sequelize) => {
    const { DataTypes } = require('sequelize');
    return { sequelize, User: require('../models/user')(sequelize, DataTypes) };
};

const tableNames = async (sequelize) => {
    const [rows] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table'");
    return rows.map(r => r.name);
};
const columns = async (sequelize) => {
    const [rows] = await sequelize.query('PRAGMA table_info(Users)');
    return rows.map(r => r.name);
};

(async () => {

    // THE REPORTED CRASH. A database with the app's data but no Users table.
    await test('a database with no Users table gets one, without losing anything', async () => {
        const sequelize = await freshDb();
        assert(!(await tableNames(sequelize)).includes('Users'), 'precondition: no Users table');

        const r = await ensureAuthSchema(modelsFor(sequelize));

        assert(r.ok, `should have succeeded: ${r.error}`);
        assert(r.created === true, 'it should report that it created the table');
        assert((await tableNames(sequelize)).includes('Users'), 'the table should exist now');

        // The rest of the database must be untouched. This is the fear the
        // crash created — "some datas are gone" — so it gets an assertion.
        const [rows] = await sequelize.query('SELECT name FROM Assignments');
        assert(rows.length === 1 && rows[0].name === 'a real row', 'existing data must be untouched');
        await sequelize.close();
    });

    await test('the new table has every column the model expects', async () => {
        const sequelize = await freshDb();
        await ensureAuthSchema(modelsFor(sequelize));
        const cols = await columns(sequelize);
        for (const needed of ['user_id', 'name', 'email', 'password_hash', 'role', 'is_active', 'last_login_at', 'reset_token_hash', 'reset_expires_at']) {
            assert(cols.includes(needed), `missing column ${needed} (got ${cols.join(', ')})`);
        }
        await sequelize.close();
    });

    await test('running it twice changes nothing the second time', async () => {
        const sequelize = await freshDb();
        const first = await ensureAuthSchema(modelsFor(sequelize));
        const second = await ensureAuthSchema(modelsFor(sequelize));
        assert(first.created === true && second.created === false, 'only the first run creates');
        assert(second.ok && second.addedColumns.length === 0, 'the second run is a no-op');
        await sequelize.close();
    });

    // A database migrated BEFORE password reset existed: Users is there, the
    // two reset columns are not.
    await test('a half-migrated table gets the reset columns added', async () => {
        const sequelize = await freshDb({ withUsers: true, withResetColumns: false });
        const before = await columns(sequelize);
        assert(!before.includes('reset_token_hash'), 'precondition: no reset columns');

        const r = await ensureAuthSchema(modelsFor(sequelize));

        assert(r.ok && r.created === false, 'the table already existed');
        assert(r.addedColumns.includes('reset_token_hash') && r.addedColumns.includes('reset_expires_at'),
            `expected both columns added, got ${JSON.stringify(r.addedColumns)}`);
        const after = await columns(sequelize);
        assert(after.includes('reset_token_hash') && after.includes('reset_expires_at'), 'columns should exist now');
        await sequelize.close();
    });

    await test('an existing, complete table is left completely alone', async () => {
        const sequelize = await freshDb({ withUsers: true });
        await sequelize.query("INSERT INTO Users (name, email, role) VALUES ('KEEP, ME', 'keep@unc.edu.ph', 'dean')");
        const r = await ensureAuthSchema(modelsFor(sequelize));
        assert(r.ok && !r.created && r.addedColumns.length === 0, JSON.stringify(r));
        assert(r.accounts === 1, `the existing account should still be there, got ${r.accounts}`);
        const [rows] = await sequelize.query('SELECT email FROM Users');
        assert(rows.length === 1 && rows[0].email === 'keep@unc.edu.ph', 'the account row must survive');
        await sequelize.close();
    });

    await test('it creates NO accounts — an empty table is reported, not filled', async () => {
        // Inventing six users in somebody's live database is not this
        // function's call to make. The sign-in screen handles zero accounts.
        const sequelize = await freshDb();
        const r = await ensureAuthSchema(modelsFor(sequelize));
        assert(r.accounts === 0, `expected no accounts, got ${r.accounts}`);
        await sequelize.close();
    });

    // THE POINT OF THE WHOLE FILE. Whatever goes wrong, the caller gets an
    // object — never an exception — because the backend must start regardless.
    await test('it never throws, however broken the database is', async () => {
        // A database that fails every query — the shape of a locked file, a
        // corrupt page, or a driver that would not load. Simulated rather than
        // provoked, because a filesystem path that is unwritable on Linux may
        // be perfectly writable on the Windows machine this actually runs on.
        const brokenModels = {
            sequelize: {
                query: async () => { throw new Error('database is locked'); },
                getQueryInterface: () => { throw new Error('database is locked'); }
            },
            User: { sync: async () => { throw new Error('database is locked'); }, count: async () => { throw new Error('database is locked'); } }
        };
        let threw = null;
        let r;
        try { r = await ensureAuthSchema(brokenModels); } catch (e) { threw = e; }
        assert(!threw, `it threw instead of reporting: ${threw && threw.message}`);
        assert(r && r.ok === false, `it should report failure, got ${JSON.stringify(r)}`);
        assert(r.error === 'database is locked', `and say what went wrong, got ${JSON.stringify(r.error)}`);
    });

    await test('a failure at boot is reported without taking the process down', async () => {
        // The whole point. ensureAuthSchemaAndReport is what server.js calls;
        // if it can throw, the crash this file exists to prevent comes back in
        // a different costume.
        const { ensureAuthSchemaAndReport } = require('./ensureAuthSchema');
        const brokenModels = { sequelize: { query: async () => { throw new Error('no such table: Users'); } }, User: {} };
        let threw = null;
        let r;
        try { r = await ensureAuthSchemaAndReport(brokenModels); } catch (e) { threw = e; }
        assert(!threw, `boot reporting must not throw: ${threw && threw.message}`);
        assert(r && r.ok === false, 'it should still report the failure to the caller');
    });

    if (fs.existsSync(DB)) fs.unlinkSync(DB);
    console.log(`\n${passed} ensure-auth-schema checks passed.`);
})();
