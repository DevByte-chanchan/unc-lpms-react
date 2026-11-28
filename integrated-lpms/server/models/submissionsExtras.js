'use strict';

module.exports = (sequelize, DataTypes) => {
  // 37. ProgramEducationalObjectives
  const ProgramEducationalObjective = sequelize.define('ProgramEducationalObjective', {
    peo_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    program_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    statement: { type: DataTypes.STRING(500), allowNull: false },
    mission_aligned: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, {
    tableName: 'ProgramEducationalObjectives',
    timestamps: true,
  });

  // 38. ProgramFrontPages (upgraded to LONGBLOB for MySQL 8)
  const ProgramFrontPage = sequelize.define('ProgramFrontPage', {
    program_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
    file_name: { type: DataTypes.STRING(200), allowNull: false },
    pdf: { type: DataTypes.BLOB('long'), allowNull: false },
    uploaded_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'ProgramFrontPages',
    timestamps: false,
  });

  // 39. CourseDocuments (upgraded to LONGBLOB for MySQL 8)
  const CourseDocument = sequelize.define('CourseDocument', {
    course_document_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    pc_offering_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    kind: { type: DataTypes.STRING(16), allowNull: false }, // 'co-po' | 'coaep'
    file_name: { type: DataTypes.STRING(200), allowNull: false },
    content_type: { type: DataTypes.STRING(120), allowNull: false },
    data: { type: DataTypes.BLOB('long'), allowNull: false },
    parsed_json: { type: DataTypes.TEXT('long'), allowNull: true },
    uploaded_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'CourseDocuments',
    timestamps: false,
    indexes: [{ unique: true, fields: ['pc_offering_id', 'kind'], name: 'course_documents_offering_kind_uq' }],
  });

  // 40. CourseReferences
  const CourseReference = sequelize.define('CourseReference', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    course_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    reference_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    added_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'CourseReferences',
    timestamps: false,
    indexes: [{ unique: true, fields: ['course_id', 'reference_id'], name: 'course_references_uq' }],
  });

  // 41. TitleRequests
  const TitleRequest = sequelize.define('TitleRequest', {
    request_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING(300), allowNull: false },
    authors: { type: DataTypes.STRING(300), allowNull: true },
    note: { type: DataTypes.TEXT, allowNull: true },
    pc_offering_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    requested_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' }, // pending | added | declined
    reason: { type: DataTypes.TEXT, allowNull: true },
    reference_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    decided_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    decided_at: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'TitleRequests',
    timestamps: true,
  });

  // 42. CourseConsultants
  const CourseConsultant = sequelize.define('CourseConsultant', {
    course_consultant_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    course_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    consultant_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    assigned_by_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    deactivated_at: { type: DataTypes.DATE, allowNull: true },
    deactivated_by_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  }, {
    tableName: 'CourseConsultants',
    timestamps: true,
  });

  // 43. ConsultantSignoffs
  const ConsultantSignoff = sequelize.define('ConsultantSignoff', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    offering_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    consultant_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    consultant_name: { type: DataTypes.STRING(150), allowNull: true },
    signed_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'ConsultantSignoffs',
    timestamps: false,
    indexes: [{ unique: true, fields: ['offering_id', 'consultant_user_id'], name: 'consultant_signoffs_uq' }],
  });

  // 44. FormSettings
  const FormSetting = sequelize.define('FormSetting', {
    form_key: { type: DataTypes.STRING(30), primaryKey: true },
    doc_control_no: { type: DataTypes.STRING(40), allowNull: false },
    revision_no: { type: DataTypes.STRING(20), allowNull: false },
    effectivity: { type: DataTypes.STRING(30), allowNull: false },
    updated_by_name: { type: DataTypes.STRING(150), allowNull: true },
  }, {
    tableName: 'FormSettings',
    timestamps: true,
  });

  // 45. CatalogSettings
  const CatalogSetting = sequelize.define('CatalogSetting', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, defaultValue: 1 },
    recency_years: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
    enforce_recency: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    require_availability: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    updated_by_name: { type: DataTypes.STRING(150), allowNull: true },
  }, {
    tableName: 'CatalogSettings',
    timestamps: true,
  });

  // 46. TermDeadlines
  const TermDeadline = sequelize.define('TermDeadline', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    program_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    school_year: { type: DataTypes.STRING(20), allowNull: false },
    semester: { type: DataTypes.STRING(30), allowNull: false },
    syllabus_due: { type: DataTypes.DATEONLY, allowNull: false },
    remind_before: { type: DataTypes.STRING(40), allowNull: true, defaultValue: '7,3,1,0' },
    overdue_every: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 3 },
    set_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  }, {
    tableName: 'TermDeadlines',
    timestamps: true,
  });

  // 47. ReminderPauses
  const ReminderPause = sequelize.define('ReminderPause', {
    offering_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
    paused_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  }, {
    tableName: 'ReminderPauses',
    timestamps: true,
    updatedAt: false,
  });

  // 48. ReminderLog
  const ReminderLog = sequelize.define('ReminderLog', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    subject: { type: DataTypes.STRING(60), allowNull: false },
    kind: { type: DataTypes.STRING(30), allowNull: false },
    day: { type: DataTypes.DATEONLY, allowNull: false },
  }, {
    tableName: 'ReminderLog',
    timestamps: true,
    updatedAt: false,
    indexes: [{ unique: true, fields: ['subject', 'kind', 'day'], name: 'reminder_log_once_uq' }],
  });

  // 49. AuditLogs (append-only via MySQL triggers)
  const AuditLog = sequelize.define('AuditLog', {
    audit_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    actor_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    actor_name: { type: DataTypes.STRING(150), allowNull: true },
    actor_role: { type: DataTypes.STRING(40), allowNull: true },
    action: { type: DataTypes.STRING(200), allowNull: false },
    entity_type: { type: DataTypes.STRING(60), allowNull: true },
    entity_id: { type: DataTypes.STRING(60), allowNull: true },
    outcome: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'success' },
    details: { type: DataTypes.TEXT, allowNull: true },
    ip_address: { type: DataTypes.STRING(64), allowNull: true },
  }, {
    tableName: 'AuditLogs',
    timestamps: true,
    updatedAt: false,
  });

  // 50. ReviewRecordSnapshots (upgraded to LONGTEXT)
  const ReviewRecordSnapshot = sequelize.define('ReviewRecordSnapshot', {
    offering_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
    payload: { type: DataTypes.TEXT('long'), allowNull: false },
  }, {
    tableName: 'ReviewRecordSnapshots',
    timestamps: true,
    updatedAt: false,
  });

  // 51. PlanReturnSnapshots (upgraded to LONGTEXT)
  const PlanReturnSnapshot = sequelize.define('PlanReturnSnapshot', {
    offering_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
    payload: { type: DataTypes.TEXT('long'), allowNull: false },
  }, {
    tableName: 'PlanReturnSnapshots',
    timestamps: true,
    updatedAt: false,
  });

  // 52. OfficialOfferings
  const OfficialOffering = sequelize.define('OfficialOffering', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    program_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    school_year: { type: DataTypes.STRING(20), allowNull: false },
    semester: { type: DataTypes.STRING(30), allowNull: false },
    course_no: { type: DataTypes.STRING(32), allowNull: false },
    section: { type: DataTypes.STRING(40), allowNull: true },
    title: { type: DataTypes.STRING(150), allowNull: true },
    faculty: { type: DataTypes.TEXT, allowNull: true },
    imported_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  }, {
    tableName: 'OfficialOfferings',
    timestamps: true,
    updatedAt: false,
  });

  return {
    ProgramEducationalObjective,
    ProgramFrontPage,
    CourseDocument,
    CourseReference,
    TitleRequest,
    CourseConsultant,
    ConsultantSignoff,
    FormSetting,
    CatalogSetting,
    TermDeadline,
    ReminderPause,
    ReminderLog,
    AuditLog,
    ReviewRecordSnapshot,
    PlanReturnSnapshot,
    OfficialOffering,
  };
};
