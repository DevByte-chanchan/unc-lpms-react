/**
 * Clone-on-first-use helper.
 *
 * cloneFromPriorPeriod(model, currentPeriodId, opts) — when the user
 * switches to a period that has NO rows yet for `model`, this helper
 * copies rows from the immediate chronological PREDECESSOR period
 * into the current period as a starting point.
 *
 * "Predecessor" is computed from the actual school year + semester:
 *   - If current is Sem 2, the predecessor is Sem 1 of the same year.
 *   - If current is Summer, the predecessor is Sem 2 of the same year.
 *   - If current is Sem 1, the predecessor is the trailing term
 *     (Summer, then Sem 2) of the previous school year.
 *
 * Insertion order does NOT influence the search — adding 2025-2026
 * *after* 2026-2027 must not cause cloning from the older year when
 * the user creates 2026-2027 Sem 2.
 *
 * The search starts from the immediate predecessor and walks
 * backwards in time. The first predecessor that actually has data
 * for `model` becomes the source. If nothing earlier has data,
 * nothing is cloned.
 *
 * After the copy, the two periods are completely independent — each
 * row has its own `id`, both carry their own `period_id`, and edits
 * to one period don't touch the other.
 *
 * `attributes`  the columns to read from the source row
 * `transform`   optional row-by-row transform; defaults to identity
 * `updateKeys`  columns to UPDATE on conflict during the copy
 *
 * Returns:
 *   null               — nothing was cloned (no prior period had data)
 *   { count, source }  — count cloned + source period id
 */
import db from '../models/index.js';
import { bulkUpsert } from './uploadHelpers.js';

const { AcademicPeriod } = db;

// Semester ordering inside the same school year.
// 1st Sem < 2nd Sem < Summer (Summer is the trailing term).
const semesterRank = (sem) => {
  const s = String(sem || '').trim().toLowerCase();
  if (s === 'summer' || s === '3') return 3;
  if (s === '2' || s === 'second' || s === '2nd' || s === 'sem 2') return 2;
  if (s === '1' || s === 'first'  || s === '1st' || s === 'sem 1') return 1;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

// Chronological rank — bigger means "more recent".
// Year dominates; semester is the tie-breaker within a year.
export const rankPeriod = (p) => {
  if (!p) return -Infinity;
  const sy = String(p.school_year || '').trim();
  const m  = sy.match(/(\d{4})/);
  const year = m ? Number(m[1]) : 0;
  const sem  = semesterRank(p.semester);
  return year * 1000 + sem;
};

export async function cloneFromPriorPeriod(model, currentPeriodId, { attributes, transform, updateKeys } = {}) {
  if (!currentPeriodId) return null;

  const allPeriods = await AcademicPeriod.findAll({ raw: true });
  const current = allPeriods.find((p) => Number(p.id) === Number(currentPeriodId));
  if (!current) return null;

  const currentRank = rankPeriod(current);

  // Predecessor candidates = every other period strictly older than
  // the current one, sorted from most recent backwards. The first
  // entry is the IMMEDIATE predecessor (e.g. Sem 1 of the same year
  // when current is Sem 2). Insertion id never gets a vote.
  const candidates = allPeriods
    .filter((p) => Number(p.id) !== Number(currentPeriodId) && rankPeriod(p) < currentRank)
    .sort((a, b) => rankPeriod(b) - rankPeriod(a));

  for (const p of candidates) {
    const prior = await model.findAll({
      where: { period_id: p.id },
      attributes,
      raw: true,
    });
    if (prior.length > 0) {
      const records = prior.map((r) => {
        const base = transform ? transform(r) : { ...r };
        base.period_id = currentPeriodId;
        return base;
      });
      await bulkUpsert(model, records, updateKeys || []);
      return { count: prior.length, source: p.id };
    }
  }
  return null;
}
