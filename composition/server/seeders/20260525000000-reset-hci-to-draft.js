'use strict';

/**
 * Seeder: Reset HCI Learning Plan (BIT313L Revision 1) back to DRAFT State
 * Target: Human and Computer Interaction (BIT313L)
 * Actions:
 * - Deletes all workflow logs associated with this assignment.
 * - Deletes all comments and comment targets.
 * - Removes the added subtopic "Distributed Cognition and Activity Theory".
 * - Reverts the TLA description back to its original state (removes ethical compliance note).
 * - Resets date_submitted and date_updated to NULL.
 * Run: npx sequelize-cli db:seed --seed 20260525000000-reset-hci-to-draft.js
 */

module.exports = {
    async up(queryInterface, Sequelize) {
        const now = new Date();

        // ============================================================================
        // 1. FETCH TARGET ASSIGNMENT (BIT313L Revision 1)
        // ============================================================================
        const assignmentQuery = await queryInterface.sequelize.query(
            `SELECT coa.co_assign_id
             FROM CourseOfferingAssignments coa
                      JOIN ProgramCourseOfferings pco ON coa.pc_offering_id = pco.pc_offering_id
                      JOIN Courses c ON pco.course_id = c.course_id
             WHERE c.course_no = 'BIT313L' AND pco.revision_number = 1
             ORDER BY coa.co_assign_id DESC LIMIT 1;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        if (assignmentQuery.length === 0) {
            throw new Error("CourseOfferingAssignment for BIT313L not found.");
        }

        const assignId = assignmentQuery[0].co_assign_id;

        // ============================================================================
        // 2. WIPE COMMENT TARGETS & COMMENTS
        // ============================================================================
        await queryInterface.sequelize.query(
            `DELETE FROM CommentTargets 
             WHERE comment_id IN (SELECT comment_id FROM Comments WHERE co_assign_id = ${assignId});`
        );

        await queryInterface.sequelize.query(
            `DELETE FROM Comments WHERE co_assign_id = ${assignId};`
        );

        // ============================================================================
        // 3. WIPE ALL WORKFLOW LOGS (To revert back to Draft)
        // ============================================================================
        await queryInterface.sequelize.query(
            `DELETE FROM AssignmentWorkflowLogs WHERE co_assign_id = ${assignId};`
        );

        // Keep the ASSIGNED event so the Revisions timeline still opens with
        // "Program Head initialized and routed the learning plan..."
        // (ASSIGNED alone does not change the Draft status computation.)
        await queryInterface.sequelize.query(
            `INSERT INTO AssignmentWorkflowLogs (co_assign_id, actor_role, action_type, createdAt, updatedAt)
             SELECT co_assign_id, 'PROGRAM_HEAD', 'ASSIGNED', COALESCE(date_assigned, CURRENT_TIMESTAMP), COALESCE(date_assigned, CURRENT_TIMESTAMP)
             FROM CourseOfferingAssignments WHERE co_assign_id = ${assignId};`
        );

        // ============================================================================
        // 4. REMOVE THE ADDED SUBTOPIC
        // ============================================================================
        const topicQuery = await queryInterface.sequelize.query(
            `SELECT topic_id FROM Topics WHERE title = 'Cognitive Models in HCI' LIMIT 1;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        if (topicQuery.length > 0) {
            const topicId = topicQuery[0].topic_id;
            await queryInterface.sequelize.query(
                `DELETE FROM Subtopics 
                 WHERE topic_id = ${topicId} AND title = 'Distributed Cognition and Activity Theory';`
            );
        }

        // ============================================================================
        // 5. REVERT THE TLA DESCRIPTION
        // ============================================================================
        const tlaQuery = await queryInterface.sequelize.query(
            `SELECT tla_id, description FROM TeachingAndLearningActivities
             WHERE tla_name LIKE '%Moderated Usability Testing%' AND class_phase = 'postclass' LIMIT 1;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        if (tlaQuery.length > 0) {
            const tlaId = tlaQuery[0].tla_id;
            const desc = tlaQuery[0].description || "";
            // Replace the appended ethical compliance text
            const cleanDesc = desc.replace(/\n\nEthical Compliance Requirement: Students must secure and submit signed Informed Consent and NDA forms before conducting any live user tests\./, "");

            await queryInterface.bulkUpdate(
                'TeachingAndLearningActivities',
                {
                    description: cleanDesc,
                    updatedAt: now
                },
                { tla_id: tlaId }
            );
        }

        // ============================================================================
        // 6. RESET ASSIGNMENT RECORD TIMESTAMPS TO NULL (Pure Draft Status)
        // ============================================================================
        await queryInterface.bulkUpdate(
            'CourseOfferingAssignments',
            {
                date_submitted: null,
                date_updated: null,
                updatedAt: now
            },
            { co_assign_id: assignId }
        );

        console.log(`Successfully reset BIT313L back to an untouched Draft state.`);
    },

    async down(queryInterface, Sequelize) {
        console.log("Down migration not explicitly supported for hard-reset seeds. Re-run the returned and approved seeders to reconstruct state.");
    }
};