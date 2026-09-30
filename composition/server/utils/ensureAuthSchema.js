'use strict';

// Make sure the accounts table exists before anything tries to read it.
//
// WHY THIS EXISTS — the incident it fixes:
//
//     Server listening on 5000
//     SqliteError: no such table: Users
//         at Database.prepare (better-sqlite3/lib/methods/wrappers.js:5:21)
//     Node.js v24.19.0            ← the process EXITED
//
// The whole backend died. Not the sign-in route — the backend. Every screen in
// the app went blank at once, because there was no server left to answer any
// of them, and the cause looked like "the data is gone" rather than "one table
// is missing".
//
// Two things had to be true for that to happen, and both are worth writing
// down because either one alone would have been survivable:
//
//   1. The Users table was introduced by a MIGRATION. Every other table in
//      this database predates the migration runner, so the app had never
//      needed `node migrate.js` to have been run, and nothing said otherwise.
//      A feature that requires a manual step before the server can start is a
//      feature that will take the server down.
//   2. `models/index.js`'s sqlite3 compatibility shim reports a failed query
//      TWICE — it calls the callback with the error and then rethrows it. One
//      of those becomes a handled rejection, the other an unhandled one, and
//      Node 24 exits on unhandled rejections. So a caught error still killed
//      the process. (Left alone here: that shim is shared by every model, and
//      changing it deserves its own change, not a drive-by inside an auth fix.
//      The `unhandledRejection` guard in server.js covers it meanwhile.)
//
// The fix for (1) is this file: create the table if it is not there, on every
// boot, idempotently. `node migrate.js` still works and is still the right
// thing for a real deployment — this just means forgetting it costs you
// nothing.
//
// It does NOT create any accounts. An empty table is honest: the sign-in
// screen detects it, says the accounts are not set up, prints the seeder
// command, and falls back to the built-in demo accounts so a demo still runs.
// Silently inventing six users in someone's database is not this function's
// decision to make.

const TABLE = 'Users';

// `models` is a parameter with a default rather than a top-level require, so
// the test can hand in a throwaway database instead of opening the real one.
// Requiring it lazily also means a broken model file degrades sign-in rather
// than preventing this module from loading at all.
const loadModels = (injected) => injected || require('../models');

const tableExists = async (sequelize) => {
    const [rows] = await sequelize.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name = :table",
        { replacements: { table: TABLE } }
    );
    return Array.isArray(rows) && rows.length > 0;
};

const columnNames = async (sequelize) => {
    const [rows] = await sequelize.query(`PRAGMA table_info(${TABLE})`);
    return (rows || []).map(r => r.name);
};

/**
 * Ensure `Users` exists and has the password-reset columns.
 *
 * Never throws. A backend that refuses to start because sign-in could not be
 * prepared is strictly worse than one that starts with sign-in degraded —
 * every other feature in the app is independent of this table.
 *
 * @param {{sequelize, User}} [injectedModels] for tests; defaults to ../models
 * @returns {Promise<{ok, created, addedColumns, accounts, error}>}
 */
const ensureAuthSchema = async (injectedModels) => {
    const result = { ok: false, created: false, addedColumns: [], accounts: 0, error: null };
    try {
        const { sequelize, User } = loadModels(injectedModels);
        const existed = await tableExists(sequelize);

        if (!existed) {
            // `sync()` builds the table from the model definition, so the
            // schema cannot drift from what the code expects — which is
            // exactly the failure mode of hand-writing the CREATE TABLE here
            // and forgetting it when the model changes.
            await User.sync();
            result.created = true;
        } else {
            // The table predates the password-reset migration on databases
            // that were migrated once and not again. Additive and safe.
            const columns = await columnNames(sequelize);
            const queryInterface = sequelize.getQueryInterface();
            const { DataTypes } = require('sequelize');
            if (!columns.includes('reset_token_hash')) {
                await queryInterface.addColumn(TABLE, 'reset_token_hash', { type: DataTypes.STRING(64), allowNull: true });
                result.addedColumns.push('reset_token_hash');
            }
            if (!columns.includes('reset_expires_at')) {
                await queryInterface.addColumn(TABLE, 'reset_expires_at', { type: DataTypes.DATE, allowNull: true });
                result.addedColumns.push('reset_expires_at');
            }
        }

        result.accounts = await User.count();
        result.ok = true;
    } catch (err) {
        result.error = err?.message || String(err);
    }
    return result;
};

/** The same thing, with the one-line report a person reads at boot. */
const ensureAuthSchemaAndReport = async (injectedModels) => {
    const r = await ensureAuthSchema(injectedModels);
    if (!r.ok) {
        // eslint-disable-next-line no-console
        console.warn(`⚠ Sign-in is unavailable: ${r.error}`);
        console.warn('  Everything else still works. Run `node migrate.js` from this folder to fix it.');
        return r;
    }
    if (r.created) {
        console.log('✔ Created the Users table (sign-in had never been set up on this database).');
    } else if (r.addedColumns.length) {
        console.log(`✔ Added password-reset columns to Users: ${r.addedColumns.join(', ')}`);
    }
    if (r.accounts === 0) {
        console.log('  No accounts yet — run: node run-seeder.js 20260812000000-demo-users.js');
        console.log('  Until then the sign-in screen uses its built-in demo accounts.');
    }
    return r;
};

module.exports = { ensureAuthSchema, ensureAuthSchemaAndReport, TABLE };
