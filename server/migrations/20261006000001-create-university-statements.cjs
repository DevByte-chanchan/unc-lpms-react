'use strict';

/**
 * university_statements — the university's VMGO (vision, mission, educational
 * policy, core values, graduate attributes), extracted from an uploaded PDF
 * by OVPAA.
 *
 * Versioned, not period-scoped: each save is a new row and the previous
 * Active row becomes Superseded. Documentation only — boot's
 * sync({ alter: true }) creates the table from models/universityStatement.js.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('university_statements', {
      university_statement_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      vision:              { type: Sequelize.TEXT, allowNull: false },
      mission:             { type: Sequelize.TEXT, allowNull: false },
      educational_policy:  { type: Sequelize.TEXT, allowNull: true },
      core_values:         { type: Sequelize.JSON, allowNull: false },
      graduate_attributes: { type: Sequelize.JSON, allowNull: false },
      status:          { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'Active' },
      source_filename: { type: Sequelize.STRING(255), allowNull: true },
      source_sha256:   { type: Sequelize.STRING(64), allowNull: true },
      uploaded_by:     { type: Sequelize.STRING(100), allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('university_statements');
  },
};
