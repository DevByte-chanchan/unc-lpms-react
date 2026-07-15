'use strict';
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('IntendedLearningOutcomes', 'grade_period', {
            type: Sequelize.CHAR(1),
            allowNull: true,
        });
        await queryInterface.addColumn('IntendedLearningOutcomes', 'grade_weight', {
            type: Sequelize.STRING(10),
            allowNull: true,
        });
        await queryInterface.addColumn('IntendedLearningOutcomes', 'min_passing', {
            type: Sequelize.INTEGER,
            allowNull: true,
        });
    },
    async down(queryInterface) {
        await queryInterface.removeColumn('IntendedLearningOutcomes', 'grade_period');
        await queryInterface.removeColumn('IntendedLearningOutcomes', 'grade_weight');
        await queryInterface.removeColumn('IntendedLearningOutcomes', 'min_passing');
    }
};
