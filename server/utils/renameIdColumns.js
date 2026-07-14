/**
 * One-time migration: make every key column name its entity.
 *
 * THE RULE
 *   A primary key is named <entity>_id, and every foreign key pointing at it
 *   carries THE SAME name. A join then reads:
 *       ON d.department_id = f.department_id
 *   instead of the older, lopsided `ON d.id = f.department_id`.
 *
 * THE THREE EXCEPTIONS (deliberate, and standard practice)
 *   A table that references the same entity twice, or in a named role, cannot
 *   reuse the name — two columns cannot share one name, and "faculty_id" would
 *   not say WHICH faculty. These keep their role names:
 *       programs.program_head_id            -> faculty          (the head)
 *       prerequisites.course_prerequisite_id -> courses         (the prereq course)
 *       industry_consultants.assigned_course_id -> courses      (the assigned course)
 *
 * NAMING LIVES IN THE DATABASE, NOT IN THE CODE
 *   The models map these columns back to their existing JS attribute names with
 *   Sequelize's `field:` option (id, period_id, pc_offering_id). So the schema —
 *   the thing the ERD documents — gets the accurate names, while application code
 *   and the API keep the names they already use. Renaming ~40 files and the whole
 *   frontend would buy nothing and risk plenty.
 *
 * MUST RUN BEFORE sequelize.sync(). sync() addresses columns by their mapped
 * field name; if the rename hasn't happened yet it would ADD the new column
 * alongside the old one and strand every value.
 *
 * Idempotent: each rename is skipped once its target column exists.
 */
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';

// [table, oldColumn, newColumn]
const RENAMES = [
  // --- Primary keys → <entity>_id -----------------------------------------
  ['academic_periods',            'id',             'academic_period_id'],
  ['departments',                 'id',             'department_id'],
  ['programs',                    'id',             'program_id'],
  ['faculty',                     'id',             'faculty_id'],
  ['industry_consultants',        'id',             'industry_consultant_id'],
  ['consultant_courses',          'id',             'consultant_course_id'],
  ['course_offering_assignments', 'id',             'course_offering_assignment_id'],
  ['program_course_offerings',    'pc_offering_id', 'program_course_offering_id'],
  ['syllabus_submissions',        'id',             'syllabus_submission_id'],
  ['tos_submissions',             'id',             'tos_submission_id'],
  ['users',                       'id',             'user_id'],
  ['import_batches',              'id',             'import_batch_id'],
  // courses.course_id and prerequisites.prerequisite_id already follow the rule.

  // --- Foreign keys → same name as the PK they point at --------------------
  ['departments',                 'period_id',      'academic_period_id'],
  ['programs',                    'period_id',      'academic_period_id'],
  ['faculty',                     'period_id',      'academic_period_id'],
  ['courses',                     'period_id',      'academic_period_id'],
  ['industry_consultants',        'period_id',      'academic_period_id'],
  ['course_offering_assignments', 'period_id',      'academic_period_id'],
  ['syllabus_submissions',        'period_id',      'academic_period_id'],
  ['tos_submissions',             'period_id',      'academic_period_id'],
  ['import_batches',              'period_id',      'academic_period_id'],
  ['consultant_courses',          'consultant_id',  'industry_consultant_id'],
  ['course_offering_assignments', 'pc_offering_id', 'program_course_offering_id'],
  // department_id / faculty_id / program_id / course_id already match their PK.
];

const hasColumn = async (table, column) => {
  const rows = await sequelize.query(
    `SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = :t AND column_name = :c`,
    { replacements: { t: table, c: column }, type: QueryTypes.SELECT },
  );
  return rows.length > 0;
};

const tableExists = async (table) => {
  const rows = await sequelize.query(
    `SELECT 1 FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = :t`,
    { replacements: { t: table }, type: QueryTypes.SELECT },
  );
  return rows.length > 0;
};

export async function renameIdColumns() {
  try {
    let renamed = 0;

    for (const [table, oldCol, newCol] of RENAMES) {
      if (!(await tableExists(table))) continue;           // fresh DB
      if (await hasColumn(table, newCol)) continue;        // already renamed
      if (!(await hasColumn(table, oldCol))) continue;     // nothing to rename

      // MySQL 8's RENAME COLUMN rewrites the foreign keys that reference the
      // column as part of the same statement, so the constraints survive the
      // rename intact. (An ALTER … CHANGE would not: it drops and recreates,
      // which is why we use RENAME COLUMN explicitly.)
      await sequelize.query(
        'ALTER TABLE `' + table + '` RENAME COLUMN `' + oldCol + '` TO `' + newCol + '`',
      );
      console.log('[ids] ' + table + '.' + oldCol + ' → ' + newCol);
      renamed += 1;
    }

    if (renamed > 0) {
      console.log('[ids] renamed ' + renamed + ' key column(s) — PK and FK now share one name per entity.');
    }
  } catch (err) {
    console.error('[ids] rename FAILED: ' + (err && err.message));
    console.error(err && err.stack);
  }
}
