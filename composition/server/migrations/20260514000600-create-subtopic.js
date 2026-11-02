'use strict';
/** Migration: create Subtopic table (references week_id and topic_id) */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Subtopics', {
            subtopic_id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            week_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'Weeks',
                    key: 'week_id'
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
            title: {
                type: Sequelize.STRING(200),
                allowNull: false
            },
            sequence_order: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            is_orientation: {
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
        await queryInterface.dropTable('Subtopics');
    }
};
