module.exports = (sequelize, DataTypes) => {
    const TeachingAndLearningActivity = sequelize.define('TeachingAndLearningActivity', {
        tla_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        tla_name: {
            type: DataTypes.STRING(70),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        performed_by: {
            type: DataTypes.CHAR(1),
            allowNull: false
        },
        class_phase: {
            type: DataTypes.STRING(30),
            allowNull: false
        },
        is_lab: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }
    }, {
        tableName: 'TeachingAndLearningActivities'
    });
    return TeachingAndLearningActivity;
};