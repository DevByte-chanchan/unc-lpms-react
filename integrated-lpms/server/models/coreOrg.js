'use strict';

const { normalizeEmail, normalizeRoleList, pickDefaultActiveRole } = require('../utils/roles');

module.exports = (sequelize, DataTypes) => {
  // 1. academic_periods
  const AcademicPeriod = sequelize.define('AcademicPeriod', {
    academic_period_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    label: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    school_year: { type: DataTypes.STRING(20), allowNull: false },
    semester: { type: DataTypes.STRING(30), allowNull: false },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.ENUM('Active', 'Closed'), allowNull: false, defaultValue: 'Active' },
    closed_at: { type: DataTypes.DATE, allowNull: true },
    start_date: { type: DataTypes.DATEONLY, allowNull: true },
    end_date: { type: DataTypes.DATEONLY, allowNull: true },
    classes_start: { type: DataTypes.DATEONLY, allowNull: true },
    prelim_exam: { type: DataTypes.DATEONLY, allowNull: true },
    midterm_exam: { type: DataTypes.DATEONLY, allowNull: true },
    semifinal_exam: { type: DataTypes.DATEONLY, allowNull: true },
    final_exam: { type: DataTypes.DATEONLY, allowNull: true },
  }, {
    tableName: 'academic_periods',
    timestamps: true,
    underscored: true,
    getterMethods: {
      id() { return this.getDataValue('academic_period_id'); },
    },
  });

  // 2. Users (Unified superset of M1 user_accounts + M2 user_accounts + M3 Users)
  const User = sequelize.define('User', {
    user_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    email: { type: DataTypes.STRING(160), allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.STRING(60), allowNull: false, defaultValue: 'Instructor' },
    roles: { type: DataTypes.JSON, allowNull: false, defaultValue: ['Instructor'] },
    active_role: { type: DataTypes.STRING(60), allowNull: false, defaultValue: 'Instructor' },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'Active' },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    faculty_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    industry_consultant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    must_change_password: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    temp_password_expires_at: { type: DataTypes.DATE, allowNull: true },
    password_changed_at: { type: DataTypes.DATE, allowNull: true },
    last_login_at: { type: DataTypes.DATE, allowNull: true },
    failed_attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    locked_until: { type: DataTypes.DATE, allowNull: true },
    reset_token_hash: { type: DataTypes.STRING(64), allowNull: true },
    reset_expires_at: { type: DataTypes.DATE, allowNull: true },
    privacy_consent_version: { type: DataTypes.STRING(20), allowNull: true },
    privacy_consented_at: { type: DataTypes.DATE, allowNull: true },
    signature_path: { type: DataTypes.STRING(255), allowNull: true },
    signature_iv: { type: DataTypes.STRING(32), allowNull: true },
    signature_tag: { type: DataTypes.STRING(32), allowNull: true },
    signature_mime: { type: DataTypes.STRING(32), allowNull: true },
    signature_key_version: { type: DataTypes.INTEGER, allowNull: true },
    signature_uploaded_at: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'Users',
    timestamps: true,
    defaultScope: { attributes: { exclude: ['password_hash'] } },
    scopes: { withHash: { attributes: { include: ['password_hash'] } } },
    hooks: {
      beforeValidate(row) {
        if (row.email) row.email = normalizeEmail(row.email);
        const normRoles = normalizeRoleList(row.roles || row.role);
        row.roles = normRoles;
        row.role = normRoles[0] || 'Instructor';
        row.active_role = pickDefaultActiveRole(normRoles, row.active_role || row.role);
        if (row.status === 'Disabled') row.is_active = false;
        else if (row.is_active === false) row.status = 'Disabled';
        else { row.status = 'Active'; row.is_active = true; }
      },
    },
    getterMethods: {
      id() { return this.getDataValue('user_id'); },
      full_name() { return this.getDataValue('name'); },
      display_name() { return this.getDataValue('name'); },
    },
  });

  User.prototype.toJSON = function toJSON() {
    const v = { ...this.get() };
    delete v.password_hash;
    v.id = v.user_id;
    v.full_name = v.name;
    v.display_name = v.name;
    return v;
  };

  // 3. Departments
  const Department = sequelize.define('Department', {
    dept_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(120), allowNull: false },
    code: { type: DataTypes.STRING(20), allowNull: false },
    dean: { type: DataTypes.STRING(100), allowNull: true },
    dean_email: { type: DataTypes.STRING(254), allowNull: true },
    stakeholder_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'Active' },
    academic_period_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  }, {
    tableName: 'Departments',
    timestamps: true,
    getterMethods: {
      id() { return this.getDataValue('dept_id'); },
      period_id() { return this.getDataValue('academic_period_id'); },
    },
  });

  // 4. faculty
  const Faculty = sequelize.define('Faculty', {
    faculty_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    role: { type: DataTypes.STRING(64), allowNull: false, defaultValue: 'Instructor' },
    department: { type: DataTypes.STRING(120), allowNull: true },
    department_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    employment_type: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'Full-time' },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'Active' },
    about: { type: DataTypes.TEXT, allowNull: true },
    sex: { type: DataTypes.STRING(16), allowNull: true },
    birthdate: { type: DataTypes.DATEONLY, allowNull: true },
    email: { type: DataTypes.STRING(150), allowNull: true },
    contact_number: { type: DataTypes.STRING(32), allowNull: true },
    academic_period_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  }, {
    tableName: 'faculty',
    timestamps: true,
    underscored: true,
    getterMethods: {
      id() { return this.getDataValue('faculty_id'); },
      position() { return this.getDataValue('role'); },
      period_id() { return this.getDataValue('academic_period_id'); },
    },
  });

  // 5. Programs
  const Program = sequelize.define('Program', {
    program_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    code: { type: DataTypes.STRING(20), allowNull: true },
    name: { type: DataTypes.STRING(120), allowNull: false },
    dept_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    program_head: { type: DataTypes.STRING(120), allowNull: true },
    program_head_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    stakeholder_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'Active' },
    academic_period_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  }, {
    tableName: 'Programs',
    timestamps: true,
    getterMethods: {
      id() { return this.getDataValue('program_id'); },
      department_id() { return this.getDataValue('dept_id'); },
      period_id() { return this.getDataValue('academic_period_id'); },
    },
  });

  // 6. industry_consultants
  const IndustryConsultant = sequelize.define('IndustryConsultant', {
    industry_consultant_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    email: { type: DataTypes.STRING(160), allowNull: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    assigned_course_code: { type: DataTypes.STRING(30), allowNull: true },
    assigned_course_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: true, defaultValue: 'Active' },
    status_overridden: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    academic_period_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  }, {
    tableName: 'industry_consultants',
    timestamps: true,
    underscored: true,
    getterMethods: {
      id() { return this.getDataValue('industry_consultant_id'); },
      period_id() { return this.getDataValue('academic_period_id'); },
    },
  });

  // 7. Courses
  const Course = sequelize.define('Course', {
    course_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    course_no: { type: DataTypes.STRING(32), allowNull: false },
    course_title: { type: DataTypes.STRING(150), allowNull: false },
    credit: { type: DataTypes.STRING(50), allowNull: true },
    contact_hrs: { type: DataTypes.STRING(64), allowNull: true },
    classification: { type: DataTypes.STRING(100), allowNull: true },
    cmo: { type: DataTypes.STRING(100), allowNull: true },
    year_lvl: { type: DataTypes.STRING(32), allowNull: true },
    prerequisites_text: { type: DataTypes.TEXT, allowNull: true },
    term: { type: DataTypes.STRING(64), allowNull: true },
    semester: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    archived: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    academic_period_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  }, {
    tableName: 'Courses',
    timestamps: true,
    getterMethods: {
      period_id() { return this.getDataValue('academic_period_id'); },
    },
  });

  // 8. Prerequisites
  const Prerequisite = sequelize.define('Prerequisite', {
    prerequisite_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    course_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    prerequisite_course_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  }, {
    tableName: 'Prerequisites',
    timestamps: true,
    getterMethods: {
      course_prerequisite_id() { return this.getDataValue('prerequisite_course_id'); },
    },
  });

  return {
    AcademicPeriod,
    User,
    UserAccount: User, // alias for M1/M2 compatibility
    Department,
    Faculty,
    Program,
    IndustryConsultant,
    Course,
    Prerequisite,
  };
};
