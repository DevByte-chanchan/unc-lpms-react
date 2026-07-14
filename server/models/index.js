/**
 * Sequelize models registry (ESM).
 *
 * Each model file in this directory exports a default factory:
 *     export default (sequelize, DataTypes) => sequelize.define(...)
 *
 * We import them explicitly (rather than dynamic fs.readdir) so the bundle
 * is deterministic and the file order is predictable.
 */
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';

import DepartmentFactory       from './department.js';
import ProgramFactory          from './program.js';
import FacultyFactory          from './faculty.js';
import IndustryConsultantFactory from './industryConsultant.js';
import ConsultantCourseFactory from './consultantCourse.js';
import CourseOfferingAssignmentFactory from './courseOfferingAssignment.js';
import AcademicPeriodFactory   from './academicPeriod.js';
import CourseFactory           from './course.js';
import PrerequisiteFactory     from './prerequisite.js';
import ProgramCourseOfferingFactory from './programCourseOffering.js';
import ImportBatchFactory      from './importBatch.js';

// --- Mirror tables (data sourced from other modules) ---
// Faculty and Department records that originate from the HR / Dean
// modules are mirrored here to keep this module's database isolated.
// They are populated through the bulk-upload endpoints used by HR
// staff and Deans.

const db = {
  AcademicPeriod:     AcademicPeriodFactory(sequelize, DataTypes),
  Department:         DepartmentFactory(sequelize, DataTypes),
  Program:            ProgramFactory(sequelize, DataTypes),
  Faculty:            FacultyFactory(sequelize, DataTypes),
  IndustryConsultant: IndustryConsultantFactory(sequelize, DataTypes),
  ConsultantCourse:   ConsultantCourseFactory(sequelize, DataTypes),
  CourseOfferingAssignment:   CourseOfferingAssignmentFactory(sequelize, DataTypes),
  Course:                 CourseFactory(sequelize, DataTypes),
  Prerequisite:           PrerequisiteFactory(sequelize, DataTypes),
  ProgramCourseOffering:  ProgramCourseOfferingFactory(sequelize, DataTypes),
  // Before-images of bulk uploads, so an upload can be undone for 30 seconds
  // after it lands (UNDO_WINDOW_MS in utils/importUndo.js).
  // Deliberately NOT associated to AcademicPeriod: a batch must outlive the
  // rows it describes, and a cascading delete would take the undo with them.
  ImportBatch:            ImportBatchFactory(sequelize, DataTypes),
  sequelize,
};

// Every resource that gets uploaded is scoped to a period.
db.AcademicPeriod.hasMany(db.Department,         { foreignKey: 'period_id' });
db.AcademicPeriod.hasMany(db.Faculty,            { foreignKey: 'period_id' });
db.AcademicPeriod.hasMany(db.Program,            { foreignKey: 'period_id' });
db.AcademicPeriod.hasMany(db.IndustryConsultant, { foreignKey: 'period_id' });
db.AcademicPeriod.hasMany(db.CourseOfferingAssignment,   { foreignKey: 'period_id' });
db.AcademicPeriod.hasMany(db.Course,             { foreignKey: 'period_id' });
db.Department.belongsTo(db.AcademicPeriod,         { foreignKey: 'period_id', as: 'period' });
db.Faculty.belongsTo(db.AcademicPeriod,            { foreignKey: 'period_id', as: 'period' });
db.Program.belongsTo(db.AcademicPeriod,            { foreignKey: 'period_id', as: 'period' });
db.IndustryConsultant.belongsTo(db.AcademicPeriod, { foreignKey: 'period_id', as: 'period' });
db.CourseOfferingAssignment.belongsTo(db.AcademicPeriod,   { foreignKey: 'period_id', as: 'period' });
db.Course.belongsTo(db.AcademicPeriod,             { foreignKey: 'period_id', as: 'period' });

// --- Associations ---
// A Department has many Faculty and many Programs.
db.Department.hasMany(db.Faculty,  { foreignKey: 'department_id', as: 'faculty' });
// `as: 'departmentRef'` avoids a naming collision with the
// free-text `department` column on the faculty table.
db.Faculty.belongsTo(db.Department, { foreignKey: 'department_id', as: 'departmentRef' });

db.Department.hasMany(db.Program, { foreignKey: 'department_id', as: 'programs' });
db.Program.belongsTo(db.Department, { foreignKey: 'department_id', as: 'department' });

// A Faculty member can head many Programs (across periods); a Program has
// one assigned head. program_head (name) is kept for display; program_head_id
// is the resolved FK, scoped to the program's own period.
db.Faculty.hasMany(db.Program,   { foreignKey: 'program_head_id', as: 'headedPrograms' });
db.Program.belongsTo(db.Faculty, { foreignKey: 'program_head_id', as: 'head' });

