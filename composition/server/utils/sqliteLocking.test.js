'use strict';

// How the server's SQLite connection behaves when another connection (a CLI script, a second
// process) writes to the same file. Runs against the test database (node run-tests.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Database = require('better-sqlite3');
const { sequelize, Sequelize, Reference } = require('../models');
const config = require('../config/config.json').test;

const testDbFile = path.resolve(__dirname, '..', config.storage);
const other = (timeout) => new Database(testDbFile, { timeout });

test('the connection waits for locks (busy_timeout) and every transaction begins IMMEDIATE', () => {
    assert.ok(sequelize.connectionManager && Object.keys(require('../models')).includes('__raw'), 'models exposes the raw connection');
    assert.ok(require('../models').__raw.pragma('busy_timeout', { simple: true }) >= 10000);
    assert.equal(sequelize.options.transactionType, 'IMMEDIATE');
});

test('a read-then-write transaction cannot be broken by another connection committing in between', async () => {
    // With a deferred transaction this exact sequence fails with SQLITE_BUSY_SNAPSHOT (and the
    // 10 s timeout is not waited): the transaction reads, another connection commits, then the
    // transaction writes. With BEGIN IMMEDIATE the transaction holds the write lock from the start,
    // so the other connection is the one that has to wait.
    const intruder = other(150);
    let intruderOutcome = null;
    try {
        const title = `locking ${Date.now()}`;
        await sequelize.transaction(async (transaction) => {
            await Reference.count({ transaction });                     // the read
            try {                                                       // another connection tries to commit a write
                intruder.exec("INSERT INTO `References` (title, type, archived, createdAt, updatedAt) VALUES ('intruder', 'Textbook', 0, datetime('now'), datetime('now'))");
                intruderOutcome = 'committed';
            } catch (error) {
                intruderOutcome = error.code;
            }
            await Reference.create({ title, type: 'Textbook', author: 'A', isbn: '0306406152', publication_year: new Date(Date.UTC(2020, 0, 1)) }, { transaction }); // the write
        });
        assert.equal(intruderOutcome, 'SQLITE_BUSY', 'the other connection had to wait for our lock');
        assert.equal(await Reference.count({ where: { title } }), 1, 'our write went through');
    } finally {
        intruder.close();
    }
});

test('after the transaction ends the other connection can write again', async () => {
    const writer = other(2000);
    try {
        writer.exec("INSERT INTO `References` (title, type, archived, createdAt, updatedAt) VALUES ('after', 'Textbook', 0, datetime('now'), datetime('now'))");
        const [{ n }] = await sequelize.query("SELECT COUNT(*) AS n FROM `References` WHERE title = 'after'", { type: Sequelize.QueryTypes.SELECT });
        assert.ok(n >= 1);
    } finally {
        writer.close();
    }
});

// ------------------------------------------------ one shared connection, one transaction at a time

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

test('overlapping managed transactions queue instead of failing with "cannot start a transaction within a transaction"', async () => {
    // Two requests whose transactions overlap in time: the second used to fail at BEGIN.
    const events = [];
    const run = (name) => sequelize.transaction(async (transaction) => {
        events.push(`${name} start`);
        await Reference.count({ transaction });
        await sleep(60);
        events.push(`${name} end`);
        return name;
    });
    const results = await Promise.allSettled([run('A'), run('B'), run('C')]);
    assert.deepEqual(results.map(r => r.status), ['fulfilled', 'fulfilled', 'fulfilled'], JSON.stringify(results));
    assert.deepEqual(events, ['A start', 'A end', 'B start', 'B end', 'C start', 'C end'], 'strictly one after another, in order');
});

test('unmanaged transactions hold the queue until commit or rollback', async () => {
    const first = await sequelize.transaction();
    let secondStarted = false;
    const second = sequelize.transaction().then(async (t) => { secondStarted = true; await t.rollback(); });

    await sleep(80);
    assert.equal(secondStarted, false, 'the second waits while the first is open');
    await first.commit();
    await second;
    assert.equal(secondStarted, true, 'the second runs once the first committed');

    const third = await sequelize.transaction();
    const fourth = sequelize.transaction().then(t => t.commit());
    await sleep(40);
    await third.rollback();
    await fourth; // released by rollback too
});

test('a failing transaction does not block the ones behind it', async () => {
    const failing = sequelize.transaction(async () => { throw new Error('boom'); });
    const after = sequelize.transaction(async (transaction) => Reference.count({ transaction }));
    await assert.rejects(failing, /boom/);
    assert.equal(typeof await after, 'number');
});

test('the queue gives a leaked transaction up after its hold limit instead of freezing every later write', async () => {
    const { serializeTransactions } = require('../utils/transactionQueue');
    const warnings = [];
    // A stand-in with the same interface, so the real connection's state is not touched.
    const fake = {
        transaction: async (options, callback) => {
            const t = { commit: async () => {}, rollback: async () => {} };
            if (typeof options === 'function') return options(t);
            return callback ? callback(t) : t;
        }
    };
    serializeTransactions(fake, { holdLimitMs: 50, warn: (message) => warnings.push(message) });
    await fake.transaction();            // never committed or rolled back
    const started = Date.now();
    await fake.transaction(async () => 'ran');
    assert.ok(Date.now() - started >= 40, 'it waited for the hold limit');
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /held the database/);
});
