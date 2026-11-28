'use strict';

/**
 * Migration 001 — Ordered Unified Superset Schema Creation (48 Tables, MySQL 8.0)
 * Creates every table in strict foreign-key dependency order with zero dropped attributes
 * across Course Assignment (M1), Learning Plan Composition (M2), and Submissions Management (M3).
 */

const ORDERED_MODELS = [
  // Layer 1: Independent root entities
  'AcademicPeriod',
  'User',
  'UniversityStatement',
  'DepartmentStatement',
  'FormSetting',
  'CatalogSetting',
  'SchoolCalendar',
  'AuditLog',
  'ReminderLog',

  // Layer 2: Institutional hierarchy
  'Department',
  'Faculty',
  'Program',
  'Course',
  'Prerequisite',
  'IndustryConsultant',
  'ConsultantCourse',
  'CourseConsultant',

  // Layer 3: Program-level alignment & documents
  'ProgramEducationalObjective',
  'ProgramOutcome',
  'ProgramFrontPage',
  'TermDeadline',
  'OfficialOffering',
  'CurriculumDocument',
  'ImportBatch',

  // Layer 4: Offerings & Assignments
  'ProgramCourseOffering',
  'CourseOfferingAssignment',
  'AssignmentWorkflowLog',
  'CourseAssignmentHistory',
  'CourseDocument',
  'ReviewRecordSnapshot',
  'PlanReturnSnapshot',
  'ReminderPause',
  'ConsultantSignoff',

  // Layer 5: Outcomes, ILOs, Weeks & Weekly Content Mapping
  'CourseOutcome',
  'ProgramOutcomeAlignment',
  'IntendedLearningOutcome',
  'Week',
  'Topic',
  'Subtopic',
  'TeachingAndLearningActivity',
  'TLAAssessment',

  // Layer 6: Academic References & Filing
  'Reference',
  'WeeklyReference',
  'CourseReference',
  'TitleRequest',

  // Layer 7: Review Comments & Notifications / Invitations
  'Comment',
  'CommentTarget',
  'Notification',
  'AccountInvitation',
  'PasswordReset',
  'AccountNotice',
  'DeadlineReminder',
];

async function up({ context: { db } }) {
  await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  try {
    for (const modelName of ORDERED_MODELS) {
      const model = db[modelName];
      if (!model) throw new Error(`Missing model in db registry: ${modelName}`);
      await model.sync();
    }

    // Add key performance & uniqueness indexes safely
    const safeIndex = async (sql) => {
      try {
        await db.sequelize.query(sql);
      } catch (err) {
        if (!/Duplicate key name|already exists/i.test(err.message)) {
          throw err;
        }
      }
    };

    await safeIndex('CREATE INDEX idx_pco_course_prog_period ON ProgramCourseOfferings (course_id, program_id, academic_period_id)');
    await safeIndex('CREATE INDEX idx_coa_period_prog ON CourseOfferingAssignments (academic_period_id, program_id)');
    await safeIndex('CREATE INDEX idx_coa_stakeholder ON CourseOfferingAssignments (stakeholder_id)');
    await safeIndex('CREATE INDEX idx_awl_assign_created ON AssignmentWorkflowLogs (co_assign_id, createdAt)');
    await safeIndex('CREATE INDEX idx_comments_assign_week ON Comments (co_assign_id, week_id, comment_for)');
    await safeIndex('CREATE INDEX idx_notif_recipient_read ON Notifications (recipient_user_id, is_read)');
    await safeIndex('CREATE INDEX idx_dept_code_period ON Departments (code, academic_period_id)');
    await safeIndex('CREATE INDEX idx_prog_code_period ON Programs (code, academic_period_id)');
  } finally {
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  }
}

async function down({ context: { db } }) {
  await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  try {
    for (const modelName of [...ORDERED_MODELS].reverse()) {
      const model = db[modelName];
      if (model) await model.drop();
    }
  } finally {
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  }
}

module.exports = { up, down };
