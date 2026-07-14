/**
 * CourseOfferingAssignment — the Course Assignment module's own record.
 *
 * Separate from Course (the curriculum catalog). Each row pairs a
 * course with an assigned faculty member and carries a validation
 * status produced by checking the data against the period's Courses
 * and Faculty:
 *
 *   Verified      — course + faculty both matched, faculty available.
 *   Pending Match — course code or faculty name not in the master lists.
 *   Flagged       — faculty matched but Inactive / On Leave (a schedule
 *                   conflict would also flag, but is not yet detectable).
 */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'CourseOfferingAssignment',
    {
      id: {
        field: 'course_offering_assignment_id',
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      course_code: {
        type: DataTypes.STRING(16),
        allowNull: false,
      },
      course_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      year_level: {
        type: DataTypes.STRING(32),
        allowNull: true,
        comment: 'Course year level (e.g. "SECOND YEAR") — from the upload column or derived from the catalog; powers the page year filter.',
      },
      course_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        comment: 'Resolved FK to courses.course_id; null if the code was unmatched.',
      },
      // The offering this assignment fills — "GE 101 as offered by BSIT".
      // Offering ↔ assignment is ONE-TO-ONE (enforced by the unique index
      // below): an offering owns one syllabus, taught by one lead faculty.
      //
      // Nullable on purpose, unlike the ERD's NOT NULL: an uploaded row whose
      // course code doesn't match the catalog has no course, therefore no
      // offering, and must still be storable so the user can reconcile it —
      // that is exactly what status 'Pending Match' means. NOT NULL here would
      // make the module's own default status impossible to represent. MySQL
      // permits many NULLs in a unique index, so the 1:1 and the unmatched
      // state coexist without compromise.
      pc_offering_id: {
        field: 'program_course_offering_id',
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        comment: 'FK to program_course_offerings — the (course × program) offering this assignment fills. 1:1.',
      },
      // The program this assignment belongs to. Redundant once pc_offering_id
      // resolves (the offering knows its program), but an UNMATCHED row has no
      // offering and still belongs to the Program Head who uploaded it — this
      // is what keeps such a row attributable.
      program_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        comment: 'FK to programs.id — which program this assignment is for (survives an unmatched course code).',
      },
      faculty_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      faculty_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        comment: 'Resolved FK to faculty.id (null if the name was unmatched). This is the LEAD faculty.',
      },
      contributors: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: null,
        comment:
          'Co-teachers (non-lead), as a JSON array of { faculty_id, faculty_name }. ' +
          'Purely informational: contributors NEVER affect status (which mirrors the LEAD only) ' +
          'and never create extra rows — one assignment is still one row per course.',
      },
      status: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: 'Pending Match',
        comment: 'Verified | Pending Match | Flagged',
      },
      date_assigned: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the course offering was assigned to the faculty (stakeholder). Stamped whenever a faculty is assigned.',
      },
      date_submitted: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the assigned faculty submitted their requirement for this course.',
      },
      date_updated: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the submission was last revised.',
      },
      period_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'academic_period_id' },
    },
    {
      tableName: 'course_offering_assignments',
      timestamps: true,
      indexes: [
        // Enforces offering ↔ assignment 1:1. NULLs are exempt in MySQL, so
        // any number of unmatched ("Pending Match") rows still coexist.
        // `fields` are COLUMN names, not model attributes — hence the renamed column.
        { name: 'ca_offering_unique', unique: true, fields: ['program_course_offering_id'] },
      ],
    }
  );
