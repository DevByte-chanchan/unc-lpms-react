// models/intendedLearningOutcome.js
module.exports = (sequelize, DataTypes) => {
    const IntendedLearningOutcome = sequelize.define('IntendedLearningOutcome', {
        ilo_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        co_id: { type: DataTypes.INTEGER, allowNull: false },
        description: { type: DataTypes.STRING(100), allowNull: false },
        hours: { type: DataTypes.INTEGER, allowNull: false },
        grade_period: { type: DataTypes.CHAR(1), allowNull: true },
        grade_weight: { type: DataTypes.STRING(10), allowNull: true },
        min_passing: { type: DataTypes.INTEGER, allowNull: true },
    }, { tableName: 'IntendedLearningOutcomes' });
    return IntendedLearningOutcome;
};
