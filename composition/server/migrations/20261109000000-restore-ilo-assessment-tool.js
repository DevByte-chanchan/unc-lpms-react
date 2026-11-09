'use strict';

// The weekly-planner branch (feature/learning-plan-composition) reads and writes
// IntendedLearningOutcomes.assessment_tool on the Criteria for Grading page, which
// 20260907000000-drop-ilo-assessment-tool had removed. Bring the column back, empty.
// Native ADD COLUMN, so SQLite does not rebuild the table (see that migration).

module.exports = {
    async up(queryInterface) {
        const columns = await queryInterface.describeTable('IntendedLearningOutcomes');
        if (!columns.assessment_tool) {
            await queryInterface.sequelize.query('ALTER TABLE IntendedLearningOutcomes ADD COLUMN assessment_tool VARCHAR(200);');
        }
    },

    async down(queryInterface) {
        const columns = await queryInterface.describeTable('IntendedLearningOutcomes');
        if (columns.assessment_tool) {
            await queryInterface.sequelize.query('ALTER TABLE IntendedLearningOutcomes DROP COLUMN assessment_tool;');
        }
    }
};
