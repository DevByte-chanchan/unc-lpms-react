/**
 * Upload helpers — pretty errors and period-safe upserts that also
 * dedupe within the incoming batch.
 *
 * Why explicit upsert (not ON DUPLICATE KEY UPDATE):
 *   The previous bulkCreate-based upsert trusted whatever UNIQUE
 *   indexes the DB happened to have. A stale single-column
 *   UNIQUE(code) caused cross-period leaks. Now we do per-period
 *   SELECT-then-INSERT/UPDATE in JS so other periods are physically
 *   unreachable.
 *
 * Why in-batch dedup:
 *   An Excel can legitimately contain the same `code` twice (e.g.
 *   "15" appearing in two rows). Without dedup the second row tries
 *   to INSERT against the composite UNIQUE(code, period_id) that now
 *   already exists from the first row's INSERT. We treat repeats as
 *   UPDATEs of the row we just touched.
 */
import { sequelize } from '../config/sequelize.js';

const columnCache = new Map();

/**
 * Model ATTRIBUTE names whose underlying column exists.
 *
 * Callers pass attribute names (`period_id`), but the table stores columns
 * (`academic_period_id`) wherever a model declares `field:`. Matching attribute
 * keys directly against column names would silently drop every mapped key — so
 * resolve each attribute through its `field` first. (Same trap as dbHelpers.js.)
 */
async function getAttributeSet(model) {
  const key = model.tableName;
  if (columnCache.has(key)) return columnCache.get(key);

  const desc = await sequelize.getQueryInterface().describeTable(model.tableName);
  const columns = new Set(Object.keys(desc));

  const attrs = new Set();
  for (const [name, def] of Object.entries(model.rawAttributes || {})) {
    const column = (def && def.field) || name;
    if (columns.has(column)) attrs.add(name);
  }

  columnCache.set(key, attrs);
  return attrs;
}
export function clearUploadColumnCache() { columnCache.clear(); }

export async function bulkUpsert(model, records, updateKeys, options = {}) {
  if (!Array.isArray(records) || records.length === 0) return [];

  const cols = await getAttributeSet(model);
  const key  = options.key || 'code';

  // Filter each record to known columns; collect natural keys.
  const safeRecords = [];
  const keys = new Set();
  let period_id_seen = null;
  for (const r of records) {
    const safe = {};
    for (const k of Object.keys(r)) if (cols.has(k)) safe[k] = r[k];
    safeRecords.push(safe);
    if (safe[key]) keys.add(String(safe[key]).toLowerCase());
    if (safe.period_id != null) period_id_seen = safe.period_id;
  }

  // No period scoping or natural key → plain inserts (used by
  // Faculty/Consultants after a destroy-by-period).
  if (!period_id_seen || !cols.has('period_id') || !cols.has(key)) {
    return model.bulkCreate(safeRecords);
  }

  // SELECT existing rows in THIS period that match any incoming key.
  const existing = await model.findAll({
    where: { period_id: period_id_seen, [key]: Array.from(keys) },
    attributes: ['id', key],
    raw: true,
  });

  // touchedByKey: code → row id. Starts as DB state, grows with each
  // INSERT in this batch so the next row with the same code becomes
  // an UPDATE of the row we just made.
  const touchedByKey = new Map(
    existing.map((row) => [String(row[key]).toLowerCase(), row.id])
  );

  const created = [];
  for (const r of safeRecords) {
    const k = String(r[key] || '').toLowerCase();
    if (!k) continue;
    const existingId = touchedByKey.get(k);

    if (existingId) {
      // UPDATE by primary id — physically can only touch that one row.
      if (Array.isArray(updateKeys) && updateKeys.length > 0) {
        const patch = {};
        for (const uk of updateKeys) {
          if (uk === 'period_id' || uk === key || uk === 'id') continue;
          if (r[uk] !== undefined) patch[uk] = r[uk];
        }
        if (Object.keys(patch).length > 0) {
          await model.update(patch, { where: { id: existingId } });
        }
      }
    } else {
      const row = await model.create(r);
      created.push(row);
      // Mark the code as touched so duplicates later in the same
      // batch become UPDATEs of this freshly-created row instead of
      // a second INSERT (which would hit the composite UNIQUE).
      touchedByKey.set(k, row.id);
    }
  }
  return created;
}

export function describeSequelizeError(err) {
  if (!err) return 'Unknown error.';
  const name = err.name || '';
  if (name === 'SequelizeUniqueConstraintError') {
    const fields = err.errors && err.errors.length ? err.errors.map((e) => e.path).join(', ') : 'unique field';
    const values = err.errors && err.errors.length ? err.errors.map((e) => e.value).join(', ') : '';
    return 'Duplicate value for ' + fields + (values ? ' ("' + values + '")' : '') + '. Try the Add button if you only need to insert one new row, or change the duplicated value.';
  }
  if (name === 'SequelizeValidationError') {
    const lines = (err.errors || []).map((e) => '• ' + (e.path || 'field') + ': ' + e.message);
    return 'Validation failed:\n' + lines.join('\n');
  }
  if (name === 'SequelizeDatabaseError') {
    const sql = err.original && err.original.sqlMessage;
    if (sql && /Unknown column/i.test(sql)) {
      return 'Database is missing a column the app expected: ' + sql + '. Restart the backend so it can run sync, or run `npm run db:migrate`.';
    }
    return 'Database error: ' + (sql || err.message);
  }
  return err.message || String(err);
}
