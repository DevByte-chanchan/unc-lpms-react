'use strict';
/** Migration: create ILO_Topic join table (ilo_id <-> topic_id) */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('ILOTopics', {
            ilo_topic_id: {
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
            topic_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'Topics',
                    key: 'topic_id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
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
        await queryInterface.dropTable('ILOTopics');
    }
};
