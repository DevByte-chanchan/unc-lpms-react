/**
 * ProgramCourseOffering — curriculum revisions + description text.
 *
 *   pc_offering_id     → surrogate PK
 *   revision_number    → curriculum revision (1, 2, 3, …)
 *   course_id          → FK to Course
 *   course_description → the revision's description text
 *
 * The schema models (revision_number, pc_offering_id) as a composite key;
 * here pc_offering_id is the surrogate PK and a unique index on
 * (course_id, revision_number) enforces one description per revision.
 */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'ProgramCourseOffering',
    {
      pc_offering_id:     { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      revision_number:    { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      course_id:          { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      program_id:         { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      dept_id:            { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      course_description: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: 'program_course_offerings',
      timestamps: true,
      indexes: [{ fields: ['course_id'] }],
    }
  );
