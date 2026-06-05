/**
 * Faculty — uploaded by the Dean.
 *
 * Columns from Faculty list.xlsx:
 *   NAME, ROLE, DEPARTMENT, STATUS, ABOUT
 *
 * `about` is intentionally TEXT to fit long biographies. The list
 * endpoint omits it; only GET /api/faculty/:id returns the full row
 * for the "View Details" modal.
 */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'Faculty',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      role: {
        type: DataTypes.STRING(64),
        allowNull: false,
        comment: 'e.g. Dean, Program Head, Professor, Instructor, …',
      },
      department: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Raw department name as it appeared on the Excel sheet.',
      },
      department_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        comment: 'Resolved FK to departments.id (set when a matching dept exists).',
      },
      status: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: 'Active',
      },
      about: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      // Personal + contact fields populated either from the updated
      // Faculty Excel (SEX, BIRTHDATE, EMAIL, CONTACT NUMBER columns)
      // or via manual Add/Edit through the UI.
      sex:            { type: DataTypes.STRING(16),  allowNull: true },
      birthdate:      { type: DataTypes.DATEONLY,    allowNull: true },
      email:          { type: DataTypes.STRING(100), allowNull: true },
      contact_number: { type: DataTypes.STRING(32),  allowNull: true },
      period_id:      { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    },
    {
      tableName: 'faculty',
      timestamps: true,
      defaultScope: {
        // The list view almost never needs the long bio. Use the
        // `withAbout` scope or a direct findByPk for the detail view.
        attributes: { exclude: ['about'] },
      },
      scopes: {
        withAbout: { attributes: { include: ['about'] } },
      },
    }
  );
