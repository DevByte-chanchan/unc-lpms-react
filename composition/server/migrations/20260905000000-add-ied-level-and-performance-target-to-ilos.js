'use strict';

// Adds to IntendedLearningOutcomes:
//   ied_level                  Introductory / Enabling / Demonstrative (I/E/D)
//   target_students_percent    COAEP performance target: % of enrolled students...
//   target_score_percent       ...with a rating of at least this % of the total score
//
// ied_level stays nullable: orientation ILOs have none, and a new ILO has no level
// until the instructor picks one. The two target columns default to the official
// COAEP wording (90% of students at 60% or higher), so existing rows need no backfill.
//
// Backfill: within each course outcome, the non-orientation ILOs in id order are
// the seeded I, E, D triple. A CO with more than three is left unlevelled past the
// third ILO for the instructor to classify; the submit gate flags it.
// Additive and idempotent. down() drops the three columns without rebuilding the table.

const LEVELS = ['I', 'E', 'D'];

module.exports = {
    async up(queryInterface, Sequelize) {
        const columns = await queryInterface.describeTable('IntendedLearningOutcomes');

        if (!columns.ied_level) {
            await queryInterface.addColumn('IntendedLearningOutcomes', 'ied_level', {
                type: Sequelize.ENUM(...LEVELS),
                allowNull: true
            });
        }
        if (!columns.target_students_percent) {
            await queryInterface.addColumn('IntendedLearningOutcomes', 'target_students_percent', {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 90
            });
        }
        if (!columns.target_score_percent) {
            await queryInterface.addColumn('IntendedLearningOutcomes', 'target_score_percent', {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 60
            });
        }

        const [rows] = await queryInterface.sequelize.query(
            `SELECT ilo_id, co_id, is_orientation
             FROM IntendedLearningOutcomes
             WHERE ied_level IS NULL
             ORDER BY co_id ASC, ilo_id ASC;`
        );
        const seenPerCo = new Map();
        for (const row of rows) {
            if (row.is_orientation) continue;
            const position = seenPerCo.get(row.co_id) || 0;
            seenPerCo.set(row.co_id, position + 1);
            if (position >= LEVELS.length) continue;
            await queryInterface.sequelize.query(
                'UPDATE IntendedLearningOutcomes SET ied_level = ? WHERE ilo_id = ?;',
                { replacements: [LEVELS[position], row.ilo_id] }
            );
        }
    },

    async down(queryInterface) {
        const columns = await queryInterface.describeTable('IntendedLearningOutcomes');
        // Native DROP COLUMN, not queryInterface.removeColumn: on SQLite Sequelize
        // rebuilds the table (drop + recreate), and with foreign keys on that cascades
        // and deletes every ILOTopics / ILOReferences / Comments row pointing at an ILO.
        for (const name of ['ied_level', 'target_students_percent', 'target_score_percent']) {
            if (columns[name]) {
                await queryInterface.sequelize.query(`ALTER TABLE IntendedLearningOutcomes DROP COLUMN ${name};`);
            }
        }
    }
};
