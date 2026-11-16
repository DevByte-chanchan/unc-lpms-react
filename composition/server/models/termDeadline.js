'use strict';
// The syllabus due date for one program in one school year and semester.
module.exports = (sequelize, DataTypes) => {
    const TermDeadline = sequelize.define('TermDeadline', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        program_id: { type: DataTypes.INTEGER, allowNull: false },
        school_year: { type: DataTypes.STRING(9), allowNull: false },
        semester: { type: DataTypes.STRING(10), allowNull: false },
        syllabus_due: { type: DataTypes.DATEONLY, allowNull: false },
        // Its own reminder schedule ("7,3,1,0" days before; every N days overdue). Empty: config/reminders.js.
        remind_before: { type: DataTypes.STRING(40), allowNull: true },
        overdue_every: { type: DataTypes.INTEGER, allowNull: true },
        set_by: { type: DataTypes.INTEGER, allowNull: true }
    }, { tableName: 'TermDeadlines' });
    return TermDeadline;
};
