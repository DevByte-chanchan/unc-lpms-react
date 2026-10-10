'use strict';

/**
 * department_statements — one department's vision and mission, extracted
 * from a PDF uploaded by the Dean.
 *
 * Versioned per department_code, not period-scoped: each save is a new row and
 * that department's previous Active row becomes Superseded. Keyed by the stable
 * department code, not departments.id (those rows are per term).
 * Documentation only — boot's sync({ alter: true }) creates the table from
 * models/departmentStatement.js.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('department_statements', {
      department_statement_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      department_code: { type: Sequelize.STRING(16), allowNull: false },
      department_name: { type: Sequelize.STRING(100), allowNull: false },
      vision:          { type: Sequelize.TEXT, allowNull: false },
      mission:         { type: Sequelize.TEXT, allowNull: false },
      status:          { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'Active' },
      source_filename: { type: Sequelize.STRING(255), allowNull: true },
      source_sha256:   { type: Sequelize.STRING(64), allowNull: true },
      uploaded_by:     { type: Sequelize.STRING(100), allowNull: true },
      // config/sequelize.js sets underscored: true.
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('department_statements', ['department_code', 'status'], {
      name: 'department_statements_code_status',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('department_statements');
  },
};
