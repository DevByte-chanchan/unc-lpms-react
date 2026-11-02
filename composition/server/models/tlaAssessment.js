// models/tlaAssessment.js
module.exports = (sequelize, DataTypes) => {
    const TLAAssessment = sequelize.define('TLAAssessment', {
        method_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        tla_id: { type: DataTypes.INTEGER, allowNull: false },
        ilo_id: { type: DataTypes.INTEGER, allowNull: true },
        name: { type: DataTypes.STRING(70), allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: false },
        period: { type: DataTypes.CHAR(1), allowNull: false },
        weight: { type: DataTypes.STRING(10), allowNull: false },
        min_passing: { type: DataTypes.INTEGER, allowNull: true }
    }, { tableName: 'TLAAssessments' });

    TLAAssessment.associate = function(models) {
        TLAAssessment.belongsTo(models.TeachingAndLearningActivity, { foreignKey: 'tla_id', as: 'tla', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
        TLAAssessment.belongsTo(models.IntendedLearningOutcome, { foreignKey: 'ilo_id', as: 'ilo', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
    };

    return TLAAssessment;
};
