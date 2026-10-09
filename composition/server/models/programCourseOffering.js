'use strict';
module.exports = (sequelize, DataTypes) => {
    const ProgramCourseOffering = sequelize.define('ProgramCourseOffering', {
        pc_offering_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        // 0 = a working copy the Dean has not approved yet; the first approved revision is 1.
        revision_number: { type: DataTypes.INTEGER, defaultValue: 0 },
        school_year: { type: DataTypes.STRING(9), allowNull: true },
        semester: { type: DataTypes.STRING(10), allowNull: true },
        base_offering_id: { type: DataTypes.INTEGER, allowNull: true },
        carried_from_offering_id: { type: DataTypes.INTEGER, allowNull: true },
        approved_at: { type: DataTypes.DATE, allowNull: true },
        course_id: { type: DataTypes.INTEGER, allowNull: false },
        program_id: { type: DataTypes.INTEGER, allowNull: false },
        dept_id: { type: DataTypes.INTEGER, allowNull: false },
        course_description: { type: DataTypes.STRING(500), allowNull: false }
    }, {
        tableName: 'ProgramCourseOfferings'
    });

    ProgramCourseOffering.associate = function(models) {
        ProgramCourseOffering.belongsTo(models.Course, { foreignKey: 'course_id' });
        ProgramCourseOffering.belongsTo(models.Program, { foreignKey: 'program_id' });
        ProgramCourseOffering.belongsTo(models.Department, { foreignKey: 'dept_id' });
        ProgramCourseOffering.hasMany(models.CourseOutcome, { foreignKey: 'pc_offering_id' });
        ProgramCourseOffering.hasMany(models.CourseOfferingAssignment, { foreignKey: 'pc_offering_id', as: 'assignments' });
    };

    return ProgramCourseOffering;
};
