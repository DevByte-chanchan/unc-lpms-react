'use strict';

/**
 * departments.dean_email: the Dean Email column of the Department List upload.
 * It used to be read for the upload's invitation only; the Access column and
 * Invite now / Resend on the Department List need it afterwards too.
 *
 * Existing database (built by sync, see 20261109000001). --from has to name a
 * migration that hasn't run, so this is always the anchor there:
 *   npx sequelize-cli db:migrate --from 20261010000001-create-user-accounts.cjs
 */
const TABLE = 'departments';

const hasTable = async (queryInterface) => {
  const tables = await queryInterface.showAllTables();
  return tables.map((t) => (typeof t === 'object' ? t.tableName : t)).includes(TABLE);
};

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await hasTable(queryInterface))) return;
    const columns = await queryInterface.describeTable(TABLE);
    if (!columns.dean_email) {
      await queryInterface.addColumn(TABLE, 'dean_email', { type: Sequelize.STRING(254), allowNull: true, after: 'dean' });
    }
  },

  async down(queryInterface) {
    if (!(await hasTable(queryInterface))) return;
    const columns = await queryInterface.describeTable(TABLE);
    if (columns.dean_email) await queryInterface.removeColumn(TABLE, 'dean_email');
  },
};
