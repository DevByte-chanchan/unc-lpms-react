'use strict';

// One source of truth for a plan's status: AssignmentWorkflowLogs.
//
// CourseOfferingAssignments.date_submitted can say "submitted" with no matching
// SUBMITTED log (older seeders wrote only the date). The edit lock and the
// transition rules read the logs, so such a plan looked like a draft there while
// the course tables showed it as pending/returned. This writes the missing
// SUBMITTED log, timestamped at date_submitted, so the two agree.
//
// Idempotent. down() is a no-op: the inserted rows are indistinguishable from
// real SUBMITTED logs, and removing them would re-open the inconsistency.

module.exports = {
    async up(queryInterface) {
        const [rows] = await queryInterface.sequelize.query(
            `SELECT a.co_assign_id, a.date_submitted
             FROM CourseOfferingAssignments a
             WHERE a.date_submitted IS NOT NULL
               AND NOT EXISTS (
                   SELECT 1 FROM AssignmentWorkflowLogs l
                   WHERE l.co_assign_id = a.co_assign_id
                     AND l.actor_role = 'INSTRUCTOR'
                     AND l.action_type = 'SUBMITTED'
               );`
        );
        for (const row of rows) {
            await queryInterface.sequelize.query(
                `INSERT INTO AssignmentWorkflowLogs (co_assign_id, actor_role, action_type, createdAt, updatedAt)
                 VALUES (?, 'INSTRUCTOR', 'SUBMITTED', ?, ?);`,
                { replacements: [row.co_assign_id, row.date_submitted, row.date_submitted] }
            );
        }
    },

    async down() {}
};
