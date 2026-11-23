'use strict';
module.exports = (sequelize, DataTypes) => {
    const ProgramCourseOffering = sequelize.define('ProgramCourseOffering', {
        pc_offering_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        revision_number: { type: DataTypes.INTEGER, defaultValue: 1 },
        base_pc_offering_id: { type: DataTypes.INTEGER, allowNull: true },
        has_modifications: { type: DataTypes.BOOLEAN, defaultValue: false },
        is_revision_incremented: { type: DataTypes.BOOLEAN, defaultValue: false },
        course_id: { type: DataTypes.INTEGER, allowNull: false },
        program_id: { type: DataTypes.INTEGER, allowNull: false },
        dept_id: { type: DataTypes.INTEGER, allowNull: false },
        course_description: { type: DataTypes.TEXT, allowNull: false }
    }, {
        tableName: 'ProgramCourseOfferings'
    });

    ProgramCourseOffering.associate = function(models) {
        ProgramCourseOffering.belongsTo(models.Course, { foreignKey: 'course_id' });
        ProgramCourseOffering.belongsTo(models.Program, { foreignKey: 'program_id' });
        ProgramCourseOffering.belongsTo(models.Department, { foreignKey: 'dept_id' });
        ProgramCourseOffering.belongsTo(models.ProgramCourseOffering, { foreignKey: 'base_pc_offering_id', as: 'baseOffering' });
        ProgramCourseOffering.hasMany(models.ProgramCourseOffering, { foreignKey: 'base_pc_offering_id', as: 'derivedOfferings' });
        ProgramCourseOffering.hasMany(models.CourseOutcome, { foreignKey: 'pc_offering_id' });
        ProgramCourseOffering.hasMany(models.CourseOfferingAssignment, { foreignKey: 'pc_offering_id', as: 'assignments' });
    };

    return ProgramCourseOffering;
};
