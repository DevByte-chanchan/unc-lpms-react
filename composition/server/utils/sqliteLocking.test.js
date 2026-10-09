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
