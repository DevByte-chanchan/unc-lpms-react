'use strict';
/** Migration: create Topic table (references ilo_id) */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Topics', {
            topic_id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            ilo_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'IntendedLearningOutcomes',
                    key: 'ilo_id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            title: {
                type: Sequelize.STRING(70),
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
        await queryInterface.dropTable('Topics');
    }
};
