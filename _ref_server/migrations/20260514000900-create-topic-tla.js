'use strict';
/** Migration: create Topic_TLA join table (ilo_topic_id <-> tla_id) */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('TopicTLAs', {
            topic_tla_id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            ilo_topic_id: { // ✅ updated FK
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'ILOTopics', // ✅ points to ILOTopics
                    key: 'ilo_topic_id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
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
        await queryInterface.dropTable('TopicTLAs');
    }

};
