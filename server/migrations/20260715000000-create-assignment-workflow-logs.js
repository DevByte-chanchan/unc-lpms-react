'use strict';
module.exports = {
    async up(queryInterface, Sequelize) {
        // Guard: skip if the table already exists (idempotent).
        const tables = await queryInterface.showAllTables();
        const has = tables.map(t => (typeof t === 'string' ? t : t.tableName)).includes('AssignmentWorkflowLogs');
        if (has) return;

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
            actor_role: {
                type: Sequelize.STRING(30),
                allowNull: false // e.g., 'PROGRAM_HEAD', 'DEAN', 'INSTRUCTOR', 'INDUSTRY_CONSULTANT'
            },
            action_type: {
                type: Sequelize.ENUM('ASSIGNED', 'SUBMITTED', 'RETURNED', 'ACCEPTED'),
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
        await queryInterface.dropTable('AssignmentWorkflowLogs');
    }
};
