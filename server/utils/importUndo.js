/**
 * Undo support for the bulk-upload endpoints.
 *
 * WHY A SNAPSHOT AND NOT A DELETE
 * The upload controllers merge: a row whose key matches an existing record is
 * UPDATED, everything else is INSERTED. So "undo" cannot mean "delete the rows
 * the upload created" — that would leave every overwritten row overwritten.
 * Instead we photograph the affected tables before the upload runs and restore
 * that photograph on undo. The period ends up byte-for-byte as it was.
 *
 * The consequence, which the UI states plainly: any manual edit made AFTER the
 * upload is inside the restored window and is discarded too. That is what makes
 * undo predictable — it is a point-in-time restore, not a selective merge.
 *
 * TABLE GROUPS
 * An upload rarely touches one table. Uploading the curriculum also rewrites
 * `prerequisites` and re-stamps `course_offering_assignments.year_level`; uploading
 * consultants rewrites the `consultant_courses` join. Restoring only the
 * headline table would leave orphans behind, so each entity declares every
 * table it can touch. Order matters: PARENTS FIRST. We delete in reverse
 * (children first, while their parent rows still exist for the subquery to
 * resolve against) and insert forward (parents first, so the FKs land).
 */
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';

// How long an upload stays undoable, and the SINGLE SOURCE OF TRUTH for that
// deadline. Enforced here on the server so a stale browser tab can't undo an
// import whose window has closed.
//
// The client never hardcodes this number: the undo toast counts down from the
// batch's `ms_remaining` (see importController.present), so changing the
// constant here moves the UI with it.
//
// Snapshots are NOT deleted when the window lapses — expiry is a timestamp
// comparison (msRemaining below), never a purge. That is deliberate: a 30s
// window is short enough that a cleanup job would race an undo request that is
// already in flight. An expired batch simply stops being offered and answers
// 410; its snapshot row stays put as an audit trail.
export const UNDO_WINDOW_MS = 30 * 1000;   // 30 seconds

// Raw SQL — bypasses Sequelize's attribute→column mapping, so these are the
// real column names (academic_period_id, not the `period_id` attribute).
const periodScoped = (table) => ({ table, where: 'academic_period_id = :pid' });

// Child tables carry no period column — scope them through their parent.
const childOf = (table, column, parentTable, parentKey) => ({
  table,
  where: column + ' IN (SELECT ' + parentKey + ' FROM ' + parentTable + ' WHERE academic_period_id = :pid)',
});

const GROUPS = {
  departments:          [periodScoped('departments')],
  faculty:              [periodScoped('faculty')],
  programs:             [periodScoped('programs')],
  course_offering_assignments:   [periodScoped('course_offering_assignments')],

  industry_consultants: [
    periodScoped('industry_consultants'),
    childOf('consultant_courses', 'industry_consultant_id', 'industry_consultants', 'industry_consultant_id'),
  ],

  // A curriculum upload rewrites prerequisites/revisions for the courses it
  // touches, and re-stamps year_level onto matching course_offering_assignments
  // (see courseController.js). All four move together or undo is a half-undo.
  courses: [
    periodScoped('courses'),
    childOf('prerequisites',            'course_id', 'courses', 'course_id'),
    childOf('program_course_offerings', 'course_id', 'courses', 'course_id'),
    periodScoped('course_offering_assignments'),
  ],
};

export const ENTITIES = Object.keys(GROUPS);

// The table the user actually looks at. An undo touches several (a curriculum
// import drags prerequisites and offerings with it), but "11 rows removed, 11 put
// back" only means anything about the headline one.
export const primaryTable = (entity) => (GROUPS[entity] ? GROUPS[entity][0].table : null);

export const LABELS = {
  departments:          'department list',
  faculty:              'faculty list',
  programs:             'program list',
  courses:              'curriculum',
  course_offering_assignments:   'course assignments',
  industry_consultants: 'industry consultant list',
};

export const isKnownEntity = (entity) => Object.prototype.hasOwnProperty.call(GROUPS, entity);

/** Milliseconds left before a batch stops being undoable (0 once expired). */
export const msRemaining = (batch) => {
  const age = Date.now() - new Date(batch.createdAt).getTime();
  return Math.max(0, UNDO_WINDOW_MS - age);
};

export const isExpired = (batch) => msRemaining(batch) === 0;

/**
 * DATETIME round-trip.
 *
 * The driver hands a DATETIME back as a JS Date, and JSON.stringify renders a
 * Date as ISO-8601 with a trailing Z ("2026-07-13T03:42:06.000Z") — which MySQL
 * rejects on the way back in ("Incorrect datetime value"). So we flatten Dates
 * to MySQL's own literal format at capture time.
 *
 * Local getters, not UTC ones, are the correct inverse: the driver built this
 * Date by reading the stored wall-clock time through the connection timezone,
 * so reading the same wall-clock components back out reproduces the original
 * literal exactly, whatever that timezone is.
 */
