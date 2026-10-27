'use strict';
// A plan whose automatic reminders the Program Head has paused.
module.exports = (sequelize, DataTypes) => {
    const ReminderPause = sequelize.define('ReminderPause', {
        offering_id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
        paused_by: { type: DataTypes.INTEGER, allowNull: true }
    }, { tableName: 'ReminderPauses', updatedAt: false });
    return ReminderPause;
};
