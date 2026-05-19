'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('approval_comments', {
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
      approval_stage_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'approval_stages', key: 'id' },
        onDelete: 'SET NULL'
      },
      from_role: {
        type: Sequelize.ENUM('industry_consultant', 'director_of_libraries', 'program_head', 'dean'),
        allowNull: false
      },
      to_role: {
        type: Sequelize.ENUM('instructor', 'program_head'),
        allowNull: false
      },
      comment: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      from_id: {
        type: Sequelize.INTEGER,
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
    await queryInterface.dropTable('approval_comments');
  }
};
