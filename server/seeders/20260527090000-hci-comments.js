'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const { sequelize } = queryInterface;

        // 1. Get one distinct ILO ID for each Course Outcome (co_id) to ensure proper distribution
        const distinctILOs = await sequelize.query(
            `SELECT MIN(ilo_id) as ilo_id, co_id
             FROM IntendedLearningOutcomes
             GROUP BY co_id;`,
            { type: sequelize.QueryTypes.SELECT }
        );

        if (!distinctILOs || distinctILOs.length === 0) return;

        const iloIds = distinctILOs.map(item => item.ilo_id);

        // 2. Fetch all mappings using core domain entity keys for higher comment stability
        const mappingRecords = await sequelize.query(
            `SELECT
                 ilo.ilo_id,
                 ilo.co_id,
                 ref_join.reference_id,
                 top_join.topic_id,
                 tla_join.topic_tla_id
             FROM IntendedLearningOutcomes ilo
                      LEFT JOIN ILOReferences ref_join ON ref_join.ilo_id = ilo.ilo_id
                      LEFT JOIN ILOTopics top_join ON top_join.ilo_id = ilo.ilo_id
                      LEFT JOIN TopicTLAs tla_join ON tla_join.ilo_topic_id = top_join.ilo_topic_id
             WHERE ilo.ilo_id IN (?);`,
            {
                replacements: [iloIds],
                type: sequelize.QueryTypes.SELECT
            }
        );

        // 3. Feedback banks for realistic testing records
        const industryTopicFeedback = [
            "This topic should incorporate modern mobile UI patterns to better align with current industry standards.",
            "Please ensure the lecture materials cover dark patterns; students need to learn how to identify them in modern apps.",
            "The information architecture section should include a practical demonstration of Figma wireframing.",
            "Include more case studies on accessible design to ensure compliance with current UI best practices."
        ];

        const libraryRefFeedback = [
            "The textbook reference for this module is over five years old; please verify if a newer edition is available.",
            "This resource is currently only available in print. Can we procure a digital/e-book version for the students?",
            "The DOI link provided in the course syllabus is returning a 404 error; please update the reference.",
            "This paper is behind a paywall; please ensure students are provided with the institutional proxy link."
        ];

        const industryTlaFeedback = [
            "The prototyping lab requires a more rigorous grading rubric for interactive states.",
            "Ensure the usability testing activity includes remote user testing platforms, not just in-lab observation.",
            "The heuristic evaluation assignment should focus on mobile banking applications for more relevant data.",
            "This TLA needs to explicitly mandate the use of accessible touch-target sizing in the final deliverable."
        ];

        const commentsToInsert = [];
        const processedTypes = new Set();

        for (const [index, record] of mappingRecords.entries()) {

            // 1. Add 2 Comments for TOPICS (keyed precisely by topic_id)
            if (record.topic_id) {
                const uniqueKey = `${record.ilo_id}_topics_${record.topic_id}`;
                if (!processedTypes.has(uniqueKey)) {
                    processedTypes.add(uniqueKey);
                    for (let i = 0; i < 2; i++) {
                        const msg = industryTopicFeedback[(index + i) % industryTopicFeedback.length];
                        commentsToInsert.push({
                            commenter_role: 'Industry Consultant',
                            message: msg,
                            resolved_status: false,
                            ilo_id: record.ilo_id,
                            comment_for: 'topics',
                            target_id: record.topic_id,
                            createdAt: new Date(), updatedAt: new Date()
                        });
                    }
                }
            }

            // 2. Add 2 Comments for REFERENCES (keyed precisely by reference_id)
            if (record.reference_id) {
                const uniqueKey = `${record.ilo_id}_references_${record.reference_id}`;
                if (!processedTypes.has(uniqueKey)) {
                    processedTypes.add(uniqueKey);
                    for (let i = 0; i < 2; i++) {
                        const msg = libraryRefFeedback[(index + i) % libraryRefFeedback.length];
                        commentsToInsert.push({
                            commenter_role: 'Library Director',
                            message: msg,
                            resolved_status: false,
                            ilo_id: record.ilo_id,
                            comment_for: 'references',
                            target_id: record.reference_id,
                            createdAt: new Date(), updatedAt: new Date()
                        });
                    }
                }
            }

            // 3. Add 2 Comments for TLAs (keyed precisely by topic_tla_id)
            if (record.topic_tla_id) {
                const uniqueKey = `${record.ilo_id}_tlas_${record.topic_tla_id}`;
                if (!processedTypes.has(uniqueKey)) {
                    processedTypes.add(uniqueKey);
                    for (let i = 0; i < 2; i++) {
                        const msg = industryTlaFeedback[(index + i) % industryTlaFeedback.length];
                        commentsToInsert.push({
                            commenter_role: 'Industry Consultant',
                            message: msg,
                            resolved_status: false,
                            ilo_id: record.ilo_id,
                            comment_for: 'tlas',
                            target_id: record.topic_tla_id,
                            createdAt: new Date(), updatedAt: new Date()
                        });
                    }
                }
            }
        }

        if (commentsToInsert.length > 0) {
            await queryInterface.bulkInsert('Comments', commentsToInsert);
        }
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.bulkDelete('Comments', null, {});
    }
};