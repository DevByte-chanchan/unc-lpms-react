'use strict';
// A consultant assigned to a course by the Program Head. Deactivated, never deleted.
module.exports = (sequelize, DataTypes) => {
    const CourseConsultant = sequelize.define('CourseConsultant', {
        course_consultant_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        course_id: { type: DataTypes.INTEGER, allowNull: false },
        consultant_user_id: { type: DataTypes.INTEGER, allowNull: false },
        assigned_by_user_id: { type: DataTypes.INTEGER, allowNull: true },
        is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        deactivated_at: { type: DataTypes.DATE, allowNull: true },
        deactivated_by_user_id: { type: DataTypes.INTEGER, allowNull: true }
    }, { tableName: 'CourseConsultants' });
    return CourseConsultant;
};
