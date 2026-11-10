'use strict';

/**
 * Where a bell notification leads. academic_period_id is already its term.
 *   target_type        assignment | role | consultant
 *   target_id          the course code (row ids change on every re-upload) or the role
 *   target_program_id  the course's program
 * Older rows stay NULL: they mark as read and go nowhere.
 *
 * Existing database (built by sync, see 20261109000001). --from has to name a
 * migration that hasn't run, so this is always the anchor there:
 *   npx sequelize-cli db:migrate --from 20261010000001-create-user-accounts.cjs
 */
const TABLE = 'notifications';

const hasTable = async (queryInterface) => {
  const tables = await queryInterface.showAllTables();
  return tables.map((t) => (typeof t === 'object' ? t.tableName : t)).includes(TABLE);
};

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await hasTable(queryInterface))) return;
    const columns = await queryInterface.describeTable(TABLE);
    const add = {
      target_type: { type: Sequelize.STRING(16), allowNull: true, comment: 'assignment | role | consultant; null = nowhere to go.' },
      target_id: { type: Sequelize.STRING(64), allowNull: true, comment: 'Course code or role name.' },
      target_program_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
    };
    for (const [name, definition] of Object.entries(add)) {
      if (!columns[name]) await queryInterface.addColumn(TABLE, name, definition);
    }
  },

  async down(queryInterface) {
    if (!(await hasTable(queryInterface))) return;
    const columns = await queryInterface.describeTable(TABLE);
    for (const name of ['target_type', 'target_id', 'target_program_id']) {
      if (columns[name]) await queryInterface.removeColumn(TABLE, name);
    }
  },
};
