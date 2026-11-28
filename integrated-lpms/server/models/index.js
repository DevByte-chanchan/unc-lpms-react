'use strict';

const { Sequelize, DataTypes } = require('sequelize');
const { getConfig } = require('../config/database');

const cfg = getConfig();
const sequelize = new Sequelize(cfg.database, cfg.username, cfg.password, {
  host: cfg.host,
  port: cfg.port,
  dialect: cfg.dialect,
  logging: cfg.logging,
  pool: cfg.pool,
  timezone: cfg.timezone,
});

const coreOrg = require('./coreOrg')(sequelize, DataTypes);
const syllabusCore = require('./syllabusCore')(sequelize, DataTypes);
const courseAssignmentExtras = require('./courseAssignmentExtras')(sequelize, DataTypes);
const submissionsExtras = require('./submissionsExtras')(sequelize, DataTypes);

const db = {
  ...coreOrg,
  ...syllabusCore,
  ...courseAssignmentExtras,
  ...submissionsExtras,
  sequelize,
  Sequelize,
};

// ============================================================
// UNIFIED ASSOCIATIONS (All 3 Modules — Zero Naming Conflicts)
// ============================================================

// Organizational Hierarchy
db.AcademicPeriod.hasMany(db.Department, { foreignKey: 'academic_period_id', as: 'departments' });
db.Department.belongsTo(db.AcademicPeriod, { foreignKey: 'academic_period_id', as: 'period' });
db.Department.belongsTo(db.User, { foreignKey: 'stakeholder_id', as: 'deanUser', constraints: false });

db.Department.hasMany(db.Program, { foreignKey: 'dept_id', as: 'programs' });
db.Program.belongsTo(db.Department, { foreignKey: 'dept_id', as: 'department' });
db.Program.belongsTo(db.Faculty, { foreignKey: 'program_head_id', as: 'programHeadFaculty', constraints: false });
db.Program.belongsTo(db.User, { foreignKey: 'stakeholder_id', as: 'programHeadUser', constraints: false });

db.Department.hasMany(db.Faculty, { foreignKey: 'department_id', as: 'facultyMembers' });
db.Faculty.belongsTo(db.Department, { foreignKey: 'department_id', as: 'departmentRef', constraints: false });

db.User.belongsTo(db.Faculty, { foreignKey: 'faculty_id', as: 'faculty', constraints: false });
db.User.belongsTo(db.IndustryConsultant, { foreignKey: 'industry_consultant_id', as: 'consultant', constraints: false });

// Courses & Prerequisites
db.Course.hasMany(db.Prerequisite, { foreignKey: 'course_id', as: 'prerequisites' });
db.Prerequisite.belongsTo(db.Course, { foreignKey: 'course_id', as: 'course' });
db.Prerequisite.belongsTo(db.Course, { foreignKey: 'prerequisite_course_id', as: 'prerequisiteCourse' });
db.Prerequisite.belongsTo(db.Course, { foreignKey: 'prerequisite_course_id', as: 'PrereqCourse', constraints: false });

// ProgramCourseOfferings & Version Lineage
db.ProgramCourseOffering.belongsTo(db.Course, { foreignKey: 'course_id', as: 'course' });
db.ProgramCourseOffering.belongsTo(db.Course, { foreignKey: 'course_id', as: 'Course', constraints: false });
db.Course.hasMany(db.ProgramCourseOffering, { foreignKey: 'course_id', as: 'offerings' });

db.ProgramCourseOffering.belongsTo(db.Program, { foreignKey: 'program_id', as: 'program' });
db.ProgramCourseOffering.belongsTo(db.Program, { foreignKey: 'program_id', as: 'Program', constraints: false });
db.Program.hasMany(db.ProgramCourseOffering, { foreignKey: 'program_id', as: 'offerings' });

db.ProgramCourseOffering.belongsTo(db.Department, { foreignKey: 'dept_id', as: 'department' });
db.ProgramCourseOffering.belongsTo(db.Department, { foreignKey: 'dept_id', as: 'Department', constraints: false });
db.ProgramCourseOffering.belongsTo(db.AcademicPeriod, { foreignKey: 'academic_period_id', as: 'period', constraints: false });
db.ProgramCourseOffering.belongsTo(db.ProgramCourseOffering, { foreignKey: 'base_pc_offering_id', as: 'baseOffering', constraints: false });

