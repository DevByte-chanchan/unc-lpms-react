'use strict';
/**
 * Migration: create Course_Outcome table
 * NOTE: this table references ProgramCourseOfferings(pc_offering_id).
 * Ensure ProgramCourseOfferings migration has already run.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('CourseOutcomes', {
            co_id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            pc_offering_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'ProgramCourseOfferings',
                    key: 'pc_offering_id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT'
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
