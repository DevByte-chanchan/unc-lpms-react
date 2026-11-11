'use strict';
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('AssignmentWorkflowLogs', {
            log_id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            co_assign_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'CourseOfferingAssignments', key: 'co_assign_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            stakeholder_id: {
                type: Sequelize.STRING(20),
                allowNull: true
            },
            actor_role: {
                type: Sequelize.STRING(30),
                allowNull: false // e.g., 'PROGRAM_HEAD', 'DEAN', 'INSTRUCTOR'
            },
            action_type: {
                type: Sequelize.ENUM('ASSIGNED', 'SUBMITTED', 'RETURNED', 'ACCEPTED'),
                allowNull: false
            },
            is_viewed: {
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
        await queryInterface.dropTable('AssignmentWorkflowLogs');
    }
};
