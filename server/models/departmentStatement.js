/**
 * DepartmentStatement — one department's vision and mission, uploaded by its
 * Dean. (Goals, objectives and core values are not kept at department level.)
 *
 * VERSIONED PER DEPARTMENT, NOT PERIOD-SCOPED (same reasoning as
 * university_statements). Keyed by `department_code`, not departments.id:
 * department rows are period-scoped, so the same department gets a new id
 * every term, while its code is stable. Codes are stored upper-cased.
 *
 * At most one row per department_code is 'Active'; a save supersedes only that
 * department's Active row (utils/universityStatementVersions.js, scoped).
 * Rows are never edited after they are written; restore copies forward.
 *
 * status: 'Active' | 'Superseded'
 */
// `overrides` exists for the tests, which run the versioning against a scratch
// table; the app always uses the defaults.
export default (sequelize, DataTypes, overrides = {}) =>
  sequelize.define(
    overrides.modelName || 'DepartmentStatement',
    {
      id: {
        field: 'department_statement_id',
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      department_code: {
        type: DataTypes.STRING(16),
        allowNull: false,
        comment: 'departments.code, upper-cased. Not a FK: departments rows are per term.',
      },
      department_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: "Snapshot of the department's name at save time, for display.",
      },
      vision:  { type: DataTypes.TEXT, allowNull: false },
      mission: { type: DataTypes.TEXT, allowNull: false },
      status: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: 'Active',
        comment: "'Active' (at most one row per department_code) or 'Superseded'.",
      },
      source_filename: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Original name of the uploaded PDF.',
      },
      source_sha256: {
        type: DataTypes.STRING(64),
        allowNull: true,
        comment: 'Hash of the uploaded PDF, to spot a re-upload of the same file.',
      },
      uploaded_by: { type: DataTypes.STRING(100), allowNull: true },
    },
    {
      tableName: overrides.tableName || 'department_statements',
      timestamps: true,
      indexes: [
        { name: (overrides.tableName || 'department_statements') + '_code_status', fields: ['department_code', 'status'] },
      ],
      hooks: {
        beforeValidate(row) {
          if (row.department_code) row.department_code = String(row.department_code).trim().toUpperCase();
        },
      },
    }
  );