// An IndustryConsultant may be assigned to one catalog Course at a time
// (assigned_course_id may be null until a Program Head assigns them).
// Legacy: superseded by the consultant_courses join table below, but
// kept so existing data and the `assignedCourse` include keep working.
db.Course.hasMany(db.IndustryConsultant, { foreignKey: 'assigned_course_id', as: 'consultants' });
db.IndustryConsultant.belongsTo(db.Course, { foreignKey: 'assigned_course_id', as: 'assignedCourse' });

// An IndustryConsultant may be assigned MANY Courses via the
// consultant_courses join table. This is the authoritative relationship.
//
// No onDelete here on purpose. The two sides of the join delete differently
// (consultant_id CASCADE, course_id SET NULL) and belongsToMany can only
// express ONE rule, which it stamps on both columns — it would make the
// course side CASCADE and silently drop a consultant's assignment whenever
// the curriculum is re-uploaded. Both rules live on the columns in
// models/consultantCourse.js; see the note there.
db.IndustryConsultant.belongsToMany(db.Course, {
  through: db.ConsultantCourse, foreignKey: 'consultant_id', otherKey: 'course_id',
  as: 'courses',
});
db.IndustryConsultant.hasMany(db.ConsultantCourse, { foreignKey: 'consultant_id', as: 'courseLinks' });
db.ConsultantCourse.belongsTo(db.IndustryConsultant, { foreignKey: 'consultant_id', as: 'consultant' });
db.ConsultantCourse.belongsTo(db.Course, { foreignKey: 'course_id', as: 'course' });

// A CourseOfferingAssignment resolves to one Faculty and one catalog Course from the
// period's master lists (either may be null until matched).
//
// course_id is a REAL foreign key now. The column used to be called
// course_offering_id while holding a `courses` id, so a FK to course_offerings
// rejected valid rows and had to be dropped on every boot. With course_offerings
// dissolved, the column finally says what it means.
db.CourseOfferingAssignment.belongsTo(db.Faculty, { foreignKey: 'faculty_id', as: 'faculty' });
db.Course.hasMany(db.CourseOfferingAssignment, { foreignKey: 'course_id', as: 'assignments', onDelete: 'SET NULL' });
db.CourseOfferingAssignment.belongsTo(db.Course, { foreignKey: 'course_id', as: 'course', onDelete: 'SET NULL' });

// --- Curriculum catalog (period-scoped; each term owns its own copy) ---
// Self-referencing prerequisites: a Course requires many Courses, via the
// Prerequisite bridge (course_id → course_prerequisite_id).
db.Course.belongsToMany(db.Course, {
  through: db.Prerequisite, as: 'prerequisites',
  foreignKey: 'course_id', otherKey: 'course_prerequisite_id',
});
// --- Program ⇄ Course is MANY-TO-MANY, resolved by ProgramCourseOffering ---
// One course (GE 101) is offered by several programs, possibly in different
// departments; one program offers many courses. Each offering row is one such
// pairing, owns one syllabus, and carries its own description/revision.
db.Course.hasMany(db.ProgramCourseOffering,  { foreignKey: 'course_id',  as: 'offerings' });
db.ProgramCourseOffering.belongsTo(db.Course, { foreignKey: 'course_id',  as: 'course' });
db.Program.hasMany(db.ProgramCourseOffering, { foreignKey: 'program_id', as: 'offerings' });
db.ProgramCourseOffering.belongsTo(db.Program, { foreignKey: 'program_id', as: 'program' });

// The M:N itself, for convenience: program.getCourses() / course.getPrograms().
db.Course.belongsToMany(db.Program, {
  through: db.ProgramCourseOffering, foreignKey: 'course_id', otherKey: 'program_id', as: 'programs',
});
db.Program.belongsToMany(db.Course, {
  through: db.ProgramCourseOffering, foreignKey: 'program_id', otherKey: 'course_id', as: 'courses',
});

// --- Offering ⇄ CourseOfferingAssignment is ONE-TO-ONE ---
// An offering owns one syllabus, taught by one lead faculty — so it has at most
// one assignment (hasOne, plus the unique index on course_offering_assignments).
//
// SET NULL, not CASCADE: deleting an offering must not destroy the teaching
// assignment record. The assignment survives, unlinked, as a reconcilable row.
db.ProgramCourseOffering.hasOne(db.CourseOfferingAssignment, { foreignKey: 'pc_offering_id', as: 'assignment', onDelete: 'SET NULL' });
db.CourseOfferingAssignment.belongsTo(db.ProgramCourseOffering, { foreignKey: 'pc_offering_id', as: 'offering', onDelete: 'SET NULL' });

// An assignment also records its program directly, so an UNMATCHED row (no
// offering yet) is still attributable to the Program Head who uploaded it.
db.Program.hasMany(db.CourseOfferingAssignment, { foreignKey: 'program_id', as: 'assignments', onDelete: 'SET NULL' });
db.CourseOfferingAssignment.belongsTo(db.Program, { foreignKey: 'program_id', as: 'program', onDelete: 'SET NULL' });

export default db;
