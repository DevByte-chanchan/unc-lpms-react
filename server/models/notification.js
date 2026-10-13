/**
 * Notification — one line in a person's in-app bell.
 *
 * Written by the notice worker (services/notices.js) for every change it finds
 * worth telling someone about, signed in or not: someone who hasn't set a
 * password yet finds everything waiting at first sign-in. emailed_at records
 * when the same news went out in an email.
 *
 * kind: role_added · role_removed · lead_added · contributor_added ·
 *       course_removed · consultant_added · consultant_removed · deadline
 *
 * Deliberately no foreign keys (a record that outlives what it points at).
 */
export default (sequelize, DataTypes) => sequelize.define(
  'Notification',
  {
    id: {
      field: 'notification_id',
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    user_account_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    period_id:       { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'academic_period_id' },
    kind:            { type: DataTypes.STRING(32), allowNull: false },
    title:           { type: DataTypes.STRING(150), allowNull: false },
    body:            { type: DataTypes.STRING(255), allowNull: true },
    link:            { type: DataTypes.STRING(255), allowNull: true },
    sent_by_account_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    dedupe_key: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: 'Deadline reminders: kind + period + deadline + days, so the daily step never adds one twice.',
    },
    read_at:    { type: DataTypes.DATE, allowNull: true },
    emailed_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'notifications',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { name: 'notifications_account_read', fields: ['user_account_id', 'read_at'] },
      { name: 'notifications_account_dedupe', fields: ['user_account_id', 'dedupe_key'] },
    ],
  }
);
