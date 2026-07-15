// models/intendedLearningOutcome.js
module.exports = (sequelize, DataTypes) => {
    const IntendedLearningOutcome = sequelize.define('IntendedLearningOutcome', {
        ilo_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        co_id: { type: DataTypes.INTEGER, allowNull: false },
        description: { type: DataTypes.STRING(500), allowNull: false },
        hours: { type: DataTypes.INTEGER, allowNull: false }
    }, { tableName: 'IntendedLearningOutcomes' });
    return IntendedLearningOutcome;
};
