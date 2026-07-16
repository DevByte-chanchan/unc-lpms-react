// sqlite3 API compat shim on top of better-sqlite3.
// Implements the subset of node-sqlite3 that Sequelize's sqlite connection
// manager actually calls.
const B = require('better-sqlite3');

module.exports = {
  OPEN_READWRITE: 2,
  OPEN_CREATE: 4,
  OPEN_READONLY: 1,

  Database: class Database {
    constructor(filename, _mode, callback) {
      this._db = new B(filename);
      this._db.pragma('journal_mode=WAL');
      this._db.pragma('foreign_keys=ON');
      if (typeof callback === 'function') callback(null, this);
    }

    run(sql, ...params) {
      // Sequelize sometimes passes a callback as last param — strip it
      const cb = typeof params[params.length - 1] === 'function' ? params.pop() : null;
      const p = params.length ? params : [];
      try {
        const r = this._db.prepare(sql).run(...p);
        cb?.(null, { changes: r.changes, lastID: r.lastInsertRowid });
        return { changes: r.changes, lastID: r.lastInsertRowid };
      } catch (e) {
        const err = new Error(e.message);
        err.errno = 1;
        cb?.(err);
        throw err;
      }
    }

    get(sql, ...params) {
      const cb = typeof params[params.length - 1] === 'function' ? params.pop() : null;
      try {
        const row = this._db.prepare(sql).get(...params) || undefined;
        cb?.(null, row);
        return row;
      } catch (e) {
        const err = new Error(e.message);
        err.errno = 1;
        cb?.(err);
        throw err;
      }
    }

    all(sql, ...params) {
      const cb = typeof params[params.length - 1] === 'function' ? params.pop() : null;
      try {
        const rows = this._db.prepare(sql).all(...params);
        cb?.(null, rows);
        return rows;
      } catch (e) {
        const err = new Error(e.message);
        err.errno = 1;
        cb?.(err);
        throw err;
      }
    }

    prepare(sql) {
      const stmt = this._db.prepare(sql);
      const wrapper = {
        run(...args) {
          const cb = typeof args[args.length - 1] === 'function' ? args.pop() : null;
          try {
            const r = stmt.run(...args);
            const res = { changes: r.changes, lastID: r.lastInsertRowid };
            cb?.(null, res);
            return res;
          } catch (e) {
            cb?.(new Error(e.message));
            throw e;
          }
        },
        get(...args) {
          const cb = typeof args[args.length - 1] === 'function' ? args.pop() : null;
          try {
            const row = stmt.get(...args) || undefined;
            cb?.(null, row);
            return row;
          } catch (e) {
            cb?.(new Error(e.message));
            throw e;
          }
        },
        all(...args) {
          const cb = typeof args[args.length - 1] === 'function' ? args.pop() : null;
          try {
            const rows = stmt.all(...args);
            cb?.(null, rows);
            return rows;
          } catch (e) {
            cb?.(new Error(e.message));
            throw e;
          }
        },
        bind(...args) { stmt.bind(...args); return wrapper; },
      };
      return wrapper;
    }

    close(callback) {
      this._db.close();
      callback?.(null);
    }
  }
};
