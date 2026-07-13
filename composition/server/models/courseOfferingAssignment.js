'use strict';
module.exports = (sequelize, DataTypes) => {
    const CourseOfferingAssignment = sequelize.define('CourseOfferingAssignment', {
        co_assign_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        pc_offering_id: { type: DataTypes.INTEGER, allowNull: false },
        stakeholder_id: { type: DataTypes.STRING(20) },
        date_assigned: { type: DataTypes.DATE },
        date_submitted: { type: DataTypes.DATE },
        date_updated: { type: DataTypes.DATE }
    }, {
        tableName: 'CourseOfferingAssignments'
    });

    CourseOfferingAssignment.associate = function(models) {
        CourseOfferingAssignment.belongsTo(models.ProgramCourseOffering, { foreignKey: 'pc_offering_id' });
        CourseOfferingAssignment.hasMany(models.AssignmentWorkflowLog, { foreignKey: 'co_assign_id', as: 'workflowLogs' });
        CourseOfferingAssignment.hasMany(models.Comment, { foreignKey: 'co_assign_id', as: 'comments' });
    };

    return CourseOfferingAssignment;
};