'use strict';
module.exports = (sequelize, DataTypes) => {
    const AcademicPeriod = sequelize.define('AcademicPeriod', {
        academic_period_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        start_date: { type: DataTypes.DATEONLY, allowNull: false },
        end_date: { type: DataTypes.DATEONLY, allowNull: false },
        midterm_deadline: { type: DataTypes.DATEONLY, allowNull: true },
        finals_deadline: { type: DataTypes.DATEONLY, allowNull: true }
    }, {
        tableName: 'AcademicPeriods'
    });

    AcademicPeriod.associate = function(models) {
        AcademicPeriod.belongsToMany(models.Department, { 
            through: models.DepartmentAcademicPeriod, 
            foreignKey: 'academic_period_id', 
            otherKey: 'dept_id' 
        });
    };

    return AcademicPeriod;
};
