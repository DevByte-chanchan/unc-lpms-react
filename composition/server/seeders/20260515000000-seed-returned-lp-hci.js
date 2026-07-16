'use strict';

/**
 * Seeder: Update Foundation Course to RETURNED Status
 * Target: Human and Computer Interaction (BIT313L)
 * Actions: Updates submission date, injects workflow logs (Assigned -> Submitted -> Returned),
 * and attaches UNRESOLVED, actionable comments to existing Topics and TLAs.
 * Run: npx sequelize-cli db:seed --seed 20260515000000-seed-returned-lp-hci.js
 */

module.exports = {
    async up(queryInterface, Sequelize) {
        const now = new Date();

        // ============================================================================
        // 1. FETCH TARGET ASSIGNMENT (BIT313L from the Foundation Seeder)
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
            throw new Error("CourseOfferingAssignment for BIT313L not found. Please run the foundation seeder first.");
        }

        const assignId = assignmentQuery[0].co_assign_id;

        // ============================================================================
        // 1.5 CLEANUP MANUAL TESTING
        // Delete any real-time logs/comments you made manually via the UI so they
        // don't conflict with the hardcoded chronological dates in this seeder.
        // ============================================================================
        await queryInterface.sequelize.query(
            `DELETE FROM CommentTargets WHERE comment_id IN (SELECT comment_id FROM Comments WHERE co_assign_id = ${assignId});`
        );
        await queryInterface.sequelize.query(`DELETE FROM Comments WHERE co_assign_id = ${assignId};`);
        await queryInterface.sequelize.query(`DELETE FROM AssignmentWorkflowLogs WHERE co_assign_id = ${assignId};`);

        // ============================================================================
        // 2. UPDATE ASSIGNMENT RECORD
        // ============================================================================
        await queryInterface.bulkUpdate(
            'CourseOfferingAssignments',
            {
                date_submitted: new Date('2026-06-15 10:00:00'),
                updatedAt: now
            },
            { co_assign_id: assignId }
        );

        // ============================================================================
        // 3. ASSIGNMENT WORKFLOW LOGS (The Return Trail)
        // ============================================================================
        await queryInterface.bulkInsert('AssignmentWorkflowLogs', [
            { co_assign_id: assignId, actor_role: 'PROGRAM_HEAD', action_type: 'ASSIGNED', createdAt: new Date('2026-06-01 09:00:00'), updatedAt: new Date('2026-06-01 09:00:00') },
            { co_assign_id: assignId, actor_role: 'INSTRUCTOR', action_type: 'SUBMITTED', createdAt: new Date('2026-06-15 10:00:00'), updatedAt: new Date('2026-06-15 10:00:00') },
            // Rejected by Stakeholders
            { co_assign_id: assignId, actor_role: 'INDUSTRY_CONSULTANT', action_type: 'RETURNED', createdAt: new Date('2026-06-18 14:00:00'), updatedAt: new Date('2026-06-18 14:00:00') },
            { co_assign_id: assignId, actor_role: 'PROGRAM_HEAD', action_type: 'RETURNED', createdAt: new Date('2026-06-19 11:30:00'), updatedAt: new Date('2026-06-19 11:30:00') }
        ], {});

        // ============================================================================
        // 4. FETCH TARGETS FOR COMMENTS (Dynamic linking to foundational data)
        // ============================================================================
        const topic1Query = await queryInterface.sequelize.query(
            `SELECT topic_id FROM Topics WHERE title = 'Cognitive Models in HCI' LIMIT 1;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const topic1Id = topic1Query[0].topic_id;

        const iloTopic1Query = await queryInterface.sequelize.query(
            `SELECT ilo_id FROM ILOTopics WHERE topic_id = ${topic1Id} LIMIT 1;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const ilo1Id = iloTopic1Query[0].ilo_id;

        const tlaQuery = await queryInterface.sequelize.query(
            `SELECT tla_id FROM TeachingAndLearningActivities
             WHERE tla_name LIKE '%Moderated Usability Testing%' AND class_phase = 'postclass' LIMIT 1;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const tlaId = tlaQuery[0].tla_id;

        const topic2Query = await queryInterface.sequelize.query(
            `SELECT topic_id FROM Topics WHERE title = 'Moderated Usability Testing Execution and Data Synthesis' LIMIT 1;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        const iloTopic2Query = await queryInterface.sequelize.query(
            `SELECT ilo_id FROM ILOTopics WHERE topic_id = ${topic2Query[0].topic_id} LIMIT 1;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const ilo2Id = iloTopic2Query[0].ilo_id;

        // ============================================================================
        // 5. COMMENTS & COMMENT TARGETS (ACTIONABLE & UNRESOLVED)
        // ============================================================================
        const icReturnDate = new Date('2026-06-18 14:05:00');
        const phReturnDate = new Date('2026-06-19 11:35:00');

        const rawCommentsData = [
            {
                co_assign_id: assignId,
                commenter_role: 'PROGRAM_HEAD',
                message: "The 'Cognitive Models in HCI' topic outline is missing modern contextual theories. You must explicitly add 'Distributed Cognition and Activity Theory' as a core subtopic, as this is a strict requirement for evaluating collaborative enterprise interfaces in today's industry.",
                resolved_status: false,
                resolved_date: null,
                ilo_id: ilo1Id,
                comment_for: 'topics',
                target_id: topic1Id,
                createdAt: icReturnDate,
                updatedAt: icReturnDate
            },
            {
                co_assign_id: assignId,
                commenter_role: 'PROGRAM_HEAD',
                message: "Your 'Design Review & Implementation' post-class lab for 'Moderated Usability Testing' lacks strict ethical compliance checks. Update the TLA description to explicitly mandate that students secure and submit signed Informed Consent and NDA forms before conducting any live user tests.",
                resolved_status: false,
                resolved_date: null,
                ilo_id: ilo2Id,
                comment_for: 'tlas',
                target_id: tlaId,
                createdAt: phReturnDate,
                updatedAt: phReturnDate
            }
        ];

        // Insert Comments
        await queryInterface.bulkInsert('Comments', rawCommentsData.map(c => ({
            co_assign_id: c.co_assign_id,
            commenter_role: c.commenter_role,
            message: c.message,
            resolved_status: c.resolved_status,
            resolved_date: c.resolved_date,
            ilo_id: c.ilo_id,
            comment_for: c.comment_for,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt
        })), {});

        const insertedComments = await queryInterface.sequelize.query(
            `SELECT comment_id, message FROM Comments WHERE co_assign_id = ${assignId};`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // Map to CommentTargets
        const targetInserts = rawCommentsData.map((c) => {
            const matchedDbComment = insertedComments.find(dbComment => dbComment.message === c.message);
            return {
                comment_id: matchedDbComment.comment_id,
                target_id: c.target_id,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt
            };
        });

        await queryInterface.bulkInsert('CommentTargets', targetInserts, {});

        console.log(`Successfully transitioned BIT313L to RETURNED status with active, unresolved comments.`);
    },

    async down(queryInterface, Sequelize) {
        // [Unchanged down block...]
        const assignmentQuery = await queryInterface.sequelize.query(
            `SELECT coa.co_assign_id
             FROM CourseOfferingAssignments coa
                      JOIN ProgramCourseOfferings pco ON coa.pc_offering_id = pco.pc_offering_id
                      JOIN Courses c ON pco.course_id = c.course_id
             WHERE c.course_no = 'BIT313L' AND pco.revision_number = 1
             ORDER BY coa.co_assign_id DESC LIMIT 1;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        if (assignmentQuery.length > 0) {
            const assignId = assignmentQuery[0].co_assign_id;

            await queryInterface.sequelize.query(`DELETE FROM CommentTargets WHERE comment_id IN (SELECT comment_id FROM Comments WHERE co_assign_id = ${assignId});`);
            await queryInterface.sequelize.query(`DELETE FROM Comments WHERE co_assign_id = ${assignId};`);
            await queryInterface.sequelize.query(`DELETE FROM AssignmentWorkflowLogs WHERE co_assign_id = ${assignId};`);

            await queryInterface.bulkUpdate(
                'CourseOfferingAssignments',
                {
                    date_submitted: null,
                    updatedAt: new Date()
                },
                { co_assign_id: assignId }
            );
        }
    }
};