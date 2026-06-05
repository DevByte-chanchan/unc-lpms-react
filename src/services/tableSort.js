/**
 * Shared column-sort utilities for the management list tables.
 *
 * A column is described by:
 *   { key, label, width, type, sortValue?, thStyle? }
 * where `type` is 'text' | 'date' | 'number' and `sortValue(row)` optionally
 * maps a row to a comparable primitive (used for Status order, the Programs
 * faculty-match grouping, the consultant course list, etc.).
 *
 * Status columns sort by a DEFINED order (attention-first) rather than
 * alphabetically — build a numeric `sortValue` from `statusRank()`.
 */

// Attention-first display order per entity: index 0 sorts first when
// ascending, so statuses that need action (Pending Match, Unlisted, …) lead
// and settled ones (Active / Verified) trail.
export const STATUS_SORT_ORDER = {
  department:   ['Unlisted', 'Archived', 'Active'],
  faculty:      ['Inactive', 'Emeritus', 'On Leave', 'Active'],
  program:      ['Unlisted', 'Active'],
  consultant:   ['Offboarded', 'Unavailable', 'Available', 'Active'],
  courseassign: ['Pending Match', 'Flagged', 'Verified', 'Archived'],
};

// Rank of a status within its entity's order; unknown/blank statuses sort
// last (ascending).
export const statusRank = (entity, status) => {
  const order = STATUS_SORT_ORDER[entity] || [];
  const i = order.indexOf(status);
  return i === -1 ? order.length : i;
};

// ms since epoch, or +Infinity for missing/invalid so empty dates sort last
// when ascending.
const timeOf = (v) => {
  if (!v) return Number.POSITIVE_INFINITY;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
};

const valueOf = (col, row) =>
  (typeof col.sortValue === 'function' ? col.sortValue(row) : row[col.key]);

const compareTyped = (a, b, type) => {
  if (type === 'date')   return timeOf(a) - timeOf(b);
  if (type === 'number') return (Number(a) || 0) - (Number(b) || 0);
  return String(a == null ? '' : a).toLowerCase()
    .localeCompare(String(b == null ? '' : b).toLowerCase());
};

/**
 * Return a new, sorted copy of `rows` by the column whose key === sortKey
 * (falling back to the first column), in `sortDir` ('asc' | 'desc'). The
 * sort is stable: equal rows keep their incoming order.
 */
export function sortRows(rows, columns, sortKey, sortDir) {
  if (!Array.isArray(rows)) return [];
  const col = columns.find((c) => c.key === sortKey) || columns[0];
  if (!col) return rows.slice();
  const dir = sortDir === 'desc' ? -1 : 1;
  return rows
    .map((r, i) => [r, i])
    .sort((x, y) => {
      const c = compareTyped(valueOf(col, x[0]), valueOf(col, y[0]), col.type || 'text');
      return c !== 0 ? c * dir : x[1] - y[1];
    })
    .map((pair) => pair[0]);
}

/**
 * Toggle helper for the (sortKey, sortDir) pair: clicking the active column
 * flips direction; clicking a new column selects it ascending.
 */
export function nextSort(current, key) {
  if (current.sortKey === key) {
    return { sortKey: key, sortDir: current.sortDir === 'asc' ? 'desc' : 'asc' };
  }
  return { sortKey: key, sortDir: 'asc' };
}
