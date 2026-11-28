'use strict';

const { normalizeReferenceType } = require('../config/referenceTypes');

module.exports = (sequelize, DataTypes) => {
  // 9. ProgramCourseOfferings
  const ProgramCourseOffering = sequelize.define('ProgramCourseOffering', {
    pc_offering_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    course_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    program_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    dept_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    academic_period_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    school_year: { type: DataTypes.STRING(20), allowNull: true },
    semester: { type: DataTypes.STRING(30), allowNull: true },
    revision_number: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    base_pc_offering_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    carried_from_offering_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    has_modifications: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    is_revision_incremented: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    approved_at: { type: DataTypes.DATE, allowNull: true },
    course_description: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'ProgramCourseOfferings',
    timestamps: true,
    getterMethods: {
      base_offering_id() { return this.getDataValue('base_pc_offering_id'); },
    },
  });

  // 10. CourseOfferingAssignments (Unified M1 + M2 + M3)
  const CourseOfferingAssignment = sequelize.define('CourseOfferingAssignment', {
    co_assign_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    pc_offering_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    course_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    program_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    academic_period_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    course_code: { type: DataTypes.STRING(32), allowNull: true },
    course_name: { type: DataTypes.STRING(150), allowNull: true },
    year_level: { type: DataTypes.STRING(32), allowNull: true },
    stakeholder_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    faculty_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    faculty_name: { type: DataTypes.STRING(150), allowNull: true },
    contributors: { type: DataTypes.JSON, allowNull: true },
    sections: { type: DataTypes.JSON, allowNull: true },
    status: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'Active' },
    date_assigned: { type: DataTypes.DATE, allowNull: true },
    date_submitted: { type: DataTypes.DATE, allowNull: true },
    date_updated: { type: DataTypes.DATE, allowNull: true },
    official_confirmed_at: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'CourseOfferingAssignments',
    timestamps: true,
    getterMethods: {
      id() { return this.getDataValue('co_assign_id'); },
      period_id() { return this.getDataValue('academic_period_id'); },
    },
  });

  // 11. AssignmentWorkflowLogs
  const AssignmentWorkflowLog = sequelize.define('AssignmentWorkflowLog', {
    log_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    co_assign_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    stakeholder_id: { type: DataTypes.STRING(20), allowNull: true },
    actor_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    actor_name: { type: DataTypes.STRING(150), allowNull: true },
    actor_role: { type: DataTypes.STRING(30), allowNull: false },
    action_type: {
      type: DataTypes.ENUM('ASSIGNED', 'SUBMITTED', 'RETURNED', 'ACCEPTED', 'APPROVED', 'FORWARDED', 'COUNTERED', 'Suggest'),
      allowNull: false,
    },
    note: { type: DataTypes.TEXT, allowNull: true },
    is_viewed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  }, {
    tableName: 'AssignmentWorkflowLogs',
    timestamps: true,
  });

  // 12. CourseOutcomes
  const CourseOutcome = sequelize.define('CourseOutcome', {
    co_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    pc_offering_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    co_description: { type: DataTypes.STRING(500), allowNull: false },
  }, {
    tableName: 'CourseOutcomes',
    timestamps: true,
  });

  // 13. ProgramOutcomes
  const ProgramOutcome = sequelize.define('ProgramOutcome', {
    po_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    program_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    description: { type: DataTypes.STRING(500), allowNull: false },
    peo_numbers: { type: DataTypes.TEXT, allowNull: false, defaultValue: '[]' },
    ga_numbers: { type: DataTypes.TEXT, allowNull: false, defaultValue: '[]' },
  }, {
    tableName: 'ProgramOutcomes',
    timestamps: true,
  });

  // 14. ProgramOutcomeAlignments
  const ProgramOutcomeAlignment = sequelize.define('ProgramOutcomeAlignment', {
    po_alignment_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    co_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    po_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    attainment_level: { type: DataTypes.CHAR(1), allowNull: false },
  }, {
    tableName: 'ProgramOutcomeAlignments',
    timestamps: true,
  });

  // 15. IntendedLearningOutcomes (Superset of M2 grading weights + M3 COAEP targets)
  const IntendedLearningOutcome = sequelize.define('IntendedLearningOutcome', {
    ilo_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    co_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    description: { type: DataTypes.STRING(500), allowNull: false },
    hours: { type: DataTypes.INTEGER, allowNull: true },
    weeks: { type: DataTypes.DECIMAL(4, 2), allowNull: true },
    assessment_tool: { type: DataTypes.STRING(200), allowNull: true },
    is_orientation: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    prelim_weight: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    midterm_weight: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    semi_weight: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    final_weight: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    target: { type: DataTypes.STRING(255), allowNull: true },
    ied_level: { type: DataTypes.ENUM('I', 'E', 'D'), allowNull: true },
    target_students_percent: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 90 },
    target_score_percent: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 60 },
  }, {
    tableName: 'IntendedLearningOutcomes',
    timestamps: true,
  });

  // 16. Weeks
  const Week = sequelize.define('Week', {
    week_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    co_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    hours: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
  }, {
    tableName: 'Weeks',
    timestamps: true,
  });

  // 17. Topics (with CoW lineage)
  const Topic = sequelize.define('Topic', {
    topic_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING(200), allowNull: false },
    course_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    parent_topic_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  }, {
    tableName: 'Topics',
    timestamps: true,
  });

  // 18. Subtopics (with CoW lineage + estimated_minutes)
  const Subtopic = sequelize.define('Subtopic', {
    subtopic_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    week_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    topic_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    title: { type: DataTypes.STRING(200), allowNull: false },
    sequence_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    is_orientation: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    parent_subtopic_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    estimated_minutes: { type: DataTypes.INTEGER, allowNull: true },
  }, {
    tableName: 'Subtopics',
    timestamps: true,
  });

  // 19. TeachingAndLearningActivities
  const TeachingAndLearningActivity = sequelize.define('TeachingAndLearningActivity', {
    tla_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    week_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    tla_name: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    performed_by: { type: DataTypes.CHAR(1), allowNull: false, defaultValue: 'T' },
    class_phase: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'inclass' },
    is_lab: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    is_orientation: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  }, {
    tableName: 'TeachingAndLearningActivities',
    timestamps: true,
  });

  // 20. TLAAssessments
  const TLAAssessment = sequelize.define('TLAAssessment', {
    method_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    tla_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    ilo_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    period: { type: DataTypes.CHAR(1), allowNull: true },
    weight: { type: DataTypes.STRING(10), allowNull: true },
    min_passing: { type: DataTypes.INTEGER, allowNull: true },
  }, {
    tableName: 'TLAAssessments',
    timestamps: true,
  });

  // 21. References (Superset of M2 CoW + M3 Library Repository, 4 canonical types)
  const Reference = sequelize.define('Reference', {
    reference_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    course_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    course_no: { type: DataTypes.STRING(32), allowNull: true },
    title: { type: DataTypes.STRING(300), allowNull: false },
    type: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'Textbook' },
    author: { type: DataTypes.STRING(255), allowNull: true },
    isbn: { type: DataTypes.STRING(100), allowNull: true },
    link: { type: DataTypes.STRING(500), allowNull: true },
    publisher: { type: DataTypes.STRING(200), allowNull: true },
    publication_year: { type: DataTypes.DATE, allowNull: true },
    copies: { type: DataTypes.INTEGER, allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'available' },
    category: { type: DataTypes.STRING(60), allowNull: true },
    date_received: { type: DataTypes.DATEONLY, allowNull: true },
    archived: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    parent_reference_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  }, {
    tableName: 'References',
    timestamps: true,
    hooks: {
      beforeValidate(row) {
        if (row.type) row.type = normalizeReferenceType(row.type);
      },
    },
  });

  // 22. WeeklyReferences
  const WeeklyReference = sequelize.define('WeeklyReference', {
    weekly_reference_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    week_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    reference_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    is_orientation: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  }, {
    tableName: 'WeeklyReferences',
    timestamps: true,
  });

  // 22b. reference_toc_cache (Additive TOC verification cache linked to References)
  const ReferenceTocCache = sequelize.define('ReferenceTocCache', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    reference_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },
    toc_status: {
      type: DataTypes.ENUM('verified', 'not_found', 'manual'),
      allowNull: false,
      defaultValue: 'not_found',
    },
    toc_source: { type: DataTypes.STRING(50), allowNull: true },
    toc_entries: { type: DataTypes.JSON, allowNull: true },
    source_url: { type: DataTypes.STRING(500), allowNull: true },
    checked_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'reference_toc_cache',
    timestamps: true,
  });

  // 23. Comments
  const Comment = sequelize.define('Comment', {
    comment_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    co_assign_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    stakeholder_id: { type: DataTypes.STRING(20), allowNull: true },
    commenter_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    commenter_name: { type: DataTypes.STRING(150), allowNull: true },
    commenter_role: { type: DataTypes.STRING(50), allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    resolved_status: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    resolved_date: { type: DataTypes.DATE, allowNull: true },
    week_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    comment_for: { type: DataTypes.STRING(30), allowNull: true },
  }, {
    tableName: 'Comments',
    timestamps: true,
  });

  // 24. CommentTargets
  const CommentTarget = sequelize.define('CommentTarget', {
    comment_target_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    comment_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    target_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  }, {
    tableName: 'CommentTargets',
    timestamps: true,
  });

  return {
    ProgramCourseOffering,
    CourseOfferingAssignment,
    AssignmentWorkflowLog,
    CourseOutcome,
    ProgramOutcome,
    ProgramOutcomeAlignment,
    IntendedLearningOutcome,
    Week,
    Topic,
    Subtopic,
    TeachingAndLearningActivity,
    TLAAssessment,
    Reference,
    WeeklyReference,
    ReferenceTocCache,
    Comment,
    CommentTarget,
  };
};
