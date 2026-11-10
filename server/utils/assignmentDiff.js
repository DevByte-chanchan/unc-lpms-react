/**
 * What changed about a course assignment, for the history record
 * (services/assignmentHistory.js). Pure: no database, unit-tested on its own.
 *
 * A course is identified by (period_id, program_id, course_code), never by
 * the row id: an upload destroys and re-creates the whole list, so ids change
 * every time while the course stays the same course. program_id null is
 * stored as 0 ("no program") so the key is always complete.
 *
 * People are compared by NAME (honorifics, punctuation and case ignored), with
 * the faculty id only as a fallback when a name is missing. The id is resolved
 * from the name against the term's faculty list and can appear later (the
 * faculty list uploaded after the assignments) without anybody changing.
 */

const normName = (s) => String(s || '')
  .toLowerCase()
  .replace(/\b(dr|prof|professor|engr|engineer|atty|mr|mrs|ms|sir|maam|ma'?am)\.?\s+/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

export const programKey = (programId) => Number(programId) || 0;
export const codeKey = (code) => String(code || '').trim().toLowerCase();
export const courseKey = (row) => programKey(row && row.program_id) + '|' + codeKey(row && row.course_code);

const personKey = (p) => {
  if (!p) return null;
  const n = normName(p.faculty_name);
  if (n) return 'n:' + n;
  return p.faculty_id != null ? 'id:' + p.faculty_id : null;
};

/** { faculty_id, faculty_name } of the Lead, or null when there is none. */
export function leadOf(row) {
  if (!row || (!row.faculty_name && row.faculty_id == null)) return null;
  return { faculty_id: row.faculty_id ?? null, faculty_name: row.faculty_name ?? null };
}

/** The Contributors as a clean [{ faculty_id, faculty_name }]. */
export function contributorsOf(row) {
  const list = row && Array.isArray(row.contributors) ? row.contributors : [];
  return list
    .filter((c) => c && (c.faculty_name || c.faculty_id != null))
    .map((c) => ({ faculty_id: c.faculty_id ?? null, faculty_name: c.faculty_name ?? null }));
}

export const sameLead = (a, b) => personKey(leadOf(a)) === personKey(leadOf(b));

/** { added, removed } Contributors between two rows. */
export function contributorChanges(before, after) {
  const b = contributorsOf(before);
  const a = contributorsOf(after);
  const bKeys = new Set(b.map(personKey));
  const aKeys = new Set(a.map(personKey));
  return {
    added: a.filter((c) => !bKeys.has(personKey(c))),
    removed: b.filter((c) => !aKeys.has(personKey(c))),
  };
}

/** The fields history cares about, from a model instance or plain object. */
export function stateOf(row) {
  if (!row) return null;
  const r = typeof row.get === 'function' ? row.get({ plain: true }) : row;
  return {
    period_id: r.period_id ?? null,
    program_id: programKey(r.program_id),
    course_code: r.course_code ? String(r.course_code).trim() : '',
    course_name: r.course_name ?? null,
    faculty_id: r.faculty_id ?? null,
    faculty_name: r.faculty_name ?? null,
    contributors: contributorsOf(r),
    status: r.status ?? null,
  };
}

const isArchived = (s) => !!s && s.status === 'Archived';

/**
 * The history action for one course going from `before` to `after` (either
 * may be null), or null when nothing a person would call a change happened.
 * Status moves that only mirror the faculty's own status (Active → On Leave)
 * are not assignment changes; Archived is (it is the manual "Remove").
 */
export function describeChange(before, after) {
  const b = before ? stateOf(before) : null;
  const a = after ? stateOf(after) : null;
  if (!b && !a) return null;
  if (!b) return 'assigned';
  if (!a) return isArchived(b) ? null : 'removed';
  if (!isArchived(b) && isArchived(a)) return 'removed';
  if (isArchived(b) && !isArchived(a)) return 'restored';
  if (codeKey(b.course_code) !== codeKey(a.course_code)) return 'course_changed';
  if (!sameLead(b, a)) return 'lead_changed';
  const { added, removed } = contributorChanges(b, a);
  if (added.length || removed.length) return 'contributors_changed';
  return null;
}

/**
 * Pair two whole lists by course and report what really changed:
 * [{ key, before, after, action }]. Used around an upload (destroy + re-create)
 * and an undo (snapshot restore). Re-uploading the same file yields [].
 */
export function diffLists(beforeRows, afterRows) {
  const index = (rows) => {
    const m = new Map();
    for (const row of rows || []) {
      const s = stateOf(row);
      if (!s || !s.course_code) continue;
      const key = courseKey(s);
      // Two rows for one course (shouldn't happen): a live one beats an archived one.
      if (!m.has(key) || (isArchived(m.get(key)) && !isArchived(s))) m.set(key, s);
    }
    return m;
  };
  const b = index(beforeRows);
  const a = index(afterRows);
  const out = [];
  for (const key of new Set([...b.keys(), ...a.keys()])) {
    const before = b.get(key) || null;
    const after = a.get(key) || null;
    const action = describeChange(before, after);
    if (action) out.push({ key, before, after, action });
  }
  return out.sort((x, y) => x.key.localeCompare(y.key));
}
