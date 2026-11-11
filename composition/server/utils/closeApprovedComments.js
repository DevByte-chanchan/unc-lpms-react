'use strict';

// An approved learning plan has no open comments: whatever was still open when the Dean gave the final approval
// (notes, suggestions, asks the plan was approved without) is closed with the approval's time.
// offeringId: one plan (the Dean's acceptance, inside its transaction); null: every approved plan (migration, seeder).
// now: the approval time; left out (migration, seeder), each plan's own recorded approval time is used.
const closeApprovedComments = async (sequelize, { offeringId = null, now = null, transaction } = {}) => {
    const approvedAt = `(SELECT pco.approved_at FROM CourseOfferingAssignments a
                          INNER JOIN ProgramCourseOfferings pco ON pco.pc_offering_id = a.pc_offering_id
                          WHERE a.co_assign_id = Comments.co_assign_id)`;
    await sequelize.query(
        `UPDATE Comments SET resolved_status = 1, resolved_date = COALESCE(?, ${approvedAt}), updatedAt = COALESCE(?, ${approvedAt})
         WHERE resolved_status = 0 AND co_assign_id IN (
             SELECT a.co_assign_id FROM CourseOfferingAssignments a
                 INNER JOIN ProgramCourseOfferings pco ON pco.pc_offering_id = a.pc_offering_id
             WHERE pco.approved_at IS NOT NULL AND (? IS NULL OR pco.pc_offering_id = ?))`,
        { replacements: [now, now, offeringId, offeringId], transaction });
};

module.exports = { closeApprovedComments };
