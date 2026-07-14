/**
 * One-time migration: make program_course_offerings a true associative entity.
 *
 * THE MODEL (corrected)
 * A Course and a Program are many-to-many: one course (e.g. GE 101) is offered
 * by several programs, across different departments. program_course_offerings
 * RESOLVES that M:N — one row per (course, program). Each offering owns one
 * syllabus, and has exactly one course assignment (1:1).
 *
 * WHAT WAS WRONG
 *   1. UNIQUE(course_id, revision_number) physically forbade the model — BSIT
 *      and BSCS both offering GE 101 at revision 1 collide on that key.
 *   2. courses.program_id pinned each course to ONE program, contradicting M:N.
 *   3. program_id / dept_id held values (1, 2, 3) that match no real row, so
 *      they could never be real foreign keys.
 *   4. Duplicate (course, program) offering rows had accumulated from repeated
 *      seeding/cloning.
 *
 * WHAT THIS DOES
 *   - Rebuilds offerings as exactly one row per (course, program), sourced from
 *     courses.program_id (the only genuine course→program data that exists),
 *     carrying each course's existing description forward.
 *   - Re-links course_offering_assignments to their offering (+ records the program).
 *   - Drops the old unique index, courses.program_id, and offerings.dept_id
 *     (the department is derivable through the program, so a stored copy could
 *     only ever drift out of sync).
 *
 * MUST RUN BEFORE sequelize.sync(). sync() would drop courses.program_id — the
 * very column this migration reads — and would fail to add UNIQUE(course_id,
 * program_id) while duplicate rows still exist.
 *
 * Idempotent: guarded on the existence of courses.program_id, so it no-ops on
 * every boot after the first.
 */
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';

const hasColumn = async (table, column) => {
  const rows = await sequelize.query(
    'SHOW COLUMNS FROM `' + table + '` LIKE :col',
    { replacements: { col: column }, type: QueryTypes.SELECT },
  );
  return rows.length > 0;
};

const hasIndex = async (table, index) => {
  const rows = await sequelize.query(
    'SHOW INDEX FROM `' + table + '` WHERE Key_name = :idx',
    { replacements: { idx: index }, type: QueryTypes.SELECT },
  );
  return rows.length > 0;
};

export async function rebuildOfferings() {
  try {
    // Already migrated — courses.program_id is gone.
    if (!(await hasColumn('courses', 'program_id'))) return;

    console.log('[offerings] migrating program_course_offerings → (course × program) associative entity…');

    // 1. Keep the descriptions we already have, keyed by course. They're the
    //    only content in the table worth preserving; everything else is junk.
    const existing = await sequelize.query(
      `SELECT course_id, course_description
         FROM program_course_offerings
        WHERE course_description IS NOT NULL AND course_description <> ''`,
      { type: QueryTypes.SELECT },
    );
    const descByCourse = new Map(existing.map((r) => [r.course_id, r.course_description]));

    // 2. Wipe. Assignments' program_course_offering_id FK is ON DELETE SET NULL, so they
    //    survive this and get re-linked in step 4.
    await sequelize.query('DELETE FROM program_course_offerings');

    // 3. Rebuild: one offering per (course, program). The JOIN to programs is
    //    the filter that drops courses whose program_id pointed at nothing —
    //    they simply get no offering, and read as "not offered by any program".
    const pairs = await sequelize.query(
      `SELECT c.course_id, c.program_id
         FROM courses c
         JOIN programs p ON p.program_id = c.program_id`,
      { type: QueryTypes.SELECT },
    );

    for (const { course_id, program_id } of pairs) {
      await sequelize.query(
        `INSERT INTO program_course_offerings
           (course_id, program_id, revision_number, course_description, created_at, updated_at)
         VALUES (:course_id, :program_id, 1, :descr, NOW(), NOW())`,
        { replacements: { course_id, program_id, descr: descByCourse.get(course_id) || null } },
      );
    }
    console.log('[offerings] rebuilt ' + pairs.length + ' offering(s), one per (course, program).');

    // 4. Re-link assignments to their offering, and record the program the
    //    assignment belongs to (an unmatched row keeps NULL on both).
    //
    //    The columns have to be created HERE, not left to sync(): this
    //    migration runs before sync (it must, to read courses.program_id), so
    //    at this moment they may not exist yet. sync() later sees them already
    //    present and simply agrees.
    if (!(await hasColumn('course_offering_assignments', 'program_course_offering_id'))) {
      await sequelize.query('ALTER TABLE course_offering_assignments ADD COLUMN program_course_offering_id INT UNSIGNED NULL');
    }
    if (!(await hasColumn('course_offering_assignments', 'program_id'))) {
      await sequelize.query('ALTER TABLE course_offering_assignments ADD COLUMN program_id INT UNSIGNED NULL');
    }

    const [, linked] = await sequelize.query(
      `UPDATE course_offering_assignments ca
         JOIN program_course_offerings o ON o.course_id = ca.course_id
          SET ca.program_course_offering_id = o.program_course_offering_id,
              ca.program_id     = o.program_id
        WHERE ca.course_id IS NOT NULL`,
    );
    console.log('[offerings] linked ' + (Number(linked) || 0) + ' assignment(s) to their offering.');

    // 5. Retire the columns the model no longer has. Done explicitly rather
    //    than left to sync(), so the order (and the data loss) is deliberate.
    if (await hasColumn('program_course_offerings', 'dept_id')) {
      await sequelize.query('ALTER TABLE program_course_offerings DROP COLUMN dept_id');
      console.log('[offerings] dropped dept_id — derivable through the program.');
    }
    await sequelize.query('ALTER TABLE courses DROP COLUMN program_id');
    console.log('[offerings] dropped courses.program_id — a course belongs to many programs now, via offerings.');

    console.log('[offerings] rebuild complete.');
  } catch (err) {
    // Loud, but never fatal: a half-applied migration is recoverable, a server
    // that won't boot is not. The guard above makes a retry safe.
    console.error('[offerings] rebuild FAILED: ' + (err && err.message));
    console.error(err && err.stack);
  }
}

