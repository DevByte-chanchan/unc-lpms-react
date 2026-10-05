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
        // Introductory / Enabling / Demonstrative; null for orientation ILOs.
        ied_level: {
            type: DataTypes.ENUM('I', 'E', 'D'),
            allowNull: true
        },
        // COAEP performance target: % of students at >= % of the total score.
        target_students_percent: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 90
        },
        target_score_percent: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 60
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