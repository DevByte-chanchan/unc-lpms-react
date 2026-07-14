/**
 * IndustryConsultant — uploaded by Program Heads.
 *
 * Columns from industry_consultants_dummy.xlsx:
 *   Name, Assigned Course
 *
 * The "Assigned Course" cell may be blank on upload; Program Heads
 * fill it in later via the assignment UI, which resolves it to a
 * courses.course_id.
 */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'IndustryConsultant',
    {
      id: {
        field: 'industry_consultant_id',
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
        comment: 'Resolved FK to courses.course_id. Legacy single-course link; consultant_courses is authoritative.',
      },
      status: {
        type: DataTypes.STRING(16),
        allowNull: true,
        defaultValue: null,
        comment: 'Active | Unavailable — auto-linked to the matched Faculty status; blank when the name is not in the Faculty list.',
      },
      // Auto-linking (status mirrors the matched Faculty member's status) runs
      // on every load — EXCEPT when the Program Head has manually set the status
      // in the Manage form, in which case this flag is true and the manual value
      // is kept verbatim (the link no longer overwrites it).
      status_overridden: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'True once a Program Head manually sets the status; stops faculty auto-linking.',
      },
      period_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'academic_period_id' },
    },
    {
      tableName: 'industry_consultants',
      timestamps: true,
    }
  );
