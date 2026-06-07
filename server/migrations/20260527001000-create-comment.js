'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Comments', {
            comment_id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            commenter_role: {
                type: Sequelize.STRING(30),
                allowNull: false
            },
            message: {
                type: Sequelize.TEXT,
                allowNull: false
            },
            resolved_status: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            // New attribute: ILO Relationship
            ilo_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'IntendedLearningOutcomes',
                    key: 'ilo_id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            // New attribute: Context indicator
            comment_for: {
                type: Sequelize.ENUM('references', 'topics', 'tlas'),
                allowNull: true
            },
            // New attribute: The specific ID of the item being commented on
            target_id: {
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
        await queryInterface.dropTable('Comments');
    }
};