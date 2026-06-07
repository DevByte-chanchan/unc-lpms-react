'use strict';
module.exports = (sequelize, DataTypes) => {
    const Course = sequelize.define('Course', {
        course_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        course_no: {
            type: DataTypes.STRING(20), // FIXED: Was INTEGER, mismatched with migration/seeder strings
            allowNull: false
        },
        course_title: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        credit: {
            type: DataTypes.STRING(30), // UPDATED: Changed from INTEGER to support structured string formats
            allowNull: false
        },
        contact_hrs: {
            type: DataTypes.STRING(30), // UPDATED: Expanded from STRING(2) to support long lab/lec intervals
            allowNull: false
        },
        classification: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        cmo: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
        year_lvl: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
        term: {
            type: DataTypes.STRING(20),
            allowNull: false
        }
    }, {
        tableName: 'Courses'
    });

    Course.associate = function(models) {
        Course.hasMany(models.Prerequisite, { foreignKey: 'course_id' });
        Course.hasMany(models.ProgramCourseOffering, { foreignKey: 'course_id' });
    };

    return Course;
};