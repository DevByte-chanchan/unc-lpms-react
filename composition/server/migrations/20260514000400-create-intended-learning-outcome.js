'use strict';
/** Migration: create Intended_Learning_Outcome table */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('IntendedLearningOutcomes', {
            ilo_id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            co_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'CourseOutcomes',
                    key: 'co_id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: false
            },
            hours: {
                type: Sequelize.INTEGER,
                allowNull: true // Changed to nullable
            },
            weeks: {
                type: Sequelize.DECIMAL(4, 2),
                allowNull: true // Added weeks
            },
            assessment_tool: {
                type: Sequelize.STRING(200),
                allowNull: true // Added assessment tool
            },
            is_orientation:{
                type: Sequelize.BOOLEAN,
                defaultValue: false,
                allowNull: true,
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
        await queryInterface.dropTable('IntendedLearningOutcomes');
    }
};