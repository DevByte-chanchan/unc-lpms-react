'use strict';

// An ILO's assessment lives in TLAAssessments (ILO -> topic -> TLA -> assessment),
// which is what the syllabus forms edit and what the COAEP reads. The free-text
// IntendedLearningOutcomes.assessment_tool column was only ever written by
// seeders and could disagree with it, so it goes.
//
// Native DROP COLUMN, not queryInterface.removeColumn: on SQLite Sequelize
// rebuilds the table, and with foreign keys on that cascades and deletes every
// ILOTopics / ILOReferences / Comments row pointing at an ILO.
// down() restores the empty column; the dropped text is not recoverable.

module.exports = {
    async up(queryInterface) {
        const columns = await queryInterface.describeTable('IntendedLearningOutcomes');
        if (columns.assessment_tool) {
            await queryInterface.sequelize.query('ALTER TABLE IntendedLearningOutcomes DROP COLUMN assessment_tool;');
        }
    },

    async down(queryInterface, Sequelize) {
        const columns = await queryInterface.describeTable('IntendedLearningOutcomes');
        if (!columns.assessment_tool) {
            await queryInterface.addColumn('IntendedLearningOutcomes', 'assessment_tool', {
                type: Sequelize.STRING(200),
                allowNull: true
            });
        }
    }
};