/**
 * Repairs that must hold on EVERY boot, whatever state the rebuild left behind.
 *
 * Kept separate from rebuildOfferings() on purpose. That function is guarded on
 * courses.program_id — and the guard has already burned us once: a rebuild that
 * threw halfway still let sync() drop that column, so the next boot concluded
 * "already migrated" and silently skipped the rest. Anything that must be true
 * of the finished schema belongs here, where no guard can skip it.
 */
/**
 * An assignment must reference a course from ITS OWN period. Rows that don't are
 * repaired here, and this has to run before anything links offerings.
 *
 * HOW THEY GOT THAT WAY
 * listCourseOfferingAssignments re-resolves every row it returns against the
 * requested period's catalog and persists the result. Its period filter goes
 * through safeWhere, which DROPS a filter whose column it cannot find — and for
 * a while it looked the column up by attribute name (`period_id`) instead of
 * through the model's `field:` mapping (`academic_period_id`). So the filter
 * silently vanished, the query returned assignments from EVERY period, and each
 * one was rewritten against whichever period happened to be selected. A period-3
 * assignment came away holding a period-5 course_id.
 *
 * WHY IT SURFACES AS A UNIQUE VIOLATION
 * course_offering_assignments.program_course_offering_id is UNIQUE (one
 * assignment per offering), and that index is global. The upload only deletes
 * the period it is importing, so a stranded period-3 row sitting on a period-5
 * offering is invisible to the delete and collides with the insert:
 *
 *     Duplicate value for ca_offering_unique ("117")
 *
 * The boot backfill below hit the same wall and logged "constraint repair
 * failed: Validation error" (Sequelize's name for a duplicate key), so the
 * database has been quietly stuck in this state.
 *
 * THE REPAIR
 * Re-point each stranded row at the course with the SAME code in its OWN period,
 * and drop its offering link so the backfill re-derives it in-period. Where that
 * period has no such course, course_id lands NULL and the row shows as
 * Unassigned — the honest state, and one the user can reconcile.
 */
