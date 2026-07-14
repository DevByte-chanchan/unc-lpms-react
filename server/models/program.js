/**
 * Program — uploaded by the Dean.
 *
 * Columns from Program .xlsx:
 *   CODE, NAME, PROGRAM HEAD
 */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'Program',
    {
      id: {
        field: 'program_id',
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      code: {
        type: DataTypes.STRING(16),
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      program_head: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Mirrored display name of the program head (Faculty).',
      },
      program_head_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        comment: 'Resolved FK to faculty.id (the assigned Program Head, same period).',
      },
      status: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: 'Active',
        comment: 'Active | Unlisted — Unlisted programs move to the Archive view.',
      },
      department_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      },
      period_id: {
        field: 'academic_period_id',
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      },
    },
    {
      tableName: 'programs',
      timestamps: true,
    }
  );
