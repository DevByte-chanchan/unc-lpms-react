/**
 * Teaching load helpers for the Course Assignment page (see
 * components/TeachingLoadDialog.jsx and GET /course-offering-assignments/load).
 */
import { displayName } from './nameCase.js';

// Same person whatever the case, punctuation or word order ("LIM HAROLD T." = "Harold T. Lim").
export const personKey = (name) => String(name || '').toLowerCase().replace(/[^\p{L}\s]/gu, ' ').split(/\s+/).filter((w) => w.length > 1).sort().join(' ');

/** The load entry for a name, or null. */
export function loadEntryFor(load, name) {
  if (!load || !name) return null;
  const key = personKey(name);
  if (!key) return null;
  return (load.faculty || []).find((f) => (f.names || [f.name]).some((n) => personKey(n) === key)) || null;
}

/**
 * The Lead Faculty warning for the Add / Edit form, or null: picking `name` as
 * Lead of `courseCode` would take them over the limit. `editingId` is the row
 * being edited (its units are already in their total when they lead it now).
 */
export function leadLoadWarning(load, { name, courseCode, editingId = null }) {
  if (!load || !name || !courseCode) return null;
  const units = load.course_units ? load.course_units[String(courseCode).trim().toUpperCase()] : undefined;
  if (units == null) return null;
  const entry = loadEntryFor(load, name);
  let base = entry ? entry.units : 0;
  if (entry && editingId != null) {
    const same = (entry.courses || []).find((c) => c.role === 'Lead' && c.assignment_id === editingId);
    if (same && same.units != null) base -= same.units;
  }
  const total = base + units;
  if (total <= load.max_units) return null;
  return displayName(name) + ' would have ' + total + ' units (limit ' + load.max_units + ')';
}

