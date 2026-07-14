/**
 * Boot-time migration: dissolve the `course_offerings` table.
 *
 * `course_offerings` and `courses` had grown into two tables doing one job.
 * `courses` is itself period-scoped and cloned forward each term, so the
 * catalog row IS the per-term offering — which is why every page had already
 * drifted onto `/courses` and left `course_offerings` write-only.
 *
 * What was left pointing at it, and where it goes now:
 *
 *   consultant_courses.course_offering_id  → renamed course_id, FK → courses
 *   industry_consultants.assigned_course_id→ repointed,         FK → courses
 *   course_offering_assignments.course_offering_id  → renamed course_id, FK → courses
 *                                            (it already HELD a courses.course_id;
 *                                             the name was the only lie)
 *
 * The two consultant columns held `course_offerings.id` values, which are a
 * different id space from `courses.course_id`. They are re-resolved here from
 * the raw course code that every one of those rows also carries — the same
 * code→catalog lookup the controllers do — and set to NULL when the code has no
 * match, exactly as an unmatched upload row behaves.
 *
 * Runs BEFORE sync({ alter: true }) so that sync can then create the new
 * foreign keys against rows that actually exist. Idempotent: once
 * `course_offerings` is gone, every step short-circuits.
 */
import { sequelize } from '../config/sequelize.js';

async function tableExists(table) {
  const [rows] = await sequelize.query(
    'SELECT COUNT(*) AS n FROM information_schema.TABLES ' +
    'WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    { replacements: [table] }
  );
  return Number(rows[0] && rows[0].n) > 0;
}

async function columnExists(table, column) {
  const [rows] = await sequelize.query(
    'SELECT COUNT(*) AS n FROM information_schema.COLUMNS ' +
    'WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    { replacements: [table, column] }
  );
  return Number(rows[0] && rows[0].n) > 0;
}

/** Drop every FK in the schema that references `target`, whatever it's named. */
async function dropForeignKeysReferencing(target) {
  const [rows] = await sequelize.query(
    'SELECT TABLE_NAME AS tbl, CONSTRAINT_NAME AS name ' +
    'FROM information_schema.KEY_COLUMN_USAGE ' +
    'WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME = ?',
    { replacements: [target] }
  );
  for (const r of rows) {
    try {
      await sequelize.query('ALTER TABLE `' + r.tbl + '` DROP FOREIGN KEY `' + r.name + '`');
      console.log('[dissolve] dropped FK ' + r.tbl + '.' + r.name + ' → ' + target);
    } catch (err) {
      console.warn('[dissolve] could not drop ' + r.tbl + '.' + r.name + ': ' + (err && err.message));
    }
  }
}

/** Rename a column, but only when the old name is still there and the new one isn't. */
async function renameColumn(table, from, to) {
  if (!(await columnExists(table, from))) return;
  if (await columnExists(table, to)) return;
  await sequelize.query(
    'ALTER TABLE `' + table + '` CHANGE `' + from + '` `' + to + '` INT UNSIGNED NULL'
  );
  console.log('[dissolve] renamed ' + table + '.' + from + ' → ' + to);
}

export async function dissolveCourseOfferings() {
  try {
    if (!(await tableExists('course_offerings'))) return;   // already migrated
    console.log('[dissolve] course_offerings found — migrating onto the catalog…');

    // 1. Nothing may reference the table while we retire it. This also clears
    //    the FKs on the two columns we are about to rename.
    await dropForeignKeysReferencing('course_offerings');

    // 2. Rename the columns whose names still say "offering".
    await renameColumn('consultant_courses', 'course_offering_id', 'course_id');
    await renameColumn('course_offering_assignments', 'course_offering_id', 'course_id');

    // 3. Re-resolve the consultant links from their raw course code, scoped to
    //    the consultant's own period. Unmatched → NULL (the code survives in
    //    course_code, so nothing is lost and the page can re-assign).
    if (await columnExists('consultant_courses', 'course_id')) {
      const [, meta] = await sequelize.query(
        'UPDATE consultant_courses cc ' +
        'JOIN industry_consultants ic ON ic.industry_consultant_id = cc.industry_consultant_id ' +
        'LEFT JOIN courses c ON LOWER(TRIM(c.course_no)) = LOWER(TRIM(cc.course_code)) ' +
        '                   AND c.academic_period_id = ic.academic_period_id ' +
        'SET cc.course_id = c.course_id'
      );
      console.log('[dissolve] re-resolved consultant_courses.course_id (' + (meta && meta.affectedRows) + ' row(s))');
    }

    // 4. Same for the legacy single-course column on the consultant itself.
    await sequelize.query(
      'UPDATE industry_consultants ic ' +
      'LEFT JOIN courses c ON LOWER(TRIM(c.course_no)) = LOWER(TRIM(ic.assigned_course_code)) ' +
      '                   AND c.academic_period_id = ic.academic_period_id ' +
      'SET ic.assigned_course_id = c.course_id'
    );

    // 5. course_offering_assignments.course_id already held catalog ids — only orphans
    //    (courses deleted by a later upload) would break the incoming FK.
    if (await columnExists('course_offering_assignments', 'course_id')) {
      await sequelize.query(
        'UPDATE course_offering_assignments ca ' +
        'LEFT JOIN courses c ON c.course_id = ca.course_id ' +
        'SET ca.course_id = NULL ' +
        'WHERE ca.course_id IS NOT NULL AND c.course_id IS NULL'
      );
    }

    // 6. Retire the table.
    await sequelize.query('DROP TABLE IF EXISTS `course_offerings`');
    console.log('[dissolve] course_offerings dropped — the catalog (courses) is now the single source.');
  } catch (err) {
    console.error('[dissolve] FAILED: ' + (err && err.message));
    throw err;   // a half-migrated schema must not boot
  }
}
