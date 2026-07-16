const path = require('path');
const config = require('./config/config.json').development;
const Sequelize = require('sequelize');

const compat = require('./sqlite3-compat');
const B = require('better-sqlite3');
const mock = { ...compat, OPEN_READWRITE: 2, OPEN_CREATE: 4, OPEN_READONLY: 1 };
require.cache[require.resolve('sqlite3')] = { exports: mock, id: require.resolve('sqlite3'), filename: require.resolve('sqlite3'), loaded: true, children: [] };

const raw = new B(config.storage);
raw.pragma('journal_mode=WAL');
raw.pragma('foreign_keys=ON');

const _pos = [];
const toQ = (sql) => sql.replace(/\$(\d+)/g, (_, n) => { _pos.push(+n); return '?'; });
const toArgs = (params) => {
  if (!params || params.length === 0 || Array.isArray(params[0])) return params;
  if (params.length === 1 && typeof params[0] === 'object' && params[0] !== null) {
    const obj = params[0];
    return _pos.length ? _pos.slice(0, _pos.length).map(n => obj[`$${n}`] ?? obj[n] ?? null) : Object.values(obj);
  }
  return params;
};
const prep = (sql) => { _pos.length = 0; const r = toQ(sql); return raw.prepare(r); };
const makeStatement = (stmt) => Object.defineProperty(
  { lastID: stmt?.lastInsertRowid, changes: stmt?.changes },
  'constructor',
  { value: { name: 'Statement' }, configurable: true }
);

const wrapConnection = {
  run(sql, ...args) {
    const cb = typeof args[args.length - 1] === 'function' ? args.pop() : null;
    const p = toArgs(args);
    try { const r = prep(sql).run(...p); const s = makeStatement(r); cb?.call(s, null); return s; }
    catch (e) { cb?.call({}, e); throw e; }
  },
  get(sql, ...args) {
    const cb = typeof args[args.length - 1] === 'function' ? args.pop() : null;
    const p = toArgs(args);
    try { const r = prep(sql).get(...p); cb?.call(makeStatement(), null, r ?? undefined); return r ?? undefined; }
    catch (e) { cb?.call({}, e); throw e; }
  },
  all(sql, ...args) {
    const cb = typeof args[args.length - 1] === 'function' ? args.pop() : null;
    const p = toArgs(args);
    try {
      const r = prep(sql).all(...p);
      cb?.call(makeStatement(), null, r);
      return r;
    } catch (e) {
      if (e.message?.includes('does not return data')) {
        prep(sql).run(...p);
        cb?.call(makeStatement(), null, []);
        return [];
      }
      cb?.call({}, e);
      throw e;
    }
  },
  prepare(sql) {
    _pos.length = 0; toQ(sql);
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
  close(cb) { raw.close(); cb?.(); },
};

const { Umzug, SequelizeStorage } = require('umzug');
const seq = new Sequelize('lpms', '', '', { dialect: 'sqlite', storage: config.storage, logging: false });
const cm = seq.dialect.connectionManager;
cm.connections = { default: wrapConnection };
cm.getConnection = async () => wrapConnection;

const umzug = new Umzug({
  migrations: {
    glob: 'migrations/*.js',
    resolve: ({ name, path: migrationPath, context }) => {
      const migration = require(migrationPath);
      return {
        name,
        up: async () => { console.log('Running:', name); await migration.up(context, Sequelize); },
        down: async () => { console.log('Reverting:', name); await migration.down(context, Sequelize); },
      };
    },
  },
  context: seq.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize: seq }),
  logger: console,
});

console.log('Starting migrations...');
umzug.up().then((result) => {
  console.log('Migrations complete, applied:', result?.length || 0);
  process.exit(0);
}).catch(e => {
  console.error('Migration failed:', e?.message || e);
  if (e?.stack) console.error(e.stack.split('\n').slice(0, 5).join('\n'));
  process.exit(1);
});