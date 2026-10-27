'use strict';
// One reminder the system sent. The unique key (subject, kind, day) is what stops a reminder going
// out twice: "offering:12", "before-3", "2026-11-02".
module.exports = (sequelize, DataTypes) => {
    const ReminderLog = sequelize.define('ReminderLog', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        subject: { type: DataTypes.STRING(60), allowNull: false },
        kind: { type: DataTypes.STRING(30), allowNull: false },
        day: { type: DataTypes.DATEONLY, allowNull: false }
    }, { tableName: 'ReminderLog', updatedAt: false });
    return ReminderLog;
};
