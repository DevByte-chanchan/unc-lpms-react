/**
 * Academic Period controller.
 *
 * listPeriods is intentionally fault-tolerant: if the database is
 * down or the table doesn't exist yet, it logs the issue and
 * returns []. This keeps the frontend dropdown from crashing — the
 * empty state in PeriodSelector then prompts the user to add a
 * period, which exercises createPeriod (which DOES surface its
 * errors so the user can react).
 *
 * Periods have a lifecycle status: 'Active' (editable) or 'Closed'
 * (globally read-only). closePeriod and reopenPeriod flip this flag.
 * Adding a new period does NOT auto-close older ones — that's the
 * OVPAA's explicit decision.
 */
import { Op } from 'sequelize';
import db from '../models/index.js';

const { AcademicPeriod } = db;

// Lazy auto-close engine: any Active period whose end_date has already
// passed gets flipped to Closed on the next list() call. No cron needed.
//
// `is_active: false` goes with it. A closed term that still carries the flag is a
// row saying two contradictory things about itself, and this app has already been
// bitten once by trusting a stale "this term is live" flag (see
// utils/rebuildOfferings.js). Closing means closed, in every column that claims to
// say so.
async function autoCloseExpired() {
  const today = new Date().toISOString().slice(0, 10);   // 'YYYY-MM-DD'
  try {
    await AcademicPeriod.update(
      { status: 'Closed', closed_at: new Date(), is_active: false },
      { where: { status: 'Active', end_date: { [Op.lt]: today, [Op.ne]: null } } },
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[periods] auto-close pass failed:', err.message);
  }
}

// Chronological rank. Same ordering the rest of the app uses to decide which
// term is "the current one" (services/period.jsx, utils/latestPeriod.js).
const semRank = (s) => {
  const v = String(s || '').trim().toLowerCase();
  if (v === 'summer' || v === '3') return 3;
  if (v === '2' || v === '2nd' || v === 'second') return 2;
  if (v === '1' || v === '1st' || v === 'first')  return 1;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const rankOf = (p) => {
  const m = String(p.school_year || '').match(/(\d{4})/);
  return (m ? Number(m[1]) : 0) * 1000 + semRank(p.semester);
};

/**
 * A PAST TERM IS A CLOSED TERM — with exactly one exception.
 *
 * The rule: the newest Active term is the current one, the term immediately
 * before it stays open (so the OVPAA can still correct the dates of the term
 * that just ended), and EVERY older term is Closed. This pass enforces it on
 * every list() call, so the statuses can't drift out of it.
 *
 * WHY THIS EXISTS
 * autoCloseExpired() above only closes a term whose end_date has passed, and a
 * term created without an end_date has none — so it stayed Active forever.
 * Those stranded Active rows are not cosmetic: `status === 'Active'` is a
 * permission, and a term from two school years ago that still claims it is a
 * term the whole app believes is writable. That is precisely how period-3
 * assignments came to hold period-5 courses and wedged the Course Assignment
 * import (see utils/rebuildOfferings.js). Closing them is the cure at the root.
 *
 * Nothing is ever REOPENED here. A term the OVPAA closed on purpose stays
 * closed, including the previous one — this pass only ever narrows.
 */
async function autoCloseSupersededTerms() {
  try {
    const rows = await AcademicPeriod.findAll({
      attributes: ['id', 'school_year', 'semester', 'status'],
      raw: true,
    });
    if (rows.length < 2) return;

    const ranked  = [...rows].sort((a, b) => rankOf(b) - rankOf(a));
    const actives = ranked.filter((p) => p.status === 'Active');
    if (actives.length === 0) return;

    const current  = actives[0];                                       // newest Active
    // The term immediately before the current one, whatever its status — the
    // one exception that is allowed to remain open.
    const previous = ranked.find((p) => rankOf(p) < rankOf(current));

    const spared = new Set([current.id, previous ? previous.id : null]);
    const stale  = ranked
      .filter((p) => p.status === 'Active' && !spared.has(p.id))
      .map((p) => p.id);

    if (stale.length > 0) {
      await AcademicPeriod.update(
        { status: 'Closed', closed_at: new Date(), is_active: false },
        { where: { id: { [Op.in]: stale } } },
      );
      // eslint-disable-next-line no-console
      console.log('[periods] closed ' + stale.length + ' superseded term(s) still flagged Active.');
    }

    // is_active is a SECOND claim about which term is live, and it drifted out of
    // step with `status`: a term could read Closed and still carry is_active = 1,
    // which is what "why is 2025-2026 still active?" looks like from the outside.
    // One term is live — the current one — and the flag now says exactly that.
    await AcademicPeriod.update(
      { is_active: false },
      { where: { is_active: true, id: { [Op.ne]: current.id } } },
    );
    await AcademicPeriod.update(
      { is_active: true },
      { where: { id: current.id, is_active: false } },
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[periods] superseded-close pass failed:', err.message);
  }
}

export async function listPeriods(_req, res, _next) {
  try {
    await autoCloseExpired();
    await autoCloseSupersededTerms();
    const rows = await AcademicPeriod.findAll({
      order: [['sort_order', 'DESC'], ['label', 'ASC']],
    });
    res.json(rows);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[periods] list query failed, returning []:', err.message);
    res.json([]);
  }
}

export async function createPeriod(req, res, next) {
  try {
    const { label, school_year, semester, is_active, sort_order,
            start_date, end_date, midterm_deadline, finals_deadline } = req.body;
    if (!label || !school_year || !semester) {
      return res.status(400).json({ message: 'label, school_year, and semester are required' });
    }
    const created = await AcademicPeriod.create({
      label, school_year, semester,
      is_active: Boolean(is_active),
      sort_order: Number(sort_order || 0),
      status: 'Active',
      start_date:       start_date       || null,
      end_date:         end_date         || null,
      midterm_deadline: midterm_deadline || null,
      finals_deadline:  finals_deadline  || null,
    });
    res.status(201).json(created);
  } catch (err) { next(err); }
}

export async function updatePeriod(req, res, next) {
  try {
    const row = await AcademicPeriod.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Period not found' });
    const editable = ['label', 'school_year', 'semester', 'sort_order',
                      'start_date', 'end_date', 'midterm_deadline', 'finals_deadline'];
    const patch = {};
    for (const k of editable) {
      if (req.body[k] !== undefined) patch[k] = req.body[k] === '' ? null : req.body[k];
    }
    await row.update(patch);
    res.json(row);
  } catch (err) { next(err); }
}

export async function closePeriod(req, res, next) {
  try {
    const row = await AcademicPeriod.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Period not found' });
    if (row.status === 'Closed') return res.json(row);
    row.status = 'Closed';
    row.closed_at = new Date();
    row.is_active = false;   // the flag follows the status — see autoCloseExpired
    await row.save();
    res.json(row);
  } catch (err) { next(err); }
}

export async function reopenPeriod(req, res, next) {
  try {
    const row = await AcademicPeriod.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Period not found' });
    if (row.status === 'Active') return res.json(row);
    row.status = 'Active';
    row.closed_at = null;
    await row.save();
    res.json(row);
  } catch (err) { next(err); }
}

export async function deletePeriod(req, res, next) {
  try {
    const n = await AcademicPeriod.destroy({ where: { id: req.params.id } });
    if (!n) return res.status(404).json({ message: 'Period not found' });
    res.status(204).end();
  } catch (err) { next(err); }
}
