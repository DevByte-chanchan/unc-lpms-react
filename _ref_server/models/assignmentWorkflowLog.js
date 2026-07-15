'use strict';
module.exports = (sequelize, DataTypes) => {
    const AssignmentWorkflowLog = sequelize.define('AssignmentWorkflowLog', {
        log_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        co_assign_id: { type: DataTypes.INTEGER, allowNull: false },
        actor_role: { type: DataTypes.STRING(30), allowNull: false },
        action_type: { type: DataTypes.ENUM('ASSIGNED', 'SUBMITTED', 'RETURNED', 'ACCEPTED'), allowNull: false },
    }, {
        tableName: 'AssignmentWorkflowLogs'
    });

    AssignmentWorkflowLog.associate = function(models) {
        models.AssignmentWorkflowLog.belongsTo(models.CourseOfferingAssignment, { foreignKey: 'co_assign_id' });
    };

    return AssignmentWorkflowLog;
};