// CourseOfferingAssignments & Workflow Logs
db.ProgramCourseOffering.hasMany(db.CourseOfferingAssignment, { foreignKey: 'pc_offering_id', as: 'assignments' });
db.CourseOfferingAssignment.belongsTo(db.ProgramCourseOffering, { foreignKey: 'pc_offering_id', as: 'offering' });
db.CourseOfferingAssignment.belongsTo(db.ProgramCourseOffering, { foreignKey: 'pc_offering_id', as: 'ProgramCourseOffering', constraints: false });
db.CourseOfferingAssignment.belongsTo(db.Course, { foreignKey: 'course_id', as: 'course', constraints: false });
db.CourseOfferingAssignment.belongsTo(db.Program, { foreignKey: 'program_id', as: 'program', constraints: false });
db.CourseOfferingAssignment.belongsTo(db.Faculty, { foreignKey: 'faculty_id', as: 'leadFaculty', constraints: false });
db.CourseOfferingAssignment.belongsTo(db.User, { foreignKey: 'stakeholder_id', as: 'instructorUser', constraints: false });
db.CourseOfferingAssignment.belongsTo(db.AcademicPeriod, { foreignKey: 'academic_period_id', as: 'period', constraints: false });

db.CourseOfferingAssignment.hasMany(db.AssignmentWorkflowLog, { foreignKey: 'co_assign_id', as: 'logs' });
db.CourseOfferingAssignment.hasMany(db.AssignmentWorkflowLog, { foreignKey: 'co_assign_id', as: 'workflowLogs', constraints: false });
db.AssignmentWorkflowLog.belongsTo(db.CourseOfferingAssignment, { foreignKey: 'co_assign_id', as: 'assignment' });

// Outcomes & COAEP
db.ProgramCourseOffering.hasMany(db.CourseOutcome, { foreignKey: 'pc_offering_id', as: 'courseOutcomes' });
db.ProgramCourseOffering.hasMany(db.CourseOutcome, { foreignKey: 'pc_offering_id', as: 'CourseOutcomes', constraints: false });
db.CourseOutcome.belongsTo(db.ProgramCourseOffering, { foreignKey: 'pc_offering_id', as: 'offering' });
db.CourseOutcome.belongsTo(db.ProgramCourseOffering, { foreignKey: 'pc_offering_id', as: 'ProgramCourseOffering', constraints: false });

db.Program.hasMany(db.ProgramOutcome, { foreignKey: 'program_id', as: 'programOutcomes' });
db.ProgramOutcome.belongsTo(db.Program, { foreignKey: 'program_id', as: 'program' });

db.Program.hasMany(db.ProgramEducationalObjective, { foreignKey: 'program_id', as: 'peos' });
db.ProgramEducationalObjective.belongsTo(db.Program, { foreignKey: 'program_id', as: 'program' });

db.CourseOutcome.hasMany(db.ProgramOutcomeAlignment, { foreignKey: 'co_id', as: 'poAlignments' });
db.ProgramOutcomeAlignment.belongsTo(db.CourseOutcome, { foreignKey: 'co_id', as: 'courseOutcome' });
db.ProgramOutcomeAlignment.belongsTo(db.ProgramOutcome, { foreignKey: 'po_id', as: 'programOutcome' });

db.CourseOutcome.hasMany(db.IntendedLearningOutcome, { foreignKey: 'co_id', as: 'ilos' });
db.IntendedLearningOutcome.belongsTo(db.CourseOutcome, { foreignKey: 'co_id', as: 'courseOutcome' });

// Weekly Content Mapping (Composition Core + CoW)
db.CourseOutcome.hasMany(db.Week, { foreignKey: 'co_id', as: 'weeks' });
db.Week.belongsTo(db.CourseOutcome, { foreignKey: 'co_id', as: 'courseOutcome' });

