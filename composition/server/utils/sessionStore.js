'use strict';

// Where sign-in sessions live: the Sessions table (see the migration), on the same SQLite connection
// the models use. It is synchronous on purpose (better-sqlite3), so issuing and checking a session
// stay plain function calls. Only the SHA-256 of a token is stored.

const crypto = require('crypto');

const tokenDigest = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

let statements = null;
const sql = () => {
    if (statements) return statements;
    const raw = require('../models').__raw;
    if (!raw) throw new Error('The Sessions table needs the SQLite connection from models/index.js.');
    statements = {
        insert: raw.prepare('INSERT OR REPLACE INTO Sessions (token_hash, user_id, role, created_at, expires_at) VALUES (?, ?, ?, ?, ?)'),
        find: raw.prepare('SELECT user_id, role, expires_at FROM Sessions WHERE token_hash = ?'),
        remove: raw.prepare('DELETE FROM Sessions WHERE token_hash = ?'),
        removeUser: raw.prepare('DELETE FROM Sessions WHERE user_id = ?'),
        removeUserExcept: raw.prepare('DELETE FROM Sessions WHERE user_id = ? AND token_hash <> ?'),
        purge: raw.prepare('DELETE FROM Sessions WHERE expires_at <= ?'),
        count: raw.prepare('SELECT COUNT(*) AS n FROM Sessions')
    };
    return statements;
};

const create = ({ token, userId, role, now, expiresAt }) => {
    const s = sql();
    // Expired rows are cleaned out whenever a new session is issued, so the table cannot grow without bound.
    s.purge.run(now);
    s.insert.run(tokenDigest(token), Number(userId), String(role ?? ''), now, expiresAt);
};

// { userId, role, expiresAt } for a token, or null.
const find = (token) => {
    if (!token) return null;
    const row = sql().find.get(tokenDigest(token));
    return row ? { userId: row.user_id, role: row.role, expiresAt: Number(row.expires_at) } : null;
};

const remove = (token) => (token ? sql().remove.run(tokenDigest(token)).changes > 0 : false);
const removeForUser = (userId, exceptToken = null) => (exceptToken
    ? sql().removeUserExcept.run(Number(userId), tokenDigest(exceptToken)).changes
    : sql().removeUser.run(Number(userId)).changes);
const purgeExpired = (now = Date.now()) => sql().purge.run(now).changes;
const count = () => sql().count.get().n;

module.exports = { tokenDigest, create, find, remove, removeForUser, purgeExpired, count };
