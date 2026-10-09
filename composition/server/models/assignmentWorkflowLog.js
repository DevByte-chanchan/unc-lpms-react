'use strict';
module.exports = (sequelize, DataTypes) => {
    const AssignmentWorkflowLog = sequelize.define('AssignmentWorkflowLog', {
        log_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        co_assign_id: { type: DataTypes.INTEGER, allowNull: false },
        actor_role: { type: DataTypes.STRING(30), allowNull: false },
        // Name of the signed-in user who acted; the approval screens rebuild each approver's signature from it.
        actor_name: { type: DataTypes.STRING(100), allowNull: true },
        // The account that acted, so an approval can be tied to that person's e-signature. NULL on older rows.
        actor_user_id: { type: DataTypes.INTEGER, allowNull: true },
        action_type: { type: DataTypes.ENUM('ASSIGNED', 'SUBMITTED', 'RETURNED', 'ACCEPTED'), allowNull: false },
    }, {
        tableName: 'AssignmentWorkflowLogs'
    });

    AssignmentWorkflowLog.associate = function(models) {
        models.AssignmentWorkflowLog.belongsTo(models.CourseOfferingAssignment, { foreignKey: 'co_assign_id' });
    };

    return AssignmentWorkflowLog;
};