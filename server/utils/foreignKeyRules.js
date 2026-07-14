/**
 * Boot-time foreign-key delete-rule reconciliation.
 *
 * `sequelize.sync({ alter: true })` will CREATE a missing foreign key, but it
 * will not rewrite the delete rule of one that already exists. So a FK created
 * with the wrong ON DELETE stays wrong forever, no matter what the model says.
 *
 * That is not hypothetical here. `consultant_courses.course_id` briefly synced
 * as ON DELETE CASCADE (belongsToMany stamps a single onDelete on BOTH columns
 * of the join table). Under CASCADE, re-uploading a curriculum — which replaces
 * the period's `courses` rows — deletes the consultant's link row outright,
 * taking `course_code` with it, so the assignment can never re-resolve. It has
 * to be SET NULL.
 *
 * This drops any FK whose delete rule doesn't match the intended one; the
 * sync() that follows recreates it from the model, which now carries the rule
 * on the column itself (see models/consultantCourse.js).
 *
 * Runs BEFORE sync. Idempotent: once each rule matches, every step is a no-op.
 */
import { sequelize } from '../config/sequelize.js';

/**
 * The delete rule each FK column is REQUIRED to have. Keep this in step with
 * the `onDelete` declared on the model attribute — this file only repairs
 * databases that already have the wrong one baked in.
 */
const EXPECTED = [
  { table: 'consultant_courses', column: 'course_id',     rule: 'SET NULL' },
  { table: 'consultant_courses', column: 'industry_consultant_id', rule: 'CASCADE'  },
];

/** The FK constraint on `table`.`column`, plus its current delete rule. */
async function findForeignKey(table, column) {
  const [rows] = await sequelize.query(
    'SELECT k.CONSTRAINT_NAME AS name, r.DELETE_RULE AS rule ' +
    'FROM information_schema.KEY_COLUMN_USAGE k ' +
    'JOIN information_schema.REFERENTIAL_CONSTRAINTS r ' +
    '  ON r.CONSTRAINT_SCHEMA = k.TABLE_SCHEMA ' +
    ' AND r.CONSTRAINT_NAME   = k.CONSTRAINT_NAME ' +
    ' AND r.TABLE_NAME        = k.TABLE_NAME ' +
    'WHERE k.TABLE_SCHEMA = DATABASE() ' +
    '  AND k.TABLE_NAME   = ? ' +
    '  AND k.COLUMN_NAME  = ? ' +
    '  AND k.REFERENCED_TABLE_NAME IS NOT NULL',
    { replacements: [table, column] }
  );
  return rows[0] || null;
}

export async function enforceForeignKeyDeleteRules() {
  for (const { table, column, rule } of EXPECTED) {
    let fk;
    try {
      fk = await findForeignKey(table, column);
    } catch (err) {
      console.warn('[fk] could not inspect ' + table + '.' + column + ': ' + (err && err.message));
      continue;
    }

    // No FK yet (fresh database, or one dissolve just cleared) — sync builds it
    // from the model, which already carries the right rule.
    if (!fk) continue;
    if (String(fk.rule).toUpperCase() === rule) continue;   // already correct

    try {
      await sequelize.query('ALTER TABLE `' + table + '` DROP FOREIGN KEY `' + fk.name + '`');
      console.log(
        '[fk] dropped ' + table + '.' + column + ' (' + fk.name + ') — ' +
        'was ON DELETE ' + fk.rule + ', must be ' + rule + '; sync will recreate it'
      );
    } catch (err) {
      console.warn('[fk] could not drop ' + table + '.' + fk.name + ': ' + (err && err.message));
    }
  }
}
