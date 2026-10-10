/**
 * UniversityStatement — the university's institutional statements (VMGO):
 * vision, mission, educational policy, core values and graduate attributes.
 *
 * VERSIONED, NOT PERIOD-SCOPED. VMGO changes rarely and is not tied to a term,
 * so there is no period_id. Each save is a new row; the previous Active row is
 * marked Superseded in the same transaction, so at most one row is Active.
 * `createdAt` is when a version took effect — a past syllabus resolves the
 * version that was Active on its date from it.
 *
 * Rows are never edited after they are written. Restoring an old version
 * copies it as a new row, so the history reads as it happened.
 *
 * core_values / graduate_attributes: JSON [{ order, title, description }].
 *
 * status: 'Active' | 'Superseded'
 */
// `overrides` exists for the tests, which run the versioning against a scratch
// table; the app always uses the defaults.
export default (sequelize, DataTypes, overrides = {}) =>
  sequelize.define(
    overrides.modelName || 'UniversityStatement',
    {
      id: {
        field: 'university_statement_id',
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      vision:             { type: DataTypes.TEXT, allowNull: false },
      mission:            { type: DataTypes.TEXT, allowNull: false },
      educational_policy: { type: DataTypes.TEXT, allowNull: true },
      core_values:         { type: DataTypes.JSON, allowNull: false },
      graduate_attributes: { type: DataTypes.JSON, allowNull: false },
      status: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: 'Active',
        comment: "'Active' (at most one row) or 'Superseded'.",
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
      tableName: overrides.tableName || 'university_statements',
      timestamps: true,
    }
  );
