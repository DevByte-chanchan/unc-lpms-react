/**
 * Department — owned by HR Staff in this module.
 *
 * Status:
 *   'Active'   — currently part of the period's department list
 *   'Unlisted' — was in a previous period's list but a re-upload
 *                without this department promoted the user to mark
 *                it removed.
 */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'Department',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      name:   { type: DataTypes.STRING(100), allowNull: false },
      code:   { type: DataTypes.STRING(16),  allowNull: false },
      dean:   { type: DataTypes.STRING(50),  allowNull: true },
      status: { type: DataTypes.STRING(16),  allowNull: false, defaultValue: 'Active' },
      period_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        comment: 'FK to academic_periods.id — every row is period-scoped.',
      },
    },
    {
      tableName: 'departments',
      timestamps: true,
    }
  );
