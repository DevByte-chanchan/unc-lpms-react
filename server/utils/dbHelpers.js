/**
 * Schema-aware helpers — make the controllers tolerant of stale
 * migrations.
 *
 * Three things every upload path needs:
 *   1. filterToExistingColumns(model, records)   — strip unknown
 *      keys from INSERT records.
 *   2. safeWhereForPeriod(model, period_id)      — return a where
 *      clause that only includes period_id if the column actually
 *      exists in the table.
 *   3. safeDestroyByPeriod(model, period_id)     — apply the upload
 *      override (delete this period's rows) only when the column
 *      exists; otherwise return 0 and leave data alone.
 *
 * All three consult a single cached describeTable() result per model.
 */
import { sequelize } from '../config/sequelize.js';

const columnCache = new Map(); // tableName -> Set<attributeName>

/**
 * The set of model ATTRIBUTE names whose underlying column really exists.
 *
 * Callers pass attribute names (`period_id`, `name`, …), but the table stores
 * columns (`academic_period_id`, …) — the two diverge wherever a model declares
 * `field:`. Comparing attribute keys straight against column names silently
 * dropped every mapped key: a create would return 201 while quietly discarding
 * period_id. So resolve each attribute through its `field` before checking.
 */
async function getAttributeSet(model) {
  const key = model.tableName;
  if (columnCache.has(key)) return columnCache.get(key);

  const desc = await sequelize.getQueryInterface().describeTable(model.tableName);
  const columns = new Set(Object.keys(desc));

  const attrs = new Set();
  for (const [name, def] of Object.entries(model.rawAttributes || {})) {
    const column = (def && def.field) || name;   // `field` wins, else same name
    if (columns.has(column)) attrs.add(name);
  }

  columnCache.set(key, attrs);
  return attrs;
}

export async function filterToExistingColumns(model, records) {
  const set = await getAttributeSet(model);
  return records.map((r) => {
    const out = {};
    for (const k of Object.keys(r)) {
      if (set.has(k)) out[k] = r[k];
    }
    return out;
  });
}

export async function filterOneToExistingColumns(model, record) {
  const [filtered] = await filterToExistingColumns(model, [record]);
  return filtered;
}

/**
 * Build a `where` object whose keys are guaranteed to resolve to a real column
 * on the model's table. Unknown keys are silently dropped.
 */
export async function safeWhere(model, where) {
  const set = await getAttributeSet(model);
  const out = {};
  for (const k of Object.keys(where || {})) {
    if (set.has(k)) out[k] = where[k];
  }
  return out;
}

/**
 * Delete a period's existing rows from `model`'s table — but only if the model
 * actually has a period attribute. If it doesn't (stale schema), return 0
 * instead of throwing. The upload still proceeds; data simply accumulates
 * instead of being replaced.
 */
export async function safeDestroyByPeriod(model, period_id) {
  const set = await getAttributeSet(model);
  if (!set.has('period_id')) return 0;
  return model.destroy({ where: { period_id } });
}

export function clearColumnCache() {
  columnCache.clear();
}
