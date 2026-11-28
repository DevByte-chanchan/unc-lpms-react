'use strict';

module.exports = (sequelize, DataTypes) => {
  // 25. Notifications (Unified M1 + M3)
  const Notification = sequelize.define('Notification', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    recipient_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    academic_period_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    type: { type: DataTypes.STRING(40), allowNull: false },
    title: { type: DataTypes.STRING(200), allowNull: true },
    message: { type: DataTypes.STRING(500), allowNull: false },
    link: { type: DataTypes.STRING(255), allowNull: true },
    offering_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    comment_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    actor_role: { type: DataTypes.STRING(30), allowNull: true },
    sent_by_account_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    target_type: { type: DataTypes.STRING(24), allowNull: true },
    target_id: { type: DataTypes.STRING(64), allowNull: true },
    target_program_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    is_read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    read_at: { type: DataTypes.DATE, allowNull: true },
    emailed_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'Notifications',
    timestamps: false,
    getterMethods: {
      user_account_id() { return this.getDataValue('recipient_user_id'); },
      kind() { return this.getDataValue('type'); },
      body() { return this.getDataValue('message'); },
    },
  });

  // 26. AccountInvitations (Unified M1 + M3)
  const AccountInvitation = sequelize.define('AccountInvitation', {
    account_invitation_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    email: { type: DataTypes.STRING(160), allowNull: false },
    display_name: { type: DataTypes.STRING(150), allowNull: true },
    email_source: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'manual' },
    source_entity: { type: DataTypes.STRING(32), allowNull: true },
    import_batch_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    academic_period_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    created_account: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    sent_by_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'scheduled' },
    hold_reason: { type: DataTypes.STRING(255), allowNull: true },
    send_after: { type: DataTypes.DATE, allowNull: true },
    attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    last_error: { type: DataTypes.STRING(255), allowNull: true },
    sent_at: { type: DataTypes.DATE, allowNull: true },
    accepted_at: { type: DataTypes.DATE, allowNull: true },
    token_hash: { type: DataTypes.STRING(64), allowNull: true },
    expires_at: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'AccountInvitations',
    timestamps: true,
    getterMethods: {
      id() { return this.getDataValue('account_invitation_id'); },
      user_account_id() { return this.getDataValue('user_id'); },
    },
  });

  // 27. PasswordResets (Unified M1 + M3)
  const PasswordReset = sequelize.define('PasswordReset', {
    password_reset_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    token_hash: { type: DataTypes.STRING(64), allowNull: false },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    used_at: { type: DataTypes.DATE, allowNull: true },
    requested_ip: { type: DataTypes.STRING(64), allowNull: true },
  }, {
    tableName: 'PasswordResets',
    timestamps: true,
    getterMethods: {
      id() { return this.getDataValue('password_reset_id'); },
      user_account_id() { return this.getDataValue('user_id'); },
    },
  });

  // 28. consultant_courses
  const ConsultantCourse = sequelize.define('ConsultantCourse', {
    consultant_course_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    industry_consultant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    course_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    course_code: { type: DataTypes.STRING(32), allowNull: true },
  }, {
    tableName: 'consultant_courses',
    timestamps: false,
    getterMethods: {
      id() { return this.getDataValue('consultant_course_id'); },
      consultant_id() { return this.getDataValue('industry_consultant_id'); },
    },
  });

  // 29. import_batches
  const ImportBatch = sequelize.define('ImportBatch', {
    import_batch_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    entity: { type: DataTypes.STRING(32), allowNull: false },
    action: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'upload' },
    subject: { type: DataTypes.STRING(255), allowNull: true },
    academic_period_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    filename: { type: DataTypes.STRING(255), allowNull: true },
    snapshot: { type: DataTypes.TEXT('long'), allowNull: false },
    summary: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'pending' },
    undone_at: { type: DataTypes.DATE, allowNull: true },
    created_by_account_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  }, {
    tableName: 'import_batches',
    timestamps: true,
    underscored: true,
    getterMethods: {
      id() { return this.getDataValue('import_batch_id'); },
      period_id() { return this.getDataValue('academic_period_id'); },
    },
  });

  // 30. university_statements
  const UniversityStatement = sequelize.define('UniversityStatement', {
    university_statement_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    vision: { type: DataTypes.TEXT, allowNull: false },
    mission: { type: DataTypes.TEXT, allowNull: false },
    educational_policy: { type: DataTypes.TEXT, allowNull: true },
    core_values: { type: DataTypes.JSON, allowNull: false },
    graduate_attributes: { type: DataTypes.JSON, allowNull: false },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'Active' },
    source_filename: { type: DataTypes.STRING(255), allowNull: true },
    source_sha256: { type: DataTypes.STRING(64), allowNull: true },
    uploaded_by: { type: DataTypes.STRING(150), allowNull: true },
  }, {
    tableName: 'university_statements',
    timestamps: true,
    underscored: true,
    getterMethods: {
      id() { return this.getDataValue('university_statement_id'); },
    },
  });

  // 31. department_statements
  const DepartmentStatement = sequelize.define('DepartmentStatement', {
    department_statement_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    department_code: { type: DataTypes.STRING(20), allowNull: false },
    department_name: { type: DataTypes.STRING(120), allowNull: false },
    vision: { type: DataTypes.TEXT, allowNull: false },
    mission: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'Active' },
    source_filename: { type: DataTypes.STRING(255), allowNull: true },
    source_sha256: { type: DataTypes.STRING(64), allowNull: true },
    uploaded_by: { type: DataTypes.STRING(150), allowNull: true },
  }, {
    tableName: 'department_statements',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeValidate(row) {
        if (row.department_code) row.department_code = String(row.department_code).trim().toUpperCase();
      },
    },
    getterMethods: {
      id() { return this.getDataValue('department_statement_id'); },
    },
  });

  // 32. account_notices
  const AccountNotice = sequelize.define('AccountNotice', {
    account_notice_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    user_account_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    academic_period_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    told_roles: { type: DataTypes.JSON, allowNull: true },
    told_lead: { type: DataTypes.JSON, allowNull: true },
    told_contributor: { type: DataTypes.JSON, allowNull: true },
    told_consultant: { type: DataTypes.JSON, allowNull: true },
    dirty: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    send_after: { type: DataTypes.DATE, allowNull: true },
    first_dirty_at: { type: DataTypes.DATE, allowNull: true },
    sent_by_account_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    last_error: { type: DataTypes.STRING(255), allowNull: true },
    last_sent_at: { type: DataTypes.DATE, allowNull: true },
    last_result: { type: DataTypes.STRING(255), allowNull: true },
  }, {
    tableName: 'account_notices',
    timestamps: true,
    underscored: true,
  });

  // 33. course_assignment_history
  const CourseAssignmentHistory = sequelize.define('CourseAssignmentHistory', {
    course_assignment_history_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    academic_period_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    program_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    course_code: { type: DataTypes.STRING(32), allowNull: false },
    course_name: { type: DataTypes.STRING(150), allowNull: true },
    action: { type: DataTypes.STRING(32), allowNull: false },
    lead_before: { type: DataTypes.JSON, allowNull: true },
    lead_after: { type: DataTypes.JSON, allowNull: true },
    contributors_before: { type: DataTypes.JSON, allowNull: true },
    contributors_after: { type: DataTypes.JSON, allowNull: true },
    source: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'manual' },
    changed_by_account_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    note: { type: DataTypes.STRING(255), allowNull: true },
  }, {
    tableName: 'course_assignment_history',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    getterMethods: {
      id() { return this.getDataValue('course_assignment_history_id'); },
    },
  });

  // 34. curriculum_documents
  const CurriculumDocument = sequelize.define('CurriculumDocument', {
    curriculum_document_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    program_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    academic_period_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    import_batch_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    superseded_by_batch_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    sha256: { type: DataTypes.CHAR(64), allowNull: false },
    original_name: { type: DataTypes.STRING(150), allowNull: false },
    size_bytes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    pages: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    part_label: { type: DataTypes.STRING(64), allowNull: true },
    years_covered: { type: DataTypes.STRING(16), allowNull: true },
    course_codes: { type: DataTypes.TEXT, allowNull: true },
    program_name: { type: DataTypes.STRING(150), allowNull: true },
    cmo: { type: DataTypes.STRING(64), allowNull: true },
    effectivity: { type: DataTypes.STRING(100), allowNull: true },
    revision: { type: DataTypes.STRING(16), allowNull: true },
    uploaded_by_account_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'active' },
  }, {
    tableName: 'curriculum_documents',
    timestamps: true,
    underscored: true,
    getterMethods: {
      id() { return this.getDataValue('curriculum_document_id'); },
    },
  });

  // 35. deadline_reminders
  const DeadlineReminder = sequelize.define('DeadlineReminder', {
    deadline_reminder_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    user_account_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    academic_period_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    kind: { type: DataTypes.STRING(16), allowNull: false },
    due_date: { type: DataTypes.DATEONLY, allowNull: false },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'sending' },
    courses: { type: DataTypes.JSON, allowNull: true },
    result: { type: DataTypes.STRING(255), allowNull: true },
  }, {
    tableName: 'deadline_reminders',
    timestamps: true,
    underscored: true,
  });

  // 36. school_calendars
  const SchoolCalendar = sequelize.define('SchoolCalendar', {
    school_calendar_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    school_year: { type: DataTypes.STRING(12), allowNull: true },
    sha256: { type: DataTypes.CHAR(64), allowNull: false, unique: true },
    original_name: { type: DataTypes.STRING(150), allowNull: false },
    mime: { type: DataTypes.STRING(64), allowNull: false },
    size_bytes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    extracted: { type: DataTypes.JSON, allowNull: true },
    uploaded_by_account_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  }, {
    tableName: 'school_calendars',
    timestamps: true,
    underscored: true,
    getterMethods: {
      id() { return this.getDataValue('school_calendar_id'); },
    },
  });

  return {
    Notification,
    AccountInvitation,
    PasswordReset,
    ConsultantCourse,
    ImportBatch,
    UniversityStatement,
    DepartmentStatement,
    AccountNotice,
    CourseAssignmentHistory,
    CurriculumDocument,
    DeadlineReminder,
    SchoolCalendar,
  };
};
