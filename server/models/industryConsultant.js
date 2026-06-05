/**
 * IndustryConsultant — uploaded by Program Heads.
 *
 * Columns from industry_consultants_dummy.xlsx:
 *   Name, Assigned Course
 *
 * The "Assigned Course" cell may be blank on upload; Program Heads
 * fill it in later via the assignment UI, which resolves it to a
 * CourseOffering.id.
 */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'IndustryConsultant',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      assigned_course_code: {
        type: DataTypes.STRING(16),
        allowNull: true,
        comment: 'Raw "Assigned Course" string from the Excel sheet.',
      },
      assigned_course_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        comment: 'Resolved FK to course_offerings.id.',
      },
      status: {
        type: DataTypes.STRING(16),
        allowNull: true,
        defaultValue: null,
        comment: 'Active | Unavailable — blank on upload; set during Assign.',
      },
      period_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    },
    {
      tableName: 'industry_consultants',
      timestamps: true,
    }
  );
