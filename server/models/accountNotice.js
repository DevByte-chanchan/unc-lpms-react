/**
 * AccountNotice — what we last TOLD a person about one term, and whether there
 * may be something new to tell them. One row per (account, term).
 *
 * told_roles / told_lead / told_contributor / told_consultant are the roles and
 * course codes as of the last email (or invitation) they got. The notice worker
 * (services/notices.js) compares them with what is true now; when nothing
 * differs, nothing is sent — that is what keeps undo, revalidation and
 * re-uploads silent.
 *
 * dirty = "something may have changed, look after send_after". send_after is
 * pushed later by every further change (bursts combine into one email) but
 * never past first_dirty_at + 5 minutes.
 *
 * Deliberately no foreign keys: like account_invitations, this record must
 * outlive what it points at.
 */
export default (sequelize, DataTypes) => sequelize.define(
  'AccountNotice',
  {
    id: {
      field: 'account_notice_id',
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    user_account_id:  { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    period_id:        { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'academic_period_id' },
    // MySQL JSON columns can't carry a DEFAULT, so these are nullable and the
    // service reads null as [] (services/notices.js → toldOf); every writer
    // sets all four explicitly.
    told_roles:       { type: DataTypes.JSON, allowNull: true },
    told_lead:        { type: DataTypes.JSON, allowNull: true },
    told_contributor: { type: DataTypes.JSON, allowNull: true },
    told_consultant:  { type: DataTypes.JSON, allowNull: true },
    dirty:            { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    send_after:       { type: DataTypes.DATE, allowNull: true },
    first_dirty_at:   { type: DataTypes.DATE, allowNull: true },
    sent_by_account_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      comment: 'Who made the latest change — signs the email. Null = the system.',
    },
    attempts:     { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    last_error:   { type: DataTypes.STRING(255), allowNull: true },
    last_sent_at: { type: DataTypes.DATE, allowNull: true },
    last_result:  { type: DataTypes.STRING(255), allowNull: true },
  },
  {
    tableName: 'account_notices',
    timestamps: true,
    indexes: [
      { name: 'account_notices_account_period', unique: true, fields: ['user_account_id', 'academic_period_id'] },
      { name: 'account_notices_dirty_send_after', fields: ['dirty', 'send_after'] },
    ],
  }
);
