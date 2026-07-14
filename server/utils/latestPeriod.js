/**
 * Current-term guard.
 *
 * THE RULE: exactly ONE term is writable — the CURRENT one. Every previous term
 * is read-only, full stop.
 *
 * This used to be "any period whose status says Active is writable", and that is
 * not the same thing. Nothing in the system guarantees a single Active row:
 * createPeriod stamps every new period 'Active'; creating a term only closes the
 * one term the UI happened to consider current; and the lazy auto-close pass
 * skips any period with a NULL end_date. So Active rows accumulate — and each one
 * was a fully writable term. A period from two school years ago accepted writes
 * (POST /faculty {period_id: 6} → 201) purely because a stale flag said Active.
 *
 * Status alone can therefore never be trusted as a permission. The question is
 * not "is this period flagged Active" but "IS THIS THE CURRENT TERM" — which is
 * derived, not stored, and so cannot go stale:
 *
 *     writable(p)  ⇔  p.status === 'Active'  AND  p.id === getActiveTermId()
 *
 * The legacy names below are the giveaway that this was the original intent:
 * enforceLatestPeriod / isLatestPeriodId / getLatestPeriodId. The semantics had
 * drifted to status-only; this restores what they always claimed.
 *
 * Exported (legacy names kept for call-site compatibility):
 *   - enforceLatestPeriod / enforceActiveTerm  — Express guard
 *   - isLatestPeriodId  / isActiveTermId       — boolean check
 *   - getLatestPeriodId / getActiveTermId      — picks the current (most recent Active) term
 */
import db from '../models/index.js';

const { AcademicPeriod } = db;

export async function getActiveTermId() {
  if (!AcademicPeriod) return null;
  try {
    // Pick the most-recent Active term as a default fallback for
    // callers that just want SOME writable term. Chronologically
    // ranked the way the frontend does it.
    const rows = await AcademicPeriod.findAll({
      where: { status: 'Active' },
      attributes: ['id', 'school_year', 'semester', 'sort_order'],
      raw: true,
    });
    if (!rows || rows.length === 0) return null;
    const semRank = (s) => {
      const v = String(s || '').trim().toLowerCase();
      if (v === 'summer' || v === '3') return 3;
      if (v === '2' || v === '2nd' || v === 'second' || v === 'sem 2') return 2;
      if (v === '1' || v === '1st' || v === 'first'  || v === 'sem 1') return 1;
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };
    const rank = (p) => {
      const m = String(p.school_year || '').match(/(\d{4})/);
      return (m ? Number(m[1]) : 0) * 1e9 + semRank(p.semester) * 1e6 + (Number(p.sort_order) || 0) * 1e3 + (Number(p.id) || 0);
    };
    let best = rows[0]; let bestRank = rank(best);
    for (let i = 1; i < rows.length; i += 1) {
      const r = rank(rows[i]);
      if (r > bestRank) { best = rows[i]; bestRank = r; }
    }
    return best ? best.id : null;
  } catch (_err) {
    return null;
  }
}

export async function isActiveTermId(periodId) {
  if (!periodId) return true; // falsy ids are handled by the caller's own validation
  try {
    const row = await AcademicPeriod.findByPk(periodId, { attributes: ['status'], raw: true });
    if (!row) return true; // unknown period — let downstream raise a clearer error
    if (row.status !== 'Active') return false;

    // Flagged Active is necessary but NOT sufficient: it must also be the term
    // we currently rank as the newest Active one. A stranded Active row from an
    // old school year fails here, which is the whole point.
    const currentId = await getActiveTermId();
    return currentId != null && Number(currentId) === Number(periodId);
  } catch (_err) {
    return true;
  }
}

/**
 * 403 with a message that says which of the two ways this term is locked, since
 * "closed" and "superseded by a newer term" call for different user actions.
 */
export async function enforceActiveTerm(res, periodId) {
  if (await isActiveTermId(periodId)) return true;

  let message = 'This term is read-only — switch to the current term to make changes.';
  try {
    const row = await AcademicPeriod.findByPk(periodId, { attributes: ['status', 'label'], raw: true });
    const name = (row && row.label) ? '“' + row.label + '”' : 'This term';
    message = (row && row.status !== 'Active')
      ? name + ' is closed — switch to the current term to make changes.'
      : name + ' is a past term — only the current term can be edited.';
  } catch (_err) { /* fall back to the generic message */ }

  res.status(403).json({ message });
  return false;
}

// Legacy export aliases — keep existing controller imports working.
export const getLatestPeriodId  = getActiveTermId;
export const isLatestPeriodId   = isActiveTermId;
export const enforceLatestPeriod = enforceActiveTerm;
