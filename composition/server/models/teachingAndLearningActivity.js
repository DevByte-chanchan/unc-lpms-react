module.exports = (sequelize, DataTypes) => {
    const TeachingAndLearningActivity = sequelize.define('TeachingAndLearningActivity', {
        tla_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        week_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        tla_name: {
            type: DataTypes.STRING(200),
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
        },
        is_orientation: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }
    }, {
        tableName: 'TeachingAndLearningActivities'
    });

    TeachingAndLearningActivity.associate = function(models) {
        TeachingAndLearningActivity.belongsTo(models.Week, { foreignKey: 'week_id', as: 'week', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
        TeachingAndLearningActivity.hasMany(models.TLAAssessment, { foreignKey: 'tla_id', as: 'assessments', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
    };

    return TeachingAndLearningActivity;
};
