'use strict';
module.exports = (sequelize, DataTypes) => {
    const CourseOutcome = sequelize.define('CourseOutcome', {
        co_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        pc_offering_id: { type: DataTypes.INTEGER, allowNull: false },
        co_description: { type: DataTypes.STRING(500), allowNull: false }
    }, {
        tableName: 'CourseOutcomes'
    });

    CourseOutcome.associate = function(models) {
        CourseOutcome.belongsTo(models.ProgramCourseOffering, { foreignKey: 'pc_offering_id' });
        CourseOutcome.hasMany(models.ProgramOutcomeAlignment, { foreignKey: 'co_id' });
        CourseOutcome.hasMany(models.IntendedLearningOutcome, { foreignKey: 'co_id', as: 'ilos', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
        CourseOutcome.hasMany(models.Week, { foreignKey: 'co_id', as: 'weeks', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
    };

    return CourseOutcome;
};
