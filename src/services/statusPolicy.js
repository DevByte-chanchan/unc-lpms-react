/**
 * Per-entity status policy.
 *
 * Each entity supports a set of status values. A subset of those —
 * the entity's ARCHIVE_STATUSES — cause a row to move OUT of its main
 * table and into the global Archive view (see FloatingArchiveButton).
 *
 *   Department          → Active | Unlisted, Archived               (archive: Unlisted, Archived)
 *   Faculty             → Active, On Leave | Emeritus, Inactive      (archive: Emeritus, Inactive)
 *   Program             → Active | Unlisted                         (archive: Unlisted)
 *   Course Offering     → Active | Unlisted, Cancelled               (archive: Unlisted, Cancelled)
 *   Industry Consultant → Active, Available | Unavailable, Offboarded (archive: Unavailable, Offboarded)
 *
 * Course Assignment has its own status set; 'Archived' routes to the Archive:
 *   Course Assignment   → Verified | Pending Match | Flagged | Archived
 *
 * Helpers:
 *   statusPillStyle(entity, status)  → inline style for the table pill.
 *   isArchived(entity, status)       → true if the row belongs in the Archive.
 *   partitionByArchive(rows, entity) → { main, archived } split of a row list.
 *   isArchivedStatus / sortByStatusArchivedLast → legacy, superseded by the above.
 */

export const STATUS_OPTIONS = {
  department:   ['Active', 'Unlisted', 'Archived'],
  faculty:      ['Active', 'On Leave', 'Emeritus', 'Inactive'],
  courseoffer:  ['Active', 'Unlisted', 'Cancelled'],
  consultant:   ['Active', 'Unavailable'],
  program:      ['Active', 'Unlisted'],
  courseassign: ['Verified', 'Pending Match', 'Flagged', 'Archived'],
  academicterm: ['Active', 'Closed'],
};

/**
 * The single status applied when a user picks "Archive" from a row's "⋯"
 * actions menu — the canonical "remove this row to the Archive" status for
 * each entity. (A row can hold any of its ARCHIVE_STATUSES, but the
 * one-click Archive action always uses this one.)
 */
export const DEFAULT_ARCHIVE_STATUS = {
  department:   'Archived',
  faculty:      'Inactive',
  courseoffer:  'Unlisted',
  consultant:   'Unavailable',
  program:      'Unlisted',
  courseassign: 'Archived',
};

export function defaultArchiveStatus(entity) {
  return DEFAULT_ARCHIVE_STATUS[entity] || 'Archived';
}

/**
 * Statuses that move a row out of its main table and into the Archive.
 */
export const ARCHIVE_STATUSES = {
  department:   new Set(['Unlisted', 'Archived']),
  faculty:      new Set(['Emeritus', 'Inactive']),
  courseoffer:  new Set(['Unlisted', 'Cancelled']),
  consultant:   new Set(['Unavailable', 'Offboarded']),
  program:      new Set(['Unlisted']),
  courseassign: new Set(['Archived']),
  academicterm: new Set(['Closed']),
};

// Statuses rendered with a red pill (a visual warning).
const RED_STATUS = {
  department:   new Set(['Archived']),
  faculty:      new Set(['Inactive']),
  courseoffer:  new Set(['Cancelled']),
  consultant:   new Set(['Offboarded']),
  program:      new Set(),
  courseassign: new Set(['Flagged', 'Archived']),
  academicterm: new Set(),
};

// Statuses rendered with an amber pill (a neutral / non-active state).
const NEUTRAL_STATUS = {
  department:   new Set(['Unlisted']),
  faculty:      new Set(['On Leave', 'Emeritus']),
  courseoffer:  new Set(['Unlisted']),
  consultant:   new Set(['Available', 'Unavailable']),
  program:      new Set(['Unlisted']),
  courseassign: new Set(['Pending Match']),
  academicterm: new Set(['Closed']),
};

/**
 * The list of statuses that send a row to the Archive, for an entity —
 * used to build the per-row "⋯" menu (each option archives the row by
 * setting that status).
 */
export function archiveStatusList(entity) {
  const set = ARCHIVE_STATUSES[entity];
  return set ? Array.from(set) : [];
}

/**
 * True if a row with this status belongs in the global Archive view.
 */
export function isArchived(entity, status) {
  const set = ARCHIVE_STATUSES[entity];
  return !!(set && status && set.has(status));
}

/**
 * Split a list of rows into the ones that stay in the main table and
 * the ones that have moved to the Archive.
 */
export function partitionByArchive(rows, entity) {
  const main = [];
  const archived = [];
  if (Array.isArray(rows)) {
    for (const r of rows) {
      if (isArchived(entity, r && r.status)) archived.push(r);
      else main.push(r);
    }
  }
  return { main, archived };
}

export function statusPillStyle(entity, status) {
  const s = String(status || 'Active');
  if (RED_STATUS[entity] && RED_STATUS[entity].has(s)) {
    return { background: '#FEE2E2', color: '#B91C1C' };
  }
  if (NEUTRAL_STATUS[entity] && NEUTRAL_STATUS[entity].has(s)) {
    return { background: '#FEF3C7', color: '#92400E' };
  }
  // Active / Verified / anything else = green
  return { background: '#D1FAE5', color: '#047857' };
}

/* ---- legacy helpers — kept for back-compat, superseded by isArchived ---- */

const LEGACY_RED_STATUS = {
  department:  'Archived',
  faculty:     'Inactive',
  courseoffer: 'Cancelled',
  consultant:  'Offboarded',
};

export function isArchivedStatus(entity, status) {
  return !!(status && LEGACY_RED_STATUS[entity] === status);
}

/**
 * Stable sort that keeps `rows` in their incoming relative order but
 * moves rows with a red/archived status to the bottom.
 */
export function sortByStatusArchivedLast(rows, entity) {
  if (!Array.isArray(rows)) return rows;
  const reds   = [];
  const others = [];
  for (const r of rows) {
    if (isArchivedStatus(entity, r && r.status)) reds.push(r);
    else others.push(r);
  }
  return [...others, ...reds];
}
