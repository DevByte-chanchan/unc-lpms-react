'use strict';

// Who acted, by name, on each workflow log. The approval screens show a digital
// signature (name, role, date) for every approver; that used to live only in the
// browser's localStorage next to a second copy of each plan's status. The signature
// is now rebuilt from the log itself, so the log is the one source of truth.
//
// Nullable: logs written by older seeders or builds simply have no signature.
// Additive and idempotent. down() uses native DROP COLUMN (see the ILO migrations).

module.exports = {
    async up(queryInterface, Sequelize) {
        const columns = await queryInterface.describeTable('AssignmentWorkflowLogs');
        if (!columns.actor_name) {
            await queryInterface.addColumn('AssignmentWorkflowLogs', 'actor_name', {
                type: Sequelize.STRING(100),
                allowNull: true
            });
        }
    },

    async down(queryInterface) {
        const columns = await queryInterface.describeTable('AssignmentWorkflowLogs');
        if (columns.actor_name) {
            await queryInterface.sequelize.query('ALTER TABLE AssignmentWorkflowLogs DROP COLUMN actor_name;');
        }
    }
};
