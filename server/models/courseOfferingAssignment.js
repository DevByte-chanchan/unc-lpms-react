'use strict';
module.exports = (sequelize, DataTypes) => {
    const CourseOfferingAssignment = sequelize.define('CourseOfferingAssignment', {
        co_assign_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        pc_offering_id: { type: DataTypes.INTEGER, allowNull: false },
        stakeholder_id: { type: DataTypes.STRING(20) }, // plain attribute (lpms_users)
        date_assigned: { type: DataTypes.DATE },
        date_submitted: { type: DataTypes.DATE },
        date_updated: { type: DataTypes.DATE },
        ph_date_returned: { type: DataTypes.DATE },
        ic_date_returned: { type: DataTypes.DATE },
        ld_date_returned: { type: DataTypes.DATE },
        d_date_returned: { type: DataTypes.DATE },
        ph_date_accepted: { type: DataTypes.DATE },
        ld_date_accepted: { type: DataTypes.DATE },
        ic_date_accepted: { type: DataTypes.DATE },
        d_date_accepted: { type: DataTypes.DATE }
    }, {
        tableName: 'CourseOfferingAssignments'
    });

    CourseOfferingAssignment.associate = function(models) {
        CourseOfferingAssignment.belongsTo(models.ProgramCourseOffering, { foreignKey: 'pc_offering_id' });
    };

    return CourseOfferingAssignment;
};
