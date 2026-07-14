/**
 * Offering lookup for the course-assignment matcher.
 *
 * An offering is a (course × program) pairing. So resolving an assignment to
 * its offering needs BOTH: the course code alone is ambiguous — GE 101 is
 * offered by BSIT, BSCS and BSN, and each of those offerings has its own
 * syllabus and its own assigned faculty.
 *
 * The program comes from the Program Head doing the work (the page already
 * knows which program is selected), not from the spreadsheet.
 */
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';

const key = (courseId, programId) => String(courseId) + ':' + String(programId);

/**
 * { "courseId:programId" → pc_offering_id } for every offering in a period.
 * Scoped through courses, which carry the period.
 */
export async function offeringIndexForPeriod(periodId) {
  if (!periodId) return { get: () => null };

  // Raw SQL — real column names, not the Sequelize attribute names.
  const rows = await sequelize.query(
    `SELECT o.program_course_offering_id, o.course_id, o.program_id
       FROM program_course_offerings o
       JOIN courses c ON c.course_id = o.course_id
      WHERE c.academic_period_id = :pid`,
    { replacements: { pid: periodId }, type: QueryTypes.SELECT },
  );

  const byKey = new Map(rows.map((r) => [key(r.course_id, r.program_id), r.program_course_offering_id]));
  return {
    get: (courseId, programId) =>
      (courseId != null && programId != null) ? (byKey.get(key(courseId, programId)) ?? null) : null,
  };
}
