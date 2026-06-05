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
import CourseOfferingFactory   from './courseOffering.js';
import IndustryConsultantFactory from './industryConsultant.js';
import ConsultantCourseFactory from './consultantCourse.js';
import CourseAssignmentFactory from './courseAssignment.js';
import AcademicPeriodFactory   from './academicPeriod.js';
import CourseFactory           from './course.js';
import PrerequisiteFactory     from './prerequisite.js';
import ProgramCourseOfferingFactory from './programCourseOffering.js';

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
  CourseOffering:     CourseOfferingFactory(sequelize, DataTypes),
  IndustryConsultant: IndustryConsultantFactory(sequelize, DataTypes),
  ConsultantCourse:   ConsultantCourseFactory(sequelize, DataTypes),
  CourseAssignment:   CourseAssignmentFactory(sequelize, DataTypes),
  Course:                 CourseFactory(sequelize, DataTypes),
  Prerequisite:           PrerequisiteFactory(sequelize, DataTypes),
  ProgramCourseOffering:  ProgramCourseOfferingFactory(sequelize, DataTypes),
  sequelize,
};

// Every resource that gets uploaded is scoped to a period.
db.AcademicPeriod.hasMany(db.Department,         { foreignKey: 'period_id' });
db.AcademicPeriod.hasMany(db.Faculty,            { foreignKey: 'period_id' });
db.AcademicPeriod.hasMany(db.Program,            { foreignKey: 'period_id' });
db.AcademicPeriod.hasMany(db.CourseOffering,     { foreignKey: 'period_id' });
db.AcademicPeriod.hasMany(db.IndustryConsultant, { foreignKey: 'period_id' });
db.AcademicPeriod.hasMany(db.CourseAssignment,   { foreignKey: 'period_id' });
db.AcademicPeriod.hasMany(db.Course,             { foreignKey: 'period_id' });
db.Department.belongsTo(db.AcademicPeriod,         { foreignKey: 'period_id', as: 'period' });
db.Faculty.belongsTo(db.AcademicPeriod,            { foreignKey: 'period_id', as: 'period' });
db.Program.belongsTo(db.AcademicPeriod,            { foreignKey: 'period_id', as: 'period' });
db.CourseOffering.belongsTo(db.AcademicPeriod,     { foreignKey: 'period_id', as: 'period' });
db.IndustryConsultant.belongsTo(db.AcademicPeriod, { foreignKey: 'period_id', as: 'period' });
db.CourseAssignment.belongsTo(db.AcademicPeriod,   { foreignKey: 'period_id', as: 'period' });
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

// A Faculty member can teach many CourseOfferings (as the instructor).
db.Faculty.hasMany(db.CourseOffering, { foreignKey: 'instructor_id', as: 'courses' });
db.CourseOffering.belongsTo(db.Faculty, { foreignKey: 'instructor_id', as: 'instructor' });

// An IndustryConsultant may be assigned to one CourseOffering at a time
// (assigned_course_id may be null until a Program Head assigns them).
// Legacy: superseded by the consultant_courses join table below, but
// kept so existing data and the `assignedCourse` include keep working.
db.CourseOffering.hasMany(db.IndustryConsultant, { foreignKey: 'assigned_course_id', as: 'consultants' });
db.IndustryConsultant.belongsTo(db.CourseOffering, { foreignKey: 'assigned_course_id', as: 'assignedCourse' });

// An IndustryConsultant may be assigned MANY CourseOfferings via the
// consultant_courses join table. This is the authoritative relationship.
db.IndustryConsultant.belongsToMany(db.CourseOffering, {
  through: db.ConsultantCourse, foreignKey: 'consultant_id', otherKey: 'course_offering_id', as: 'courses',
});
db.IndustryConsultant.hasMany(db.ConsultantCourse, { foreignKey: 'consultant_id', as: 'courseLinks' });
db.ConsultantCourse.belongsTo(db.IndustryConsultant, { foreignKey: 'consultant_id', as: 'consultant' });
db.ConsultantCourse.belongsTo(db.CourseOffering, { foreignKey: 'course_offering_id', as: 'courseOffering' });

// A CourseAssignment resolves to one Faculty from the period's master list
// (may be null until matched).
//
// NOTE: course_offering_id intentionally has NO belongsTo(CourseOffering)
// association. The importer stores a CATALOG course_id (from `courses`) there,
// not a course_offerings.id, so a real cross-table FK would (and did) reject
// valid rows. The boot helper relaxCourseAssignmentOfferingFk() drops any FK
// that previous syncs left on that column. Treat it as a loose resolved id.
db.CourseAssignment.belongsTo(db.Faculty, { foreignKey: 'faculty_id', as: 'faculty' });

// --- Curriculum catalog (period-scoped; each term owns its own copy) ---
// Self-referencing prerequisites: a Course requires many Courses, via the
// Prerequisite bridge (course_id → course_prerequisite_id).
db.Course.belongsToMany(db.Course, {
  through: db.Prerequisite, as: 'prerequisites',
  foreignKey: 'course_id', otherKey: 'course_prerequisite_id',
});
// A Course has many curriculum revisions (descriptions).
db.Course.hasMany(db.ProgramCourseOffering, { foreignKey: 'course_id', as: 'revisions' });
db.ProgramCourseOffering.belongsTo(db.Course, { foreignKey: 'course_id', as: 'course' });

export default db;
