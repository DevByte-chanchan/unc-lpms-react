module.exports = (sequelize, DataTypes) => {
    const IntendedLearningOutcome = sequelize.define('IntendedLearningOutcome', {
        ilo_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        co_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        description: {
            type: DataTypes.STRING(500),
            allowNull: false
        },
        hours: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        weeks: {
            type: DataTypes.DECIMAL(4, 2),
            allowNull: true
        },
        assessment_tool: {
            type: DataTypes.STRING(200),
            allowNull: true
        },
        is_orientation: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: true,
        },
    }, {
        tableName: 'IntendedLearningOutcomes'
    });

    IntendedLearningOutcome.associate = function(models) {
        IntendedLearningOutcome.belongsTo(models.CourseOutcome, { foreignKey: 'co_id', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
        IntendedLearningOutcome.hasMany(models.TLAAssessment, { foreignKey: 'ilo_id', as: 'tlaAssessments', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
    };

    return IntendedLearningOutcome;
};
