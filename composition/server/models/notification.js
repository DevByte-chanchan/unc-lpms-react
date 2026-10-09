'use strict';
// One in-app notification for one recipient.
module.exports = (sequelize, DataTypes) => {
    const Notification = sequelize.define('Notification', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        recipient_user_id: { type: DataTypes.INTEGER, allowNull: false },
        type: { type: DataTypes.STRING(30), allowNull: false },
        offering_id: { type: DataTypes.INTEGER, allowNull: true },
        message: { type: DataTypes.STRING(200), allowNull: false },
        actor_role: { type: DataTypes.STRING(30), allowNull: true },
        is_read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        read_at: { type: DataTypes.DATE, allowNull: true }
    }, { tableName: 'Notifications', timestamps: false });
    return Notification;
};
