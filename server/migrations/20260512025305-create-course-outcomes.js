'use strict';
/** Migration: create CourseOutcomes */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('CourseOutcomes', {
            co_id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            pc_offering_id: {            // FK -> ProgramCourseOfferings
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'ProgramCourseOfferings', key: 'pc_offering_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            co_description: {
                type: Sequelize.TEXT,
                allowNull: false
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });
    },
    async down(queryInterface) {
        await queryInterface.dropTable('CourseOutcomes');
    }
};
