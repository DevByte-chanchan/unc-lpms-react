'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('approval_stages', {
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
      stage: {
        type: Sequelize.ENUM('industry_consultant', 'director_of_libraries', 'program_head', 'dean'),
        allowNull: false
      },
      reviewer_role: {
        type: Sequelize.ENUM('industry_consultant', 'director_of_libraries', 'program_head', 'dean'),
        allowNull: false
      },
      reviewer_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'returned'),
        defaultValue: 'pending'
      },
      comments: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      reviewed_at: {
        type: Sequelize.DATE,
        allowNull: true
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
    await queryInterface.dropTable('approval_stages');
  }
};
