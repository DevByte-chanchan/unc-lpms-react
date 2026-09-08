'use strict';
module.exports = (sequelize, DataTypes) => {
    const DepartmentAcademicPeriod = sequelize.define('DepartmentAcademicPeriod', {
        department_academic_period_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        dept_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Departments', key: 'dept_id' } },
        academic_period_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'AcademicPeriods', key: 'academic_period_id' } }
    }, {
        tableName: 'DepartmentAcademicPeriods'
    });

    return DepartmentAcademicPeriod;
};
