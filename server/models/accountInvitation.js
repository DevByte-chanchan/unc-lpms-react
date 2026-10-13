/**
 * AccountInvitation — "you've been given access, set your password".
 *
 * One row per invitation sent (or about to be). Created on upload commit,
 * by a VPAA resend, or by `npm run mail:test`; delivered by
 * workers/emailWorker.js (scheduled rows) or straight away (resends).
 *
 * status:
 *   waiting    created, not invited yet: sent when there is news for the person
 *              (a course, a role — services/notices.js) or on Invite now
 *   held       won't send until someone fixes it (hold_reason says why)
 *   scheduled  waiting for send_after (the upload's undo window + 10 s)
 *   sending    claimed by the worker
 *   sent       delivered; the link works until expires_at
 *   failed     gave up after the retries (last_error says why)
 *   cancelled  undone upload, superseded by a newer invitation, …
 *   accepted   the person set their password
 *
 * token_hash is the SHA-256 of the link token, set only while a sent link is
 * live; the token itself is never stored. user_account_id is null only for a
 * held row whose email couldn't be resolved to an account.
 *
 * Deliberately no foreign keys: like import_batches, this is a record that
 * must outlive what it points at.
 */
export default (sequelize, DataTypes) => sequelize.define(
  'AccountInvitation',
  {
    id: {
      field: 'account_invitation_id',
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    user_account_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    email:           { type: DataTypes.STRING(150), allowNull: false },
    display_name:    { type: DataTypes.STRING(100), allowNull: false },
    email_source: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: 'manual',
      comment: 'file | derived | manual',
    },
    source_entity: {
      type: DataTypes.STRING(32),
      allowNull: true,
      comment: 'faculty | departments | programs | industry_consultants | manual | notice | reminder | request | test',
    },
    import_batch_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    period_id:       { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'academic_period_id' },
    created_account: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'True when the upload that made this invitation also created the account — undoing it may remove the account.',
    },
    sent_by_account_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      comment: 'Whose upload (or resend) gave the access — signs the email. Null = the system.',
    },
    status: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: 'scheduled',
      comment: 'waiting | held | scheduled | sending | sent | failed | cancelled | accepted',
    },
    hold_reason: { type: DataTypes.STRING(255), allowNull: true },
    send_after:  { type: DataTypes.DATE, allowNull: true },
    attempts:    { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    last_error:  { type: DataTypes.STRING(255), allowNull: true },
    sent_at:     { type: DataTypes.DATE, allowNull: true },
    accepted_at: { type: DataTypes.DATE, allowNull: true },
    token_hash:  { type: DataTypes.STRING(64), allowNull: true },
    expires_at:  { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'account_invitations',
    timestamps: true,
    indexes: [
      { name: 'account_invitations_token_hash', fields: ['token_hash'] },
      { name: 'account_invitations_status_send_after', fields: ['status', 'send_after'] },
      { name: 'account_invitations_user_account', fields: ['user_account_id'] },
      { name: 'account_invitations_import_batch', fields: ['import_batch_id'] },
    ],
  }
);
