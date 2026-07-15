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
    };

    return CourseOutcome;
};
