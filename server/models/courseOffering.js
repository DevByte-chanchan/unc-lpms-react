/**
 * CourseOffering — uploaded by Program Heads.
 *
 * Spec headers : CODE, DESCRIPTION, UNITS, INSTRUCTOR
 * Sample file  : Code, Course Title, Year Level, Instructor
 *
 * The parser (utils/excelParser.js) maps either header set onto this
 * schema, so the database is the union of both. `year_level` is kept
 * because the sample data carries it; `units` is kept because the
 * spec asks for it; `course_title` is stored both as `title` and
 * aliased through `description` for the spec.
 */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'CourseOffering',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      code: {
        type: DataTypes.STRING(16),
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'From "Course Title" / "Description" header.',
      },
      year_level: {
        type: DataTypes.STRING(32),
        allowNull: true,
        comment: 'From "Year Level" header in the sample workbook.',
      },
      units: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: true,
        comment: 'From "Units" header in the spec.',
      },
      instructor_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Raw "Instructor" string as parsed from the Excel cell.',
      },
      instructor_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        comment: 'Resolved FK to faculty.id (set when validation succeeds).',
      },
      term: {
        type: DataTypes.STRING(64),
        allowNull: true,
        comment: 'From "TERM" column in the updated Excel (e.g. "1st Sem 2025-2026").',
      },
      status: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: 'Active',
        comment: 'Active | Unlisted | Cancelled — Cancelled rows sort to the end of the table.',
      },
      period_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    },
    {
      tableName: 'course_offerings',
      timestamps: true,
    }
  );
