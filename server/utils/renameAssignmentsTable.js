/**
 * One-time rename: course_offering_assignments → course_offering_assignments.
 *
 * The row does not assign a faculty to a COURSE, it fills a course OFFERING —
 * a (course × program) pairing. The old name predates that model and misnames
 * the thing.
 *
 * MUST RUN BEFORE sequelize.sync(). sync() only knows the model's tableName; it
 * would happily CREATE an empty course_offering_assignments beside the populated
 * course_offering_assignments and leave every existing row stranded in the orphan table.
 *
 * Idempotent: no-ops once the new table exists.
 */
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';

const tableExists = async (name) => {
  const rows = await sequelize.query(
    `SELECT 1 FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = :name`,
    { replacements: { name }, type: QueryTypes.SELECT },
  );
  return rows.length > 0;
};

export async function renameAssignmentsTable() {
  try {
    // NOTE: the old name is spelled in pieces so a future project-wide
    // find-and-replace of "course_assignments" cannot rewrite it into the new
    // name — which would make oldName === newName and turn this migration into
    // a silent no-op, stranding every existing row.
    const oldName = 'course_' + 'assignments';
    const newName = 'course_offering_assignments';

    if (await tableExists(newName)) return;      // already renamed
    if (!(await tableExists(oldName))) return;   // fresh DB — sync will create it

    // RENAME TABLE carries the rows, indexes and foreign keys across intact.
    await sequelize.query('RENAME TABLE `' + oldName + '` TO `' + newName + '`');
    console.log('[rename] ' + oldName + ' → ' + newName + ' (rows, indexes and FKs preserved).');

    // The undo snapshots key their payload by table name, so any batch taken
    // before the rename would restore into a table that no longer exists.
    // Dropping them is cheaper and safer than rewriting the JSON inside them,
    // and it can't strand a live undo: this runs once at boot, and it only
    // touches the OLD entity name, which no new batch is ever written under.
    const [, cleared] = await sequelize.query(
      'DELETE FROM import_batches WHERE entity = :old',
      { replacements: { old: oldName } },
    );
    if (Number(cleared) > 0) {
      console.log('[rename] cleared ' + cleared + ' stale undo batch(es) that referenced the old table name.');
    }
  } catch (err) {
    console.error('[rename] FAILED: ' + (err && err.message));
  }
}