db.Topic.belongsTo(db.Course, { foreignKey: 'course_id', as: 'course', constraints: false });
db.Topic.belongsTo(db.Topic, { foreignKey: 'parent_topic_id', as: 'parentTopic', constraints: false });
db.Topic.hasMany(db.Subtopic, { foreignKey: 'topic_id', as: 'subtopics', onDelete: 'CASCADE' });

db.Subtopic.belongsTo(db.Topic, { foreignKey: 'topic_id', as: 'topic' });
db.Subtopic.belongsTo(db.Week, { foreignKey: 'week_id', as: 'week' });
db.Subtopic.belongsTo(db.Subtopic, { foreignKey: 'parent_subtopic_id', as: 'parentSubtopic', constraints: false });
db.Week.hasMany(db.Subtopic, { foreignKey: 'week_id', as: 'subtopics' });

db.Week.hasMany(db.TeachingAndLearningActivity, { foreignKey: 'week_id', as: 'tlas' });
db.TeachingAndLearningActivity.belongsTo(db.Week, { foreignKey: 'week_id', as: 'week' });

db.TeachingAndLearningActivity.hasMany(db.TLAAssessment, { foreignKey: 'tla_id', as: 'assessments', onDelete: 'CASCADE' });
db.TLAAssessment.belongsTo(db.TeachingAndLearningActivity, { foreignKey: 'tla_id', as: 'tla' });
db.TLAAssessment.belongsTo(db.IntendedLearningOutcome, { foreignKey: 'ilo_id', as: 'ilo', constraints: false });

// References & Filing (Unified M2 + M3)
db.Reference.belongsTo(db.Course, { foreignKey: 'course_id', as: 'course', constraints: false });
db.Reference.belongsTo(db.Reference, { foreignKey: 'parent_reference_id', as: 'parentReference', constraints: false });
db.Reference.hasMany(db.WeeklyReference, { foreignKey: 'reference_id', as: 'weeklyReferences' });

db.Week.hasMany(db.WeeklyReference, { foreignKey: 'week_id', as: 'weeklyReferences' });
db.WeeklyReference.belongsTo(db.Week, { foreignKey: 'week_id', as: 'week' });
db.WeeklyReference.belongsTo(db.Reference, { foreignKey: 'reference_id', as: 'reference' });
db.WeeklyReference.belongsTo(db.Reference, { foreignKey: 'reference_id', as: 'Reference', constraints: false });

db.CourseReference.belongsTo(db.Course, { foreignKey: 'course_id', as: 'course', constraints: false });
db.CourseReference.belongsTo(db.Reference, { foreignKey: 'reference_id', as: 'reference', constraints: false });

// Comments & Targets
db.CourseOfferingAssignment.hasMany(db.Comment, { foreignKey: 'co_assign_id', as: 'comments' });
db.Comment.belongsTo(db.CourseOfferingAssignment, { foreignKey: 'co_assign_id', as: 'assignment' });
db.Comment.belongsTo(db.Week, { foreignKey: 'week_id', as: 'week', constraints: false });
db.Comment.hasMany(db.CommentTarget, { foreignKey: 'comment_id', as: 'targets', onDelete: 'CASCADE' });
db.CommentTarget.belongsTo(db.Comment, { foreignKey: 'comment_id', as: 'comment' });

// Consultants
db.IndustryConsultant.hasMany(db.ConsultantCourse, { foreignKey: 'industry_consultant_id', as: 'consultantCourses', onDelete: 'CASCADE' });
db.ConsultantCourse.belongsTo(db.IndustryConsultant, { foreignKey: 'industry_consultant_id', as: 'consultant' });
db.ConsultantCourse.belongsTo(db.Course, { foreignKey: 'course_id', as: 'course', constraints: false });

db.CourseConsultant.belongsTo(db.Course, { foreignKey: 'course_id', as: 'course', constraints: false });
db.CourseConsultant.belongsTo(db.User, { foreignKey: 'consultant_user_id', as: 'consultantUser', constraints: false });

db.TitleRequest.belongsTo(db.User, { foreignKey: 'requested_by', as: 'requester', constraints: false });
db.TitleRequest.belongsTo(db.Reference, { foreignKey: 'reference_id', as: 'fulfilledReference', constraints: false });

module.exports = db;
