/**
 * Fresh start — wipe every data table, then (development) seed the logins again.
 *
 * The table list comes from the model registry, so a model added later is
 * wiped too without anyone editing a list. On top of that, tables an older
 * schema left behind (LEGACY_TABLES) and any grants / audit tables are wiped
 * when they exist. SequelizeMeta is never touched, and nothing is dropped:
 * TRUNCATE only, which also resets AUTO_INCREMENT so new rows start at 1.
 *
 * The logic lives here so the tests can run it against scratch tables;
 * scripts/purge.js is the CLI wrapper (npm run db:fresh).
 */
import path from 'path';
import fs from 'fs/promises';
import { seedUsers } from './seedUsers.js';

// Model keys (in models/index.js) of the VMGO statements, kept with --keep-vmgo.
export const VMGO_MODELS = Object.freeze(['UniversityStatement', 'DepartmentStatement']);
// Never wiped: the migration ledger.
export const KEEP_TABLES = Object.freeze(['SequelizeMeta']);
// Tables no model describes any more, wiped when an older database still has them.
export const LEGACY_TABLES = Object.freeze(['course_offerings', 'course_assignments']);
const GRANT_OR_AUDIT = /grant|audit/i;

export class FreshStartError extends Error {}

const isProduction = (env) => (env.NODE_ENV || 'development') === 'production';

export function assertNotProduction(env = process.env) {
  if (isProduction(env)) {
    throw new FreshStartError('Refusing to wipe the database: NODE_ENV=production. A fresh start is for development only.');
  }
}

const tableName = (model) => {
  const t = model.getTableName();
  return typeof t === 'string' ? t : t.tableName;
};

/** { wipe: [table], keep: [table] } from the model registry plus `extra` table names. */
export function planTables(models, { keepVmgo = false, extra = [] } = {}) {
  const wipe = [];
  const keep = [];
  for (const [key, model] of Object.entries(models)) {
    if (!model || typeof model.getTableName !== 'function') continue;
    const t = tableName(model);
    if (KEEP_TABLES.includes(t) || wipe.includes(t) || keep.includes(t)) continue;
    (keepVmgo && VMGO_MODELS.includes(key) ? keep : wipe).push(t);
  }
  for (const t of extra) {
    if (!KEEP_TABLES.includes(t) && !wipe.includes(t) && !keep.includes(t)) wipe.push(t);
  }
  return { wipe, keep };
}

/** Tables in the database that no model covers but a fresh start should still empty. */
export async function extraTables(sequelize, known = []) {
  const all = (await sequelize.getQueryInterface().showAllTables())
    .map((t) => (typeof t === 'string' ? t : t.tableName));
  return all.filter((t) => !known.includes(t) && !KEEP_TABLES.includes(t)
    && (LEGACY_TABLES.includes(t) || GRANT_OR_AUDIT.test(t)));
}

const quote = (t) => '`' + String(t).replace(/`/g, '``') + '`';

/**
 * TRUNCATE each table with FK checks off. Returns [{ table, rows }] — the row
 * count before the wipe. FOREIGN_KEY_CHECKS is per connection, so everything
 * runs on one pinned connection (the transaction's) and is switched back on
 * even when a TRUNCATE fails.
 */
export async function wipeTables(sequelize, tables) {
  const t = await sequelize.transaction();
  const counts = [];
  try {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction: t });
    for (const table of tables) {
      const [rows] = await sequelize.query('SELECT COUNT(*) AS n FROM ' + quote(table), { transaction: t });
      await sequelize.query('TRUNCATE TABLE ' + quote(table), { transaction: t });
      counts.push({ table, rows: Number(rows[0].n) });
    }
  } finally {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction: t }).catch(() => {});
    // TRUNCATE already committed implicitly; this only releases the connection.
    await t.commit().catch(() => {});
  }
  return counts;
}

/** Empty the uploads folder, keeping .gitkeep. Returns the names removed. */
export async function emptyUploads(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
  const removed = [];
  for (const name of entries) {
    if (name === '.gitkeep') continue;
    await fs.rm(path.join(dir, name), { recursive: true, force: true });
    removed.push(name);
  }
  return removed;
}

/**
 * @param models      the model registry (needs UserAccount for the seed)
 * @param extra       further table names to wipe (see extraTables)
 * @returns { wiped: [{ table, rows }], kept: [table], removedUploads: [name], seeded }
 *          seeded is seedUsers()'s result: { created, existing, demo, notes }.
 */
export async function freshStart({ sequelize, models, env = process.env, keepVmgo = false, extra = [], uploadsDir = null }) {
  assertNotProduction(env);
  const { wipe, keep } = planTables(models, { keepVmgo, extra });
  const wiped = await wipeTables(sequelize, wipe);
  const removedUploads = uploadsDir ? await emptyUploads(uploadsDir) : [];
  const seeded = await seedUsers({ Model: models.UserAccount, env });
  return { wiped, kept: keep, removedUploads, seeded };
}
