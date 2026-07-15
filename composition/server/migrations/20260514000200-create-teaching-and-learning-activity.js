'use strict';
/** Migration: create Teaching_and_Learning_Activity table */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('TeachingAndLearningActivities', {
            tla_id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            tla_name: {
                type: Sequelize.STRING(200),
                allowNull: false
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: false
            },
            performed_by: {
                type: Sequelize.CHAR(1),
                allowNull: false
            },
            class_phase: {
                type: Sequelize.STRING(30),
                allowNull: false
            },
            is_lab: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
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
        await queryInterface.dropTable('TeachingAndLearningActivities');
    }
};