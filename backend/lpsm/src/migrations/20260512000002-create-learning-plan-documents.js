'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('learning_plan_documents', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      learning_plan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'learning_plans', key: 'id' },
        onDelete: 'CASCADE'
      },
      uploader_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      uploader_role: {
        type: Sequelize.ENUM('program_head', 'director_of_libraries'),
        allowNull: false
      },
      document_type: {
        type: Sequelize.ENUM('peo_alignment', 'coaep', 'co_po_alignment', 'references'),
        allowNull: false
      },
      file_path: {
        type: Sequelize.STRING,
        allowNull: false
      },
      original_filename: {
        type: Sequelize.STRING,
        allowNull: false
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('learning_plan_documents');
  }
};
