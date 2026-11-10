'use strict';
module.exports = (sequelize, DataTypes) => {
    const AssignmentWorkflowLog = sequelize.define('AssignmentWorkflowLog', {
        log_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        co_assign_id: { type: DataTypes.INTEGER, allowNull: false },
        stakeholder_id: { type: DataTypes.STRING(20), allowNull: true },
        actor_role: { type: DataTypes.STRING(30), allowNull: false },
        action_type: { type: DataTypes.ENUM('ASSIGNED', 'SUBMITTED', 'RETURNED', 'ACCEPTED'), allowNull: false }
    }, {
        tableName: 'AssignmentWorkflowLogs'
    });

    AssignmentWorkflowLog.associate = function(models) {
        AssignmentWorkflowLog.belongsTo(models.CourseOfferingAssignment, { foreignKey: 'co_assign_id' });
    };

    return AssignmentWorkflowLog;
};
