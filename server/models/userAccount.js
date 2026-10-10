/**
 * UserAccount — a person who can sign in.
 *
 * The account is the STABLE identity. Faculty and industry consultant rows are
 * period-scoped (a new id every term) and not everyone who signs in is faculty,
 * so there is deliberately no foreign key: the account links to the current
 * period's people by EMAIL at request time (controllers/authController.js).
 *
 * password_hash never leaves the server: the default scope leaves it out and
 * toJSON strips it as a second guard. Use the `withHash` scope to check one.
 *
 * roles: JSON array, a subset of utils/roles.js ROLES.
 * status: 'Active' | 'Disabled'
 */
import { normalizeEmail } from '../utils/roles.js';

// `overrides` exists for the tests, which run the seed against a scratch
// table; the app always uses the defaults.
export default (sequelize, DataTypes, overrides = {}) => {
  const UserAccount = sequelize.define(
    overrides.modelName || 'UserAccount',
    {
      id: {
        field: 'user_account_id',
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      email: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
        comment: 'The login. Lower-cased and trimmed; must be @ALLOWED_EMAIL_DOMAIN.',
      },
      password_hash: { type: DataTypes.STRING(100), allowNull: false },
      display_name:  { type: DataTypes.STRING(100), allowNull: false },
      roles:         { type: DataTypes.JSON, allowNull: false },
      status: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: 'Active',
      },
      must_change_password: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      last_login_at:   { type: DataTypes.DATE, allowNull: true },
      failed_attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      locked_until:    { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: overrides.tableName || 'user_accounts',
      timestamps: true,
      defaultScope: { attributes: { exclude: ['password_hash'] } },
      scopes: { withHash: { attributes: { include: ['password_hash'] } } },
      hooks: {
        beforeValidate: (row) => {
          if (row.email != null) row.email = normalizeEmail(row.email);
        },
      },
    }
  );

  UserAccount.prototype.toJSON = function toJSON() {
    const values = { ...this.get() };
    delete values.password_hash;
    return values;
  };

  return UserAccount;
};
