/**
 * PasswordReset — one "forgot password" (or VPAA "send password reset") link.
 *
 * token_hash is the SHA-256 of the link token; the token itself is never
 * stored. A link works once (used_at) and for one hour (expires_at). Using
 * any link marks all of that account's outstanding ones used.
 */
export default (sequelize, DataTypes) => sequelize.define(
  'PasswordReset',
  {
    id: {
      field: 'password_reset_id',
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    user_account_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    token_hash:      { type: DataTypes.STRING(64), allowNull: false },
    expires_at:      { type: DataTypes.DATE, allowNull: false },
    used_at:         { type: DataTypes.DATE, allowNull: true },
    requested_ip:    { type: DataTypes.STRING(64), allowNull: true },
  },
  {
    tableName: 'password_resets',
    timestamps: true,
    indexes: [
      { name: 'password_resets_token_hash', fields: ['token_hash'] },
      { name: 'password_resets_user_account', fields: ['user_account_id'] },
    ],
  }
);
