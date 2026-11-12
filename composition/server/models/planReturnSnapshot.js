'use strict';
// A plan's content as it was when an approver returned it (payload is JSON text; see utils/planChanges.js).
module.exports = (sequelize, DataTypes) => {
    const PlanReturnSnapshot = sequelize.define('PlanReturnSnapshot', {
        offering_id: { type: DataTypes.INTEGER, primaryKey: true },
        payload: { type: DataTypes.TEXT, allowNull: false }
    }, { tableName: 'PlanReturnSnapshots', updatedAt: false });
    return PlanReturnSnapshot;
};
