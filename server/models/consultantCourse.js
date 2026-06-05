/**
 * ConsultantCourse — join row linking an IndustryConsultant to a
 * CourseOffering. A consultant may be assigned many courses, so this
 * replaces the single industry_consultants.assigned_course_id column.
 *
 * `course_code` is kept alongside the FK so an unmatched code (one
 * that doesn't resolve to a CourseOffering in the period) is still
 * remembered for display.
 */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'ConsultantCourse',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      consultant_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      course_offering_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        comment: 'Resolved FK to course_offerings.id (null if the code was unmatched).',
      },
      course_code: {
        type: DataTypes.STRING(16),
        allowNull: true,
        comment: 'Raw course code, kept even when the FK could not be resolved.',
      },
    },
    {
      tableName: 'consultant_courses',
      timestamps: false,
    }
  );
