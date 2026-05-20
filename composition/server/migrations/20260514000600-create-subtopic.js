'use strict';
/** Migration: create Subtopic table (references topic_id) */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Subtopics', {
            subtopic_id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
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
            title: {
                type: Sequelize.STRING(70),
                allowNull: false
            },
            sequence_order: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0
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
        await queryInterface.dropTable('Subtopics');
    }
};
