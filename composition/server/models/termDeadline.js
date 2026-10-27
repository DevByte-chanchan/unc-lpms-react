'use strict';
// The syllabus due date for one program in one school year and semester.
module.exports = (sequelize, DataTypes) => {
    const TermDeadline = sequelize.define('TermDeadline', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        program_id: { type: DataTypes.INTEGER, allowNull: false },
        school_year: { type: DataTypes.STRING(9), allowNull: false },
        semester: { type: DataTypes.STRING(10), allowNull: false },
        syllabus_due: { type: DataTypes.DATEONLY, allowNull: false },
        set_by: { type: DataTypes.INTEGER, allowNull: true }
    }, { tableName: 'TermDeadlines' });
    return TermDeadline;
};
