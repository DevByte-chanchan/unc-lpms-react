'use strict';
// One audited event. Append-only (see the migration's triggers).
module.exports = (sequelize, DataTypes) => {
    const AuditLog = sequelize.define('AuditLog', {
        audit_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        actor_user_id: { type: DataTypes.INTEGER, allowNull: true },
        actor_name: { type: DataTypes.STRING(120), allowNull: true },
        actor_role: { type: DataTypes.STRING(40), allowNull: true },
        action: { type: DataTypes.STRING(200), allowNull: false },
        entity_type: { type: DataTypes.STRING(60), allowNull: true },
        entity_id: { type: DataTypes.STRING(60), allowNull: true },
        outcome: { type: DataTypes.STRING(20), allowNull: false },
        details: { type: DataTypes.TEXT, allowNull: true },
        ip_address: { type: DataTypes.STRING(64), allowNull: true }
    }, { tableName: 'AuditLogs', updatedAt: false });
    return AuditLog;
};
