'use strict';

/**
 * user_accounts — the people who can sign in (email + bcrypt hash + roles).
 *
 * Deliberately no FK to faculty / industry_consultants: those rows are per
 * term, the account is not. It links to them by email at request time.
 * Documentation only — boot's sync({ alter: true }) creates the table from
 * models/userAccount.js.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_accounts', {
      user_account_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      email:                { type: Sequelize.STRING(150), allowNull: false, unique: true },
      password_hash:        { type: Sequelize.STRING(100), allowNull: false },
      display_name:         { type: Sequelize.STRING(100), allowNull: false },
      roles:                { type: Sequelize.JSON, allowNull: false },
      status:               { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'Active' },
      must_change_password: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      last_login_at:        { type: Sequelize.DATE, allowNull: true },
      failed_attempts:      { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      locked_until:         { type: Sequelize.DATE, allowNull: true },
      // config/sequelize.js sets underscored: true.
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_accounts');
  },
};
