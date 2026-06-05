/**
 * Boot-time fix for course_assignments.course_offering_id.
 *
 * The Course Assignment importer resolves a row's course code against the
 * GLOBAL curriculum catalog (Course / `courses`) and stores that catalog
 * course_id in `course_offering_id` (the column name is kept for
 * compatibility). An old model association created a FOREIGN KEY from that
 * column to `course_offerings.id`, so a catalog id that isn't a matching
 * course_offerings row makes inserts fail with:
 *   ER_NO_REFERENCED_ROW (course_assignments_ibfk_NNN)
 *
 * Repeated `sync({ alter: true })` also re-adds the FK every boot, piling up
 * hundreds of duplicate constraints (the high ibfk number).
 *
 * course_offering_id is a loose "resolved id" reference — no cross-table FK is
 * appropriate — so this helper drops EVERY foreign key on that column. It is
 * idempotent and safe to run on every boot. (The faculty_id FK and the
 * consultant_courses FK are untouched — those genuinely reference real rows.)
 */
import { sequelize } from '../config/sequelize.js';

export async function relaxCourseAssignmentOfferingFk() {
  try {
    const [rows] = await sequelize.query(
      "SELECT CONSTRAINT_NAME AS name FROM information_schema.KEY_COLUMN_USAGE " +
      "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'course_assignments' " +
      "AND COLUMN_NAME = 'course_offering_id' AND REFERENCED_TABLE_NAME IS NOT NULL"
    );
    if (!Array.isArray(rows) || rows.length === 0) return;
    for (const r of rows) {
      const name = r && r.name;
      if (!name) continue;
      try {
        await sequelize.query('ALTER TABLE `course_assignments` DROP FOREIGN KEY `' + name + '`');
        console.log('[fk] dropped course_assignments FK on course_offering_id ("' + name + '")');
      } catch (err) {
        console.warn('[fk] could not drop course_assignments.' + name + ': ' + (err && err.message));
      }
    }
  } catch (err) {
    console.warn('[fk] course_assignments FK relax skipped: ' + (err && err.message));
  }
}
