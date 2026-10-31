'use strict';
// What an approved plan's review record is built from, frozen at approval (payload is JSON text).
module.exports = (sequelize, DataTypes) => {
    const ReviewRecordSnapshot = sequelize.define('ReviewRecordSnapshot', {
        offering_id: { type: DataTypes.INTEGER, primaryKey: true },
        payload: { type: DataTypes.TEXT, allowNull: false }
    }, { tableName: 'ReviewRecordSnapshots', updatedAt: false });
    return ReviewRecordSnapshot;
};
