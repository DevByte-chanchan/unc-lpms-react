'use strict';
/** Migration: create TLA_ASSESSMENT table (references tla_id) */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('TLAAssessments', {
            method_id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            tla_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'TeachingAndLearningActivities',
                    key: 'tla_id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            name: {
                type: Sequelize.STRING(70),
                allowNull: false
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: false
            },
            period: {
                type: Sequelize.CHAR(1),
                allowNull: false
            },
            weight: {
                type: Sequelize.STRING(10),
                allowNull: false
            },
            min_passing: {
                type: Sequelize.INTEGER,
                allowNull: true
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
        await queryInterface.dropTable('TLAAssessments');
    }
};
