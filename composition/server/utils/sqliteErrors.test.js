'use strict';

// A failing query must reject the promise sequelize.query() returns, so try / catch and the Express error handler
// see it. It used to escape as an unhandled rejection and leave the request without an answer (models/index.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const { sequelize, Sequelize } = require('../models');

test('a query against a missing table rejects instead of hanging', async () => {
    const unhandled = [];
    const onUnhandled = (e) => unhandled.push(e);
    process.on('unhandledRejection', onUnhandled);
    try {
        await assert.rejects(
            Promise.race([
                sequelize.query('SELECT * FROM NoSuchTable', { type: Sequelize.QueryTypes.SELECT }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('the query never settled')), 3000)),
            ]),
            /no such table/
        );
        await assert.rejects(sequelize.query('UPDATE NoSuchTable SET x = 1'), /no such table/);
        await new Promise(r => setTimeout(r, 50));
        assert.deepEqual(unhandled, []);
    } finally {
        process.off('unhandledRejection', onUnhandled);
    }
});

test('a syntax error rejects too, and the connection keeps working', async () => {
    await assert.rejects(sequelize.query('SELEC 1'), /syntax error/);
    const [row] = await sequelize.query('SELECT 1 AS one', { type: Sequelize.QueryTypes.SELECT });
    assert.equal(row.one, 1);
});