export async function repairCrossPeriodAssignments() {
  try {
    if (!(await hasColumn('course_offering_assignments', 'academic_period_id'))) return;

    const [stranded] = await sequelize.query(
      `SELECT COUNT(*) AS n
         FROM course_offering_assignments ca
         JOIN courses c ON c.course_id = ca.course_id
        WHERE ca.academic_period_id IS NOT NULL
          AND c.academic_period_id <> ca.academic_period_id`,
      { type: QueryTypes.SELECT },
    );
    if (!Number(stranded.n)) return;

    // LEFT JOIN, not JOIN: a row whose own period has no such course still has to
    // be cut loose from the other period's course. Inner-joining would leave
    // exactly those rows corrupt — and they are the ones that block the import.
    await sequelize.query(
      `UPDATE course_offering_assignments ca
         JOIN courses bad
           ON bad.course_id = ca.course_id
          AND bad.academic_period_id <> ca.academic_period_id
         LEFT JOIN courses good
           ON good.course_no = ca.course_code
          AND good.academic_period_id = ca.academic_period_id
          SET ca.course_id = good.course_id,
              ca.program_course_offering_id = NULL
        WHERE ca.academic_period_id IS NOT NULL`,
    );

    console.log('[offerings] repaired ' + stranded.n
      + ' assignment(s) that referenced another period\'s course.');
  } catch (err) {
    console.error('[offerings] cross-period repair failed: ' + (err && err.message));
  }
}

export async function ensureOfferingConstraints() {
  try {
    // 1. The legacy UNIQUE(course_id, revision_number) is the single thing that
    //    makes the model impossible: BSIT and BSCS both offering GE 101 at
    //    revision 1 collide on it. sync() never drops an index it didn't ask
    //    for, so it has to go explicitly.
    const legacy = 'program_course_offerings_course_id_revision_number';
    if (await hasIndex('program_course_offerings', legacy)) {
      await sequelize.query('DROP INDEX `' + legacy + '` ON program_course_offerings');
      console.log('[offerings] dropped legacy UNIQUE(course_id, revision_number) — it forbade one course in two programs.');
    }

    // 2. Link any assignment that has a course but no offering. Idempotent —
    //    the WHERE clause makes a settled database a no-op.
    if (await hasColumn('course_offering_assignments', 'program_course_offering_id')
        && await hasColumn('course_offering_assignments', 'program_id')) {
      // Count first: MySQL's UPDATE result shape through Sequelize is not a
      // reliable row count (it has already reported NaN here once, hiding a
      // successful backfill behind a silent log).
      const [before] = await sequelize.query(
        `SELECT COUNT(*) AS n FROM course_offering_assignments
          WHERE course_id IS NOT NULL AND program_course_offering_id IS NULL`,
        { type: QueryTypes.SELECT },
      );

      await sequelize.query(
        // If the row already knows its program, only that program's offering
        // will do — a course offered by several programs has several offerings,
        // and picking the wrong one would hand the assignment to another
        // program's syllabus. Rows with no program yet take the course's sole
        // offering, which is unambiguous precisely because there is only one.
        //
        // The offering must also sit in the assignment's OWN period. Matching on
        // course_id alone was enough to link a stranded row to another period's
        // offering, and since program_course_offering_id is globally UNIQUE, that
        // link then blocked the rightful period's import forever. Belt and braces
        // with repairCrossPeriodAssignments(): that one fixes the rows that are
        // already wrong, this one refuses to make new ones.
        `UPDATE course_offering_assignments ca
           JOIN program_course_offerings o
             ON o.course_id = ca.course_id
            AND (ca.program_id IS NULL OR o.program_id = ca.program_id)
           JOIN courses oc
             ON oc.course_id = o.course_id
            AND (ca.academic_period_id IS NULL OR oc.academic_period_id = ca.academic_period_id)
            SET ca.program_course_offering_id = o.program_course_offering_id,
                ca.program_id     = COALESCE(ca.program_id, o.program_id)
          WHERE ca.course_id IS NOT NULL
            AND ca.program_course_offering_id IS NULL`,
      );

      const [after] = await sequelize.query(
        `SELECT COUNT(*) AS n FROM course_offering_assignments
          WHERE course_id IS NOT NULL AND program_course_offering_id IS NULL`,
        { type: QueryTypes.SELECT },
      );

      const linked = Number(before.n) - Number(after.n);
      if (linked > 0) console.log('[offerings] linked ' + linked + ' assignment(s) to their offering.');
      if (Number(after.n) > 0) {
        // Not an error: the course exists but no program offers it, so there is
        // no offering to fill. It stays visible for reconciliation.
        console.log('[offerings] ' + after.n + ' assignment(s) reference a course that no program offers yet.');
      }
    }
  } catch (err) {
    console.error('[offerings] constraint repair failed: ' + (err && err.message));
  }
}
