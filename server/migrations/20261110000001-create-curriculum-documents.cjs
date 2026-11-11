'use strict';

/**
 * curriculum_documents — the Program of Study PDFs kept after a Course
 * Offerings import (see models/curriculumDocument.js). The files themselves are
 * on disk under server/storage/curriculum/<sha256>.pdf. No foreign keys.
 *
 * Existing database (built by sync, see 20261109000001). --from has to name a
 * migration that hasn't run, so this is always the anchor there:
 *   npx sequelize-cli db:migrate --from 20261010000001-create-user-accounts.cjs
 */
const TABLE = 'curriculum_documents';

const hasTable = async (queryInterface) => {
  const tables = await queryInterface.showAllTables();
  return tables.map((t) => (typeof t === 'object' ? t.tableName : t)).includes(TABLE);
};

module.exports = {
  async up(queryInterface, Sequelize) {
    if (await hasTable(queryInterface)) return;
    await queryInterface.createTable(TABLE, {
      curriculum_document_id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      program_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      academic_period_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      import_batch_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      superseded_by_batch_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      sha256: { type: Sequelize.CHAR(64), allowNull: false },
      original_name: { type: Sequelize.STRING(150), allowNull: false },
      size_bytes: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      pages: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      part_label: { type: Sequelize.STRING(64), allowNull: true },
      years_covered: { type: Sequelize.STRING(16), allowNull: true },
      course_codes: { type: Sequelize.TEXT, allowNull: true },
      program_name: { type: Sequelize.STRING(150), allowNull: true },
      cmo: { type: Sequelize.STRING(64), allowNull: true },
      effectivity: { type: Sequelize.STRING(100), allowNull: true },
      revision: { type: Sequelize.STRING(16), allowNull: true },
      uploaded_by_account_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      status: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'active' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex(TABLE, ['program_id', 'status'], { name: 'curriculum_documents_program_status' });
    await queryInterface.addIndex(TABLE, ['import_batch_id'], { name: 'curriculum_documents_batch' });
  },

  async down(queryInterface) {
    if (await hasTable(queryInterface)) await queryInterface.dropTable(TABLE);
  },
};
