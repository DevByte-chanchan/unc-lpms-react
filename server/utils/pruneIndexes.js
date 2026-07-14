/**
 * Pre-sync index pruning.
 *
 * Sequelize's `sync({ alter: true })` is prone to a well-known bug:
 * each boot it re-creates UNIQUE indexes on already-unique columns
 * instead of recognising the existing one. After many restarts you
 * end up with `label`, `label_2`, `label_3`, … `label_64`, and MySQL
 * rejects the next sync with ER_TOO_MANY_KEYS (max 64 keys/table).
 *
 * This helper runs BEFORE sync. For each table it:
 *   1. Lists every index.
 *   2. Groups them by their column-set signature (sorted column names).
 *   3. In each group, KEEPS the canonical index (PRIMARY, or the one
 *      whose name has no numeric suffix), DROPS every other duplicate.
 *
 * The helper is idempotent — once the duplicates are gone there's
 * nothing to do, so it's safe to run on every boot.
 */
import { sequelize } from '../config/sequelize.js';

// Tables this module owns. New tables can be added freely.
const TABLES = [
  'academic_periods',
  'departments',
  'programs',
  'faculty',
  'courses',
  'industry_consultants',
];

function fieldName(f) {
  if (f == null) return '';
  if (typeof f === 'string') return f;
  return String(f.attribute || f.column || f.columnName || f.name || '');
}

// Build a stable column-set key for grouping (e.g. "code|period_id").
function signature(idx) {
  const fields = Array.isArray(idx.fields) ? idx.fields : [];
  return fields
    .map((f) => fieldName(f).toLowerCase())
    .filter(Boolean)
    .sort()
    .join('|');
}

// Lower score = preferred-to-keep.
//   - PRIMARY always wins.
//   - Then plain names without trailing "_<digits>" (e.g. "label" over "label_2").
//   - Then shorter names (the original) over longer (the duplicates).
function keepScore(idx) {
  if (idx.primary || idx.name === 'PRIMARY') return -1000;
  const name = idx.name || '';
  const hasNumericSuffix = /_\d+$/.test(name);
  return (hasNumericSuffix ? 100 : 0) + name.length;
}

async function pruneTable(qi, tableName) {
  let indexes;
  try {
    indexes = await qi.showIndex(tableName);
  } catch (_err) {
    return; // table doesn't exist yet — sync will create it
  }
  if (!Array.isArray(indexes) || indexes.length === 0) return;

  const groups = new Map();
  for (const idx of indexes) {
    if (!idx || !idx.name) continue;
    const sig = signature(idx);
    if (!sig) continue;
    if (!groups.has(sig)) groups.set(sig, []);
    groups.get(sig).push(idx);
  }

  for (const [sig, group] of groups.entries()) {
    if (group.length < 2) continue;
    // Pick winner.
    group.sort((a, b) => keepScore(a) - keepScore(b));
    const keep = group[0];
    const drop = group.slice(1);
    for (const idx of drop) {
      if (idx.name === 'PRIMARY') continue;
      try {
        await qi.removeIndex(tableName, idx.name);
        console.log(
          '[indexes] pruned duplicate index on ' + tableName +
          ' — dropped "' + idx.name + '" (kept "' + keep.name + '" on [' + sig + '])'
        );
      } catch (err) {
        console.warn('[indexes] could not drop ' + tableName + '.' + idx.name + ':', err.message);
      }
    }
  }
}

export async function pruneDuplicateIndexes() {
  const qi = sequelize.getQueryInterface();
  for (const t of TABLES) {
    await pruneTable(qi, t);
  }
}
