/**
 * DeadlineReminder — one exam-date reminder sent (or being sent) to one person:
 * "submit your Learning Plan / TOS for <courses> before <date>", 7 days and
 * 1 day before the term's midterm and final exams (services/deadlineReminders.js).
 *
 * The UNIQUE (account, term, kind, due_date) key is the no-repeat guarantee:
 * a reminder is claimed by inserting its row first, so a second run, a second
 * API process or a restart can never send it again. A changed exam date is a
 * new due_date, so the moved deadline gets its own reminders.
 *
 *   kind     midterm_7d · midterm_1d · final_7d · final_1d
 *   status   sending → sent | skipped (not on MAIL_DEV_ALLOWLIST, MAIL_MODE=off)
 *            | bell (no password yet: in their bell, no email)
 *   courses  [{ code, name }] the reminder listed
 *
 * No foreign keys, like notifications.
 */
export default (sequelize, DataTypes) => sequelize.define(
  'DeadlineReminder',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true, field: 'deadline_reminder_id' },
    user_account_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    period_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'academic_period_id' },
    kind: { type: DataTypes.STRING(16), allowNull: false },
    due_date: { type: DataTypes.DATEONLY, allowNull: false },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'sending' },
    courses: { type: DataTypes.JSON, allowNull: true },
    result: { type: DataTypes.STRING(255), allowNull: true },
  },
  {
    tableName: 'deadline_reminders',
    timestamps: true,
    indexes: [
      { name: 'deadline_reminders_once', unique: true, fields: ['user_account_id', 'academic_period_id', 'kind', 'due_date'] },
    ],
  },
);