const pad = (n) => String(n).padStart(2, '0');

const toMysqlDateTime = (d) =>
  d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
  pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());

// Defensive: an ISO-Z string reaching the insert path (e.g. a snapshot taken
// before the fix above) is coerced rather than left to blow up the restore.
const ISO_Z = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(?:\.\d+)?Z$/;

const insertable = (value) => {
  if (value instanceof Date) return toMysqlDateTime(value);
  if (typeof value === 'string') {
    const m = value.match(ISO_Z);
    if (m) return toMysqlDateTime(new Date(value));
  }
  // JSON COLUMNS.
  //
  // A JSON column (course_offering_assignments.contributors) comes back from the
  // driver as a real JS array/object, and JSON.stringify preserves it as one in
  // the snapshot. bulkInsert then has no idea what to do with a raw array: it
  // emits NOTHING for the value, so the generated SQL degenerates to
  // `(142,'BIT101',,NULL,…)` and MySQL rejects the whole statement.
  //
  // The effect was that undoing a course-assignment import returned 500 and
  // restored nothing — the upload had already destroyed the period's rows, so
  // the "undo" left the user worse off than no undo at all. Serialize here, at
  // the single choke point every restored value passes through.
  //
  // null is deliberately excluded (typeof null === 'object') — it must stay NULL.
  if (value !== null && typeof value === 'object') return JSON.stringify(value);
  return value;
};

const normalizeRow = (row) => {
  const out = {};
  for (const [key, value] of Object.entries(row)) out[key] = insertable(value);
  return out;
};

/**
 * Photograph every table this entity's upload can touch, scoped to the period.
 * Returns { tableName: [row, …] } — raw rows, so restore is a faithful replay.
 */
export async function captureSnapshot(entity, periodId) {
  const specs = GROUPS[entity];
  if (!specs) throw new Error('Unknown import entity: ' + entity);

  const snapshot = {};
  for (const spec of specs) {
    const rows = await sequelize.query(
      'SELECT * FROM ' + spec.table + ' WHERE ' + spec.where,
      { replacements: { pid: periodId }, type: QueryTypes.SELECT },
    );
    snapshot[spec.table] = rows.map(normalizeRow);
  }
  return snapshot;
}

/**
 * Put the period back exactly as the snapshot found it.
 *
 * Runs in one transaction with FK checks suspended: we tear down and rebuild a
 * whole consistent island of rows, and the intermediate states (parents gone,
 * children not yet re-inserted) would trip constraints that the COMMITTED state
 * satisfies perfectly. Checks are restored on the same connection before commit,
 * and the transaction rolls back as a unit if anything throws.
 */
export async function restoreSnapshot(entity, periodId, snapshot) {
  const specs = GROUPS[entity];
  if (!specs) throw new Error('Unknown import entity: ' + entity);

  const restored = {};
  // What the undo TOOK AWAY, counted before it goes. Without this the caller can
  // only report how many rows it put back, and an undo that restores a state
  // which happens to look like the current one ("import the same file twice,
  // then undo") reports nothing at all and reads as a no-op. It isn't one — but
  // the user has no way to tell, and quite reasonably concludes undo is broken.
  const removed = {};

  await sequelize.transaction(async (tx) => {
    const opts = { transaction: tx, replacements: { pid: periodId } };
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction: tx });

    try {
      // Children first — their scope subquery still resolves while the
      // parent rows they point at are on their way out.
      for (const spec of [...specs].reverse()) {
        const [counted] = await sequelize.query(
          'SELECT COUNT(*) AS n FROM ' + spec.table + ' WHERE ' + spec.where,
          { ...opts, type: QueryTypes.SELECT },
        );
        removed[spec.table] = Number(counted && counted.n) || 0;

        await sequelize.query('DELETE FROM ' + spec.table + ' WHERE ' + spec.where, opts);
      }

      // Parents first, so every FK the children carry has a target.
      for (const spec of specs) {
        const rows = (snapshot[spec.table] || []).map(normalizeRow);
        if (rows.length > 0) {
          await sequelize.getQueryInterface().bulkInsert(spec.table, rows, { transaction: tx });
        }
        restored[spec.table] = rows.length;
      }
    } finally {
      // Same connection as the statements above, and inside the transaction —
      // so the session never escapes this block with checks left off, even
      // on the failure path.
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction: tx });
    }
  });

  return { restored, removed };
}
