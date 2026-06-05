/**
 * AcademicPeriod — the canonical list of school-year/semester
 * combinations every other table in this module is scoped to.
 *
 * `label`        — display string shown in the dropdown
 *                  (e.g. "1st Semester 2025-2026"). Older formats
 *                  ("YYYY Semester 1", "YYYY 1st Semester") are
 *                  normalized on the frontend via
 *                  src/services/periodLabel.js#prettifyLabel so display
 *                  is uniform without a DB migration.
 * `school_year`  — e.g. "2025-2026".
 * `semester`     — small integer or string, 1 / 2 / "Summer".
 * `is_active`    — convenience flag the frontend uses to pre-select
 *                  the most recent period when none is in localStorage.
 * `sort_order`   — manual ordering for the dropdown (newest first).
 */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'AcademicPeriod',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      label:       { type: DataTypes.STRING(64),  allowNull: false, unique: true },
      school_year: { type: DataTypes.STRING(10),  allowNull: false },
      semester:    { type: DataTypes.STRING(16),  allowNull: false },
      is_active:   { type: DataTypes.BOOLEAN,     allowNull: false, defaultValue: false },
      sort_order:  { type: DataTypes.INTEGER,     allowNull: false, defaultValue: 0 },
      status:      {
        type: DataTypes.ENUM('Active', 'Closed'),
        allowNull: false,
        defaultValue: 'Active',
        comment: 'Lifecycle: Active = editable, Closed = read-only globally.',
      },
      closed_at:   { type: DataTypes.DATE, allowNull: true },
      start_date:  { type: DataTypes.DATEONLY, allowNull: true, comment: 'First day of the semester (dd/mm/yy).' },
      end_date:    { type: DataTypes.DATEONLY, allowNull: true, comment: 'Last day of the semester — auto-close trigger.' },
      midterm_deadline: { type: DataTypes.DATEONLY, allowNull: true, comment: 'Midterm submission deadline.' },
      finals_deadline:  { type: DataTypes.DATEONLY, allowNull: true, comment: 'Finals submission deadline.' },
    },
    {
      tableName: 'academic_periods',
      timestamps: true,
    }
  );
