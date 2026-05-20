'use strict';
module.exports = (sequelize, DataTypes) => {
    const Department = sequelize.define('Department', {
        dept_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        stakeholder_id: { type: DataTypes.INTEGER }, // plain attribute
        name: { type: DataTypes.STRING(50), allowNull: false },
        code: { type: DataTypes.STRING(10), allowNull: false }
    }, {
        tableName: 'Departments'
    });

    Department.associate = function(models) {
        Department.hasMany(models.Program, { foreignKey: 'dept_id' });
        Department.hasMany(models.ProgramCourseOffering, { foreignKey: 'dept_id' });
    };

    return Department;
};
