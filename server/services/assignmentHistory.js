/**
 * Assignment history — who was assigned to a course before, and when it changed.
 *
 *   recordChange(before, after, { source, actorId, note })   one course, one write
 *   recordListChanges(beforeRows, afterRows, opts)          a whole list (upload, undo)
 *   historyFor({ periodId, programId, courseCode })          newest first, with actor names
 *   latestChanges(periodId)                                  Map(courseKey → newest entry)
 *
 * The action is worked out from the difference (utils/assignmentDiff.js);
 * nothing is written when nothing changed, so re-uploading the same file, a
 * re-validate, or an edit that only touches the year level leaves no entry.
 *
 * The record must outlive an undo, so this table is NOT in any undo snapshot:
 * an undo is recorded as one more entry (upload_undone) instead.
 *
 * Never throws: a history problem is logged and must not fail the change the
 * user just made (same rule as the notice queue).
 */
import db from '../models/index.js';
import {
  describeChange, diffLists, stateOf, leadOf, contributorsOf, programKey, courseKey,
} from '../utils/assignmentDiff.js';

const { CourseAssignmentHistory, UserAccount } = db;

const short = (s, n) => (s == null ? null : String(s).slice(0, n));

function entry(action, before, after, { source = 'manual', actorId = null, note = null, keyFrom = null } = {}) {
  const ref = keyFrom || after || before;
  return {
    period_id: ref.period_id,
    program_id: programKey(ref.program_id),
    course_code: short(ref.course_code, 16),
    course_name: short((after && after.course_name) || (before && before.course_name) || null, 100),
    action,
    lead_before: leadOf(before),
    lead_after: leadOf(after),
    contributors_before: before ? contributorsOf(before) : [],
    contributors_after: after ? contributorsOf(after) : [],
    source,
    changed_by_account_id: actorId || null,
    note: short(note, 255),
  };
}

/** Entries for one course's change. A moved course is written under both codes. */
function entriesFor(b, a, action, opts) {
  if (action === 'course_changed') {
    return [
      entry(action, b, a, { ...opts, keyFrom: b, note: opts.note || ('Course changed to ' + a.course_code) }),
      entry(action, b, a, { ...opts, keyFrom: a, note: opts.note || ('Course changed from ' + b.course_code) }),
    ];
  }
  return [entry(action, b, a, opts)];
}

/**
 * Record one course going from `before` to `after` (model instances or plain
 * objects; either may be null). `opts.action` overrides the derived action but
 * only when something actually changed. Returns the rows written ([] if none).
 */
export async function recordChange(before, after, opts = {}) {
  try {
    const b = stateOf(before);
    const a = stateOf(after);
    const derived = describeChange(b, a);
    if (!derived) return [];
    const ref = a || b;
    if (!ref || !ref.period_id || !ref.course_code) return [];
    return await CourseAssignmentHistory.bulkCreate(entriesFor(b, a, opts.action || derived, opts));
  } catch (err) {
    console.error('[history] could not record a change:', err.message);
    return [];
  }
}

/**
 * Record an event about a course even when its people didn't change (e.g.
 * official_confirmed: the registrar's list agreed with the pre-assignment).
 */
export async function recordEvent(row, action, opts = {}) {
  try {
    const s = stateOf(row);
    if (!s || !s.period_id || !s.course_code) return [];
    return await CourseAssignmentHistory.bulkCreate([entry(action, s, s, opts)]);
  } catch (err) {
    console.error('[history] could not record an event:', err.message);
    return [];
  }
}

/**
 * Record every course that really changed between two whole lists. With
 * `opts.action` (upload_undone) every changed course gets that action.
 */
export async function recordListChanges(beforeRows, afterRows, opts = {}) {
  try {
    const changes = diffLists(beforeRows, afterRows).filter((c) => (c.after || c.before).period_id);
    if (!changes.length) return [];
    const rows = changes.flatMap((c) => entriesFor(c.before, c.after, opts.action || c.action, opts));
    return await CourseAssignmentHistory.bulkCreate(rows);
  } catch (err) {
    console.error('[history] could not record list changes:', err.message);
    return [];
  }
}

async function actorNames(entries) {
  const ids = [...new Set(entries.map((e) => e.changed_by_account_id).filter(Boolean))];
  if (!ids.length) return new Map();
  const accounts = await UserAccount.findAll({ where: { id: ids }, attributes: ['id', 'display_name'] });
  return new Map(accounts.map((a) => [a.id, a.display_name]));
}

const present = (e, names) => {
  const plain = typeof e.get === 'function' ? e.get({ plain: true }) : e;
  return {
    id: plain.id,
    action: plain.action,
    source: plain.source,
    note: plain.note,
    course_code: plain.course_code,
    course_name: plain.course_name,
    lead_before: plain.lead_before || null,
    lead_after: plain.lead_after || null,
    contributors_before: plain.contributors_before || [],
    contributors_after: plain.contributors_after || [],
    changed_by_account_id: plain.changed_by_account_id,
    changed_by_name: plain.changed_by_account_id ? (names.get(plain.changed_by_account_id) || null) : null,
    created_at: plain.createdAt || plain.created_at,
  };
};

/** Every entry for one course, newest first, with the actor's display name. */
export async function historyFor({ periodId, programId, courseCode }) {
  const entries = await CourseAssignmentHistory.findAll({
    where: { period_id: Number(periodId), program_id: programKey(programId), course_code: String(courseCode || '').trim() },
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
  });
  const names = await actorNames(entries);
  return entries.map((e) => present(e, names));
}

/** Map(courseKey → newest entry, presented) for the whole term — the table's "Last updated". */
export async function latestChanges(periodId) {
  const out = new Map();
  if (!periodId) return out;
  const entries = await CourseAssignmentHistory.findAll({
    where: { period_id: Number(periodId) },
    attributes: ['id', 'program_id', 'course_code', 'action', 'source', 'changed_by_account_id', 'createdAt'],
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
  });
  const newest = [];
  for (const e of entries) {
    const key = courseKey(e);
    if (out.has(key)) continue;
    out.set(key, e);
    newest.push(e);
  }
  const names = await actorNames(newest);
  for (const [key, e] of out) {
    out.set(key, {
      action: e.action,
      source: e.source,
      at: e.createdAt,
      by: e.changed_by_account_id ? (names.get(e.changed_by_account_id) || null) : null,
    });
  }
  return out;
}
