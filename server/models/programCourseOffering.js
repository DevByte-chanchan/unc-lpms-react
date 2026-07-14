/**
 * ProgramCourseOffering — the associative entity resolving Program ⇄ Course.
 *
 * A course and a program are many-to-many: one course (say GE 101) is offered
 * by several programs, which may sit in different departments. Each row here is
 * ONE such offering — "GE 101, as offered by BSIT".
 *
 *   pc_offering_id     surrogate PK
 *   course_id          FK → courses      ┐ together these are the real key:
 *   program_id         FK → programs     ┘ one offering per (course, program)
 *   revision_number    which curriculum revision this offering is at (attribute,
 *                      NOT part of the key — the key is the course×program pair)
 *   course_description this offering's description text
 *
 * An offering owns exactly one syllabus (composed in another module) and has
 * exactly one CourseOfferingAssignment — the faculty who teaches it. See models/index.js.
 *
 * No dept_id: a program belongs to exactly one department, so the department is
 * reached through the program. A stored copy could only ever drift out of sync
 * with the program's real department.
 */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'ProgramCourseOffering',
    {
      pc_offering_id:  { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true, field: 'program_course_offering_id' },
      course_id:       { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      program_id:      { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      revision_number: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      course_description: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: 'program_course_offerings',
      timestamps: true,
      indexes: [
        // The associative key. The OLD index was UNIQUE(course_id,
        // revision_number), which made the whole model impossible: BSIT and
        // BSCS both offering GE 101 at revision 1 collided on it.
        { name: 'pco_course_program_unique', unique: true, fields: ['course_id', 'program_id'] },
        { fields: ['course_id'] },
        { fields: ['program_id'] },
      ],
    }
  );
