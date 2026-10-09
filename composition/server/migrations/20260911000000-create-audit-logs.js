'use strict';

// Append-only record of who did what: sign-ins and every state-changing API call.
// Rows are never updated or deleted; triggers enforce that at the database level.
// Actor name and role are copied in, so the trail survives later renames or deactivation.

module.exports = {
    async up(queryInterface, Sequelize) {
        const tables = await queryInterface.showAllTables();
        if ((tables || []).map(t => (typeof t === 'string' ? t : t.tableName)).includes('AuditLogs')) return;
        await queryInterface.createTable('AuditLogs', {
            audit_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            actor_user_id: { type: Sequelize.INTEGER, allowNull: true },
            actor_name: { type: Sequelize.STRING(120), allowNull: true },
            actor_role: { type: Sequelize.STRING(40), allowNull: true },
            action: { type: Sequelize.STRING(200), allowNull: false },
            entity_type: { type: Sequelize.STRING(60), allowNull: true },
            entity_id: { type: Sequelize.STRING(60), allowNull: true },
            outcome: { type: Sequelize.STRING(20), allowNull: false },
            details: { type: Sequelize.TEXT, allowNull: true },
            ip_address: { type: Sequelize.STRING(64), allowNull: true },
            createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        });
        await queryInterface.addIndex('AuditLogs', ['createdAt'], { name: 'audit_logs_created_at' });
        await queryInterface.addIndex('AuditLogs', ['actor_user_id'], { name: 'audit_logs_actor' });
        await queryInterface.sequelize.query(
            "CREATE TRIGGER audit_logs_no_update BEFORE UPDATE ON AuditLogs BEGIN SELECT RAISE(ABORT, 'AuditLogs is append-only'); END");
        await queryInterface.sequelize.query(
            "CREATE TRIGGER audit_logs_no_delete BEFORE DELETE ON AuditLogs BEGIN SELECT RAISE(ABORT, 'AuditLogs is append-only'); END");
    },

    async down(queryInterface) {
        await queryInterface.dropTable('AuditLogs');
    }
};
