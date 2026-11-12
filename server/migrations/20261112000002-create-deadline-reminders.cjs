'use strict';

/**
 * deadline_reminders — the exam-date reminders already sent (see
 * models/deadlineReminder.js). The UNIQUE key is what stops a repeat.
 *
 * Existing database (built by sync, see 20261109000001): name a migration that
 * hasn't run with --from, e.g.
 *   npx sequelize-cli db:migrate --from 20261010000001-create-user-accounts.cjs
 */
const TABLE = 'deadline_reminders';

const hasTable = async (queryInterface) => {
  const tables = await queryInterface.showAllTables();
  return tables.map((t) => (typeof t === 'object' ? t.tableName : t)).includes(TABLE);
};

module.exports = {
  async up(queryInterface, Sequelize) {
    if (await hasTable(queryInterface)) return;
    await queryInterface.createTable(TABLE, {
      deadline_reminder_id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      user_account_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      academic_period_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      kind: { type: Sequelize.STRING(16), allowNull: false },
      due_date: { type: Sequelize.DATEONLY, allowNull: false },
      status: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'sending' },
      courses: { type: Sequelize.JSON, allowNull: true },
      result: { type: Sequelize.STRING(255), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex(TABLE, ['user_account_id', 'academic_period_id', 'kind', 'due_date'], { name: 'deadline_reminders_once', unique: true });
  },

  async down(queryInterface) {
    if (await hasTable(queryInterface)) await queryInterface.dropTable(TABLE);
  },
};
