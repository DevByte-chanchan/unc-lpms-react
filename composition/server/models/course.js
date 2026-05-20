'use strict';
module.exports = (sequelize, DataTypes) => {
    const Course = sequelize.define('Course', {
        course_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        course_no: { type: DataTypes.INTEGER, allowNull: false },
        course_title: { type: DataTypes.STRING(100), allowNull: false },
        credit: { type: DataTypes.INTEGER, allowNull: false },
        contact_hrs: { type: DataTypes.STRING(2), allowNull: false },
        classification: { type: DataTypes.STRING(50), allowNull: false },
        cmo: { type: DataTypes.STRING(20), allowNull: false },
        year_lvl: { type: DataTypes.STRING(20), allowNull: false },
        term: { type: DataTypes.STRING(20), allowNull: false }
    }, {
        tableName: 'Courses'
    });

    Course.associate = function(models) {
        Course.hasMany(models.Prerequisite, { foreignKey: 'course_id' });
        Course.hasMany(models.ProgramCourseOffering, { foreignKey: 'course_id' });
    };

    return Course;
};
