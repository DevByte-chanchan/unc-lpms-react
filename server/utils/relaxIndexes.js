/**
 * Boot-time index reconciliation.
 *
 *   1. Drop any single-column UNIQUE(code) — that constraint blocks
 *      the cross-period clone from inserting duplicate codes under
 *      a different period_id.
 *   2. Dedupe any existing rows that share (code, period_id) — keep
 *      the lowest id, delete the rest. Necessary because step 3's
 *      ALTER would fail if dupes exist.
 *   3. Add a composite UNIQUE(code, period_id). With that in place
 *      bulkUpsert's `updateOnDuplicate` can correctly UPDATE matching
 *      rows on re-upload, preventing duplicate inserts.
 *
 * All steps are idempotent and safe to run on every boot.
 */
import { sequelize } from '../config/sequelize.js';

const TABLES = ['departments', 'programs'];
const COMPOSITE_NAMES = {
  departments:      'departments_code_period_unique',
  programs:         'programs_code_period_unique',
};

function fieldName(f) {
  if (f == null) return '';
  if (typeof f === 'string') return f;
  return String(f.attribute || f.column || f.columnName || f.name || '');
}

async function dropSingleCodeUnique(qi, tableName) {
  let indexes;
  try { indexes = await qi.showIndex(tableName); } catch (_) { return; }
  if (!Array.isArray(indexes)) return;
  for (const idx of indexes) {
    if (!idx || !idx.unique) continue;
    const fields = Array.isArray(idx.fields) ? idx.fields : [];
    if (fields.length !== 1) continue;
    if (fieldName(fields[0]).toLowerCase() !== 'code') continue;
    if (!idx.name || idx.name === 'PRIMARY') continue;
    try {
      await qi.removeIndex(tableName, idx.name);
      console.log('[indexes] dropped UNIQUE(code) on ' + tableName + ' (index "' + idx.name + '")');
    } catch (err) {
      console.warn('[indexes] could not drop ' + tableName + '.' + idx.name + ':', err.message);
    }
  }
}

// Raw SQL below bypasses Sequelize's attribute→column mapping, so it needs the
// real column names — and the PK is now named after its own entity.
const PK_COLUMN = {
  departments: 'department_id',
  programs:    'program_id',
};

async function dedupe(tableName) {
  // Keep lowest id per (code, academic_period_id); delete the rest.
  // The period may be NULL for legacy rows — treat those as a single
  // bucket so they too get deduped against each other.
  const pk = PK_COLUMN[tableName];
  if (!pk) return;

  const sql =
    'DELETE t1 FROM `' + tableName + '` AS t1 ' +
    'JOIN `' + tableName + '` AS t2 ' +
    '  ON t1.code = t2.code ' +
    '  AND ((t1.academic_period_id <=> t2.academic_period_id)) ' +
    '  AND t1.`' + pk + '` > t2.`' + pk + '`;';
  try {
    const [result] = await sequelize.query(sql);
    const removed = (result && (result.affectedRows || 0));
    if (removed) console.log('[indexes] deduped ' + tableName + ' — removed ' + removed + ' duplicate row(s)');
  } catch (err) {
    console.warn('[indexes] dedupe ' + tableName + ' failed:', err.message);
  }
}

async function ensureCompositeUnique(qi, tableName) {
  const indexName = COMPOSITE_NAMES[tableName];
  if (!indexName) return;
  let indexes;
  try { indexes = await qi.showIndex(tableName); } catch (_) { return; }
  const already = (indexes || []).some((i) => i && i.name === indexName);
  if (already) return;
  try {
    await qi.addIndex(tableName, {
      // COLUMN names, not model attributes.
      fields: ['code', 'academic_period_id'],
      unique: true,
      name: indexName,
    });
    console.log('[indexes] added UNIQUE(code, academic_period_id) on ' + tableName + ' as "' + indexName + '"');
  } catch (err) {
    console.warn('[indexes] could not add composite unique on ' + tableName + ':', err.message);
  }
}

export async function relaxCodeUniqueConstraints() {
  const qi = sequelize.getQueryInterface();
  for (const t of TABLES) {
    await dropSingleCodeUnique(qi, t);
    await dedupe(t);
    await ensureCompositeUnique(qi, t);
  }
}
