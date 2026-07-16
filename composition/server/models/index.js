'use strict';
const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];
const db = {};

let compatModule, wrapConnection;

if (config.dialect === 'sqlite') {
  const compat = require('../sqlite3-compat');
  const B = require('better-sqlite3');

  compatModule = { ...compat, OPEN_READWRITE: 2, OPEN_CREATE: 4, OPEN_READONLY: 1 };

  // Mock sqlite3 module in require cache
  const resolved = require.resolve('sqlite3');
  require.cache[resolved] = { exports: compatModule, id: resolved, filename: resolved, loaded: true, children: [] };

  // Open raw better-sqlite3 connection.
  // Storage path may be relative (portable across machines) — resolve it
  // against the server directory, not the process cwd.
  const storagePath = path.isAbsolute(config.storage)
    ? config.storage
    : path.resolve(__dirname, '..', config.storage);
  const raw = new B(storagePath);
  raw.pragma('journal_mode=WAL');
  raw.pragma('foreign_keys=ON');

  const toQ = (sql) => sql.replace(/\$(\d+)/g, (_, n) => { pos.push(+n); return '?'; });
  const pos = [];
  // SQLite drivers can only bind numbers/strings/null — convert JS values
  // (Date objects from seeders/bulk ops, booleans) into storable forms.
  const bindable = (v) => {
    if (v instanceof Date) {
      const p = (n, l = 2) => String(n).padStart(l, '0');
      return `${v.getUTCFullYear()}-${p(v.getUTCMonth() + 1)}-${p(v.getUTCDate())} ${p(v.getUTCHours())}:${p(v.getUTCMinutes())}:${p(v.getUTCSeconds())}.${p(v.getUTCMilliseconds(), 3)} +00:00`;
    }
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (v === undefined) return null;
    return v;
  };
  const toArgs = (params) => {
    if (!params || params.length === 0) return params;
    if (Array.isArray(params[0])) return [params[0].map(bindable)];
    if (params.length === 1 && typeof params[0] === 'object' && params[0] !== null) {
      // Named $N params → positional matching $N -> ? order
      const obj = params[0];
      return (pos.length ? pos.slice(0, pos.length).map(n => obj[`$${n}`] ?? obj[n] ?? null) : Object.values(obj)).map(bindable);
    }
    return params.map(bindable);
  };
  const prep = (sql) => { pos.length = 0; const r = toQ(sql); return raw.prepare(r); };
  const makeStatement = (stmt) => Object.defineProperty(
    { lastID: stmt?.lastInsertRowid, changes: stmt?.changes },
    'constructor',
    { value: { name: 'Statement' }, configurable: true }
  );

  wrapConnection = {
    run(sql, ...args) {
      if (args.length > 0 && args[args.length - 1] == null) args.pop();
      const cb = typeof args[args.length - 1] === 'function' ? args.pop() : null;
      const stmt = prep(sql);
      const p = toArgs(args);
      try { const r = stmt.run(...p); const s = makeStatement(r); cb?.call(s, null); return s; }
      catch (e) { cb?.call({}, e); throw e; }
    },
    get(sql, ...args) {
      if (args.length > 0 && args[args.length - 1] == null) args.pop();
      const cb = typeof args[args.length - 1] === 'function' ? args.pop() : null;
      const stmt = prep(sql);
      const p = toArgs(args);
      try { const r = stmt.get(...p); cb?.call(makeStatement(), null, r ?? undefined); return r ?? undefined; }
      catch (e) { cb?.call({}, e); throw e; }
    },
    all(sql, ...args) {
      if (args.length > 0 && args[args.length - 1] == null) args.pop();
      const cb = typeof args[args.length - 1] === 'function' ? args.pop() : null;
      const stmt = prep(sql);
      const p = toArgs(args);
      try {
        const r = stmt.all(...p);
        cb?.call(makeStatement(), null, r);
        return r;
      } catch (e) {
        if (e.message?.includes('does not return data')) {
          stmt.run(...p);
          cb?.call(makeStatement(), null, []);
          return [];
        }
        cb?.call({}, e);
        throw e;
      }
    },
    prepare(sql) {
      pos.length = 0; toQ(sql);
      const stmt = raw.prepare(sql.replace(/\$(\d+)/g, '?'));
      return {
        run: (...args) => { const r = stmt.run(...toArgs(args)); return makeStatement(r); },
        get: (...args) => stmt.get(...toArgs(args)) ?? undefined,
        all: (...args) => {
          const p = toArgs(args);
          try { return stmt.all(...p); } catch (e) { if (e.message?.includes('does not return data')) { stmt.run(...p); return []; } throw e; }
        },
        bind: () => ({ run: () => ({}), get: () => undefined, all: () => [] }),
      };
    },
    serialize(fn) { if (fn) fn(); },
    parallelize(fn) { if (fn) fn(); },
    // NO-OP close: Sequelize closes "per-transaction" connections after each
    // commit/rollback, but this wrapper shares ONE raw sqlite connection for
    // the whole process — actually closing it killed the DB after any
    // transaction ("database is not open" → app looks empty until restart).
    close(cb) { cb?.(); },
  };
  db.__raw = raw;
}

const sequelize = new Sequelize(config.database || 'lpms', config.username || '', config.password || '', {
  ...config,
  dialectModule: compatModule || undefined,
  logging: false,
});

if (config.dialect === 'sqlite' && wrapConnection) {
  const cm = sequelize.dialect.connectionManager;
  cm.connections = { default: wrapConnection };
  cm.getConnection = async () => wrapConnection;
}

// 1. Read and initialize models
fs.readdirSync(__dirname)
    .filter(file => file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js')
    .forEach(file => {
        const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
        db[model.name] = model;
    });

// 2. Execute internal .associate() methods
Object.keys(db).forEach(modelName => {
    if (db[modelName].associate) {
        db[modelName].associate(db);
    }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// --- KEEP THESE MANUAL ASSOCIATIONS ---
db.Topic.hasMany(db.Subtopic, { foreignKey: 'topic_id', as: 'subtopics', onDelete: 'CASCADE' });
db.Subtopic.belongsTo(db.Topic, { foreignKey: 'topic_id', as: 'topic' });
db.ILOReference.belongsTo(db.IntendedLearningOutcome, { foreignKey: 'ilo_id' });
db.IntendedLearningOutcome.hasMany(db.ILOReference, { foreignKey: 'ilo_id' });
db.ILOReference.belongsTo(db.Reference, { foreignKey: 'reference_id', as: 'Reference' });
db.Reference.hasMany(db.ILOReference, { foreignKey: 'reference_id', as: 'iloReferences' });

module.exports = db;
