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