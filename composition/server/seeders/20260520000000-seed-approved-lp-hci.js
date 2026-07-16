'use strict';

/**
 * Seeder: Transition HCI Learning Plan (BIT313L Revision 1) from RETURNED to APPROVED
 * Target: Human and Computer Interaction (BIT313L)
 * Actions:
 * - Resolves all active comments on the assignment.
 * - Implements the requested changes in the syllabus (adds "Distributed Cognition and Activity Theory" subtopic
 * and appends ethical compliance to the post-class usability testing lab).
 * - Updates the assignment dates (date_submitted, date_updated) to indicate resubmission.
 * - Appends workflow logs: Resubmitted -> Accepted by Library, IC, PH, and DEAN (making it APPROVED).
 * Run: npx sequelize-cli db:seed --seed 20260520000000-seed-approved-lp-hci.js
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
            throw new Error("CourseOfferingAssignment for BIT313L not found. Please run the foundation and returned seeders first.");
        }

        const assignId = assignmentQuery[0].co_assign_id;

        // ============================================================================
        // 2. RESOLVE ALL OUTSTANDING COMMENTS
        // ============================================================================
        const resubmissionDate = new Date('2026-06-22 09:00:00');

        await queryInterface.bulkUpdate(
            'Comments',
            {
                resolved_status: true,
                resolved_date: resubmissionDate,
                updatedAt: now
            },
            { co_assign_id: assignId }
        );

        // ============================================================================
        // 3. IMPLEMENT CURRICULUM CHANGE 1: Add new subtopic under "Cognitive Models in HCI"
        // ============================================================================
        const topicQuery = await queryInterface.sequelize.query(
            `SELECT topic_id FROM Topics WHERE title = 'Cognitive Models in HCI' LIMIT 1;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        if (topicQuery.length === 0) {
            throw new Error("Topic 'Cognitive Models in HCI' not found.");
        }

        const topicId = topicQuery[0].topic_id;

        // Determine next sequence order dynamically
        const subtopicCountQuery = await queryInterface.sequelize.query(
            `SELECT COUNT(*) as count FROM Subtopics WHERE topic_id = ${topicId};`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const nextSequence = (parseInt(subtopicCountQuery[0].count) || 0) + 1;

        await queryInterface.bulkInsert('Subtopics', [{
            topic_id: topicId,
            title: 'Distributed Cognition and Activity Theory',
            sequence_order: nextSequence,
            createdAt: now,
            updatedAt: now
        }], {});

        // ============================================================================
        // 4. IMPLEMENT CURRICULUM CHANGE 2: Update TLA description with Ethical Compliance
        // ============================================================================
        const tlaQuery = await queryInterface.sequelize.query(
            `SELECT tla_id, description FROM TeachingAndLearningActivities
             WHERE tla_name LIKE '%Moderated Usability Testing%' AND class_phase = 'postclass' LIMIT 1;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        if (tlaQuery.length > 0) {
            const tlaId = tlaQuery[0].tla_id;
            const originalDesc = tlaQuery[0].description || "";
            const updatedDesc = `${originalDesc}\n\nEthical Compliance Requirement: Students must secure and submit signed Informed Consent and NDA forms before conducting any live user tests.`;

            await queryInterface.bulkUpdate(
                'TeachingAndLearningActivities',
                {
                    description: updatedDesc,
                    updatedAt: now
                },
                { tla_id: tlaId }
            );
        }

        // ============================================================================
        // 5. UPDATE COURSE OFFERING ASSIGNMENT DATES (To "SUBMITTED" state)
        // ============================================================================
        await queryInterface.bulkUpdate(
            'CourseOfferingAssignments',
            {
                date_submitted: resubmissionDate,
                date_updated: resubmissionDate,
                updatedAt: now
            },
            { co_assign_id: assignId }
        );

        // ============================================================================
        // 6. INJECT WORKFLOW LOGS (From Resubmission to Final Dean Approval)
        // ============================================================================
        await queryInterface.bulkInsert('AssignmentWorkflowLogs', [
            // Resubmission
            {
                co_assign_id: assignId,
                actor_role: 'INSTRUCTOR',
                action_type: 'SUBMITTED',
                createdAt: resubmissionDate,
                updatedAt: resubmissionDate
            },
            // Stakeholder Acceptance Pipeline
            {
                co_assign_id: assignId,
                actor_role: 'LIBRARY_DIRECTOR',
                action_type: 'ACCEPTED',
                createdAt: new Date('2026-06-23 10:00:00'),
                updatedAt: new Date('2026-06-23 10:00:00')
            },
            {
                co_assign_id: assignId,
                actor_role: 'INDUSTRY_CONSULTANT',
                action_type: 'ACCEPTED',
                createdAt: new Date('2026-06-24 13:00:00'),
                updatedAt: new Date('2026-06-24 13:00:00')
            },
            {
                co_assign_id: assignId,
                actor_role: 'PROGRAM_HEAD',
                action_type: 'ACCEPTED',
                createdAt: new Date('2026-06-25 09:45:00'),
                updatedAt: new Date('2026-06-25 09:45:00')
            },
            // Dean Approval transitions the plan to APPROVED
            {
                co_assign_id: assignId,
                actor_role: 'DEAN',
                action_type: 'ACCEPTED',
                createdAt: new Date('2026-06-28 15:00:00'),
                updatedAt: new Date('2026-06-28 15:00:00')
            }
        ], {});

        console.log(`Successfully completed resubmission and approval integration for course BIT313L.`);
    },

    async down(queryInterface, Sequelize) {
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

            // 1. Delete workflow logs inserted during this approval phase
            await queryInterface.sequelize.query(
                `DELETE FROM AssignmentWorkflowLogs 
                 WHERE co_assign_id = ${assignId} 
                 AND createdAt >= '2026-06-22 00:00:00';`
            );

            // 2. Revert the comments back to unresolved state
            await queryInterface.bulkUpdate(
                'Comments',
                {
                    resolved_status: false,
                    resolved_date: null,
                    updatedAt: new Date()
                },
                { co_assign_id: assignId }
            );

            // 3. Revert assignment dates back to the "returned" state (original submission: 2026-06-15)
            await queryInterface.bulkUpdate(
                'CourseOfferingAssignments',
                {
                    date_submitted: new Date('2026-06-15 10:00:00'),
                    date_updated: null,
                    updatedAt: new Date()
                },
                { co_assign_id: assignId }
            );

            // 4. Delete the added subtopic "Distributed Cognition and Activity Theory"
            const topicQuery = await queryInterface.sequelize.query(
                `SELECT topic_id FROM Topics WHERE title = 'Cognitive Models in HCI' LIMIT 1;`,
                { type: queryInterface.sequelize.QueryTypes.SELECT }
            );
            if (topicQuery.length > 0) {
                const topicId = topicQuery[0].topic_id;
                await queryInterface.sequelize.query(
                    `DELETE FROM Subtopics WHERE topic_id = ${topicId} AND title = 'Distributed Cognition and Activity Theory';`
                );
            }

            // 5. Revert TLA description (remove the ethical compliance statement)
            const tlaQuery = await queryInterface.sequelize.query(
                `SELECT tla_id, description FROM TeachingAndLearningActivities
                 WHERE tla_name LIKE '%Moderated Usability Testing%' AND class_phase = 'postclass' LIMIT 1;`,
                { type: queryInterface.sequelize.QueryTypes.SELECT }
            );
            if (tlaQuery.length > 0) {
                const tlaId = tlaQuery[0].tla_id;
                let desc = tlaQuery[0].description || "";
                const cleanDesc = desc.replace(/\n\nEthical Compliance Requirement: Students must secure and submit signed Informed Consent and NDA forms before conducting any live user tests\./, "");
                await queryInterface.bulkUpdate(
                    'TeachingAndLearningActivities',
                    {
                        description: cleanDesc,
                        updatedAt: new Date()
                    },
                    { tla_id: tlaId }
                );
            }
        }
        console.log(`Successfully reverted BIT313L back to the returned status state.`);
    }
};