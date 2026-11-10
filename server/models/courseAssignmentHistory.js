/**
 * CourseAssignmentHistory — every change to who teaches a course, kept forever.
 *
 * Keyed by (period_id, program_id, course_code), NOT by the assignment's id: a
 * Course Assignment upload destroys and re-creates the whole list, so the ids
 * change every time while the course stays the same course. program_id 0 means
 * "the assignment has no program".
 *
 * Written by services/assignmentHistory.js. Deliberately:
 *   - no foreign keys — a record that outlives what it points at;
 *   - NOT part of any undo snapshot (utils/importUndo.js) — an undo is itself
 *     recorded here (action upload_undone) instead of erasing what happened.
 *
 * action: assigned · lead_changed · contributors_changed · course_changed ·
 *         removed · restored · upload_replaced · upload_undone ·
 *         official_confirmed · official_updated
 * source: manual · upload · official_match · undo
 */
export default (sequelize, DataTypes) => sequelize.define(
  'CourseAssignmentHistory',
  {
    id: {
      field: 'course_assignment_history_id',
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    period_id:   { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'academic_period_id' },
    program_id:  { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, comment: '0 = no program.' },
    course_code: { type: DataTypes.STRING(16), allowNull: false },
    course_name: { type: DataTypes.STRING(100), allowNull: true },
    action:      { type: DataTypes.STRING(32), allowNull: false },
    lead_before: { type: DataTypes.JSON, allowNull: true, comment: '{ faculty_id, faculty_name } or null' },
    lead_after:  { type: DataTypes.JSON, allowNull: true, comment: '{ faculty_id, faculty_name } or null' },
    contributors_before: { type: DataTypes.JSON, allowNull: true, comment: '[{ faculty_id, faculty_name }]' },
    contributors_after:  { type: DataTypes.JSON, allowNull: true, comment: '[{ faculty_id, faculty_name }]' },
    source:      { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'manual' },
    changed_by_account_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    note:        { type: DataTypes.STRING(255), allowNull: true },
  },
  {
    tableName: 'course_assignment_history',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { name: 'cah_course', fields: ['academic_period_id', 'program_id', 'course_code'] },
    ],
  }
);
