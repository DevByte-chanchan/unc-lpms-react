'use strict';

// The server talks to SQLite over ONE shared connection (see models/index.js), so only one
// transaction can be open at a time: a second BEGIN while another is open fails with
// "cannot start a transaction within a transaction". Two overlapping requests that each open a
// transaction used to hit exactly that.
//
// serializeTransactions() makes sequelize.transaction() wait its turn. It covers both forms:
//   managed   sequelize.transaction(options, async t => { ... })   the lock is released when Sequelize
//                                                                  has committed or rolled back
//   unmanaged const t = await sequelize.transaction(); ...         the lock is released by
//                                                                  t.commit() or t.rollback()
//
// Limits, stated plainly:
//  * A transaction must not start another one inside itself. That used to fail with the SQLite error;
//    it would now wait forever for itself, so the hold limit below turns it into a logged release.
//  * Queries made OUTSIDE a transaction while one is open still run on the same connection, and so
//    inside it. That is the shared connection's nature; this fixes the crash, not that.
//  * A transaction held longer than `holdLimitMs` (a forgotten commit) releases the queue and logs
//    a warning, so one leak cannot freeze every later write.

const serializeTransactions = (sequelize, { holdLimitMs = 30000, warn = (...args) => console.warn(...args) } = {}) => {
    const original = sequelize.transaction.bind(sequelize);
    let tail = Promise.resolve();

    sequelize.transaction = async function transaction(options, autoCallback) {
        if (typeof options === 'function') { autoCallback = options; options = undefined; }

        let release;
        const turn = new Promise(resolve => { release = resolve; });
        const previous = tail;
        tail = previous.then(() => turn);
        await previous;

        let released = false;
        const give = () => { if (!released) { released = true; clearTimeout(watchdog); release(); } };
        const watchdog = setTimeout(() => {
            warn(`A transaction held the database for over ${holdLimitMs} ms; releasing the queue.`);
            give();
        }, holdLimitMs);
        if (watchdog.unref) watchdog.unref();

        if (autoCallback) {
            try {
                return await original(options, autoCallback);
            } finally {
                give();
            }
        }

        let t;
        try {
            t = await original(options);
        } catch (error) {
            give();
            throw error;
        }
        const commit = t.commit.bind(t);
        const rollback = t.rollback.bind(t);
        t.commit = async () => { try { return await commit(); } finally { give(); } };
        t.rollback = async () => { try { return await rollback(); } finally { give(); } };
        return t;
    };

    return sequelize;
};

module.exports = { serializeTransactions };
