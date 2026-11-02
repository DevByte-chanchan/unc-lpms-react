'use strict';
module.exports = (sequelize, DataTypes) => {
    const WeeklyReference = sequelize.define('WeeklyReference', {
        weekly_reference_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        week_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        reference_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        is_orientation: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }
    }, {
        tableName: 'WeeklyReferences'
    });

    WeeklyReference.associate = function(models) {
        WeeklyReference.belongsTo(models.Week, { foreignKey: 'week_id', as: 'week', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
        WeeklyReference.belongsTo(models.Reference, { foreignKey: 'reference_id', as: 'Reference', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
    };

    return WeeklyReference;
};
