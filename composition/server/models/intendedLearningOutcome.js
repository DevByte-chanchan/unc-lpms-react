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
            allowNull: true // Changed to nullable
        },
        weeks: {
            type: DataTypes.DECIMAL(4, 2),
            allowNull: true // Added weeks
        },
        assessment_tool: {
            type: DataTypes.STRING(200),
            allowNull: true // Added assessment tool
        },
        is_orientation:{
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: true,
        },
    }, {
        tableName: 'IntendedLearningOutcomes'
    });

    return IntendedLearningOutcome;
};