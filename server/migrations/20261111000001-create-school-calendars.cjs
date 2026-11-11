'use strict';

/**
 * school_calendars — the uploaded official academic calendars (see
 * models/schoolCalendar.js). The files are on disk under
 * server/storage/calendars/<sha256>.<ext>. No foreign keys.
 *
 * Existing database (built by sync, see 20261109000001): name a migration that
 * hasn't run with --from, e.g.
 *   npx sequelize-cli db:migrate --from 20261010000001-create-user-accounts.cjs
 */
const TABLE = 'school_calendars';

const hasTable = async (queryInterface) => {
  const tables = await queryInterface.showAllTables();
  return tables.map((t) => (typeof t === 'object' ? t.tableName : t)).includes(TABLE);
};

module.exports = {
  async up(queryInterface, Sequelize) {
    if (await hasTable(queryInterface)) return;
    await queryInterface.createTable(TABLE, {
      school_calendar_id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      school_year: { type: Sequelize.STRING(9), allowNull: true },
      sha256: { type: Sequelize.CHAR(64), allowNull: false },
      original_name: { type: Sequelize.STRING(150), allowNull: false },
      mime: { type: Sequelize.STRING(32), allowNull: false },
      size_bytes: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      extracted: { type: Sequelize.JSON, allowNull: true },
      uploaded_by_account_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex(TABLE, ['sha256'], { name: 'school_calendars_sha256', unique: true });
    await queryInterface.addIndex(TABLE, ['school_year'], { name: 'school_calendars_year' });
  },

  async down(queryInterface) {
    if (await hasTable(queryInterface)) await queryInterface.dropTable(TABLE);
  },
};
