'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Update learning_plans table
    await queryInterface.addColumn('learning_plans', 'course_code', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('learning_plans', 'academic_year', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('learning_plans', 'semester', {
      type: Sequelize.ENUM('1st', '2nd', 'summer'),
      allowNull: true
    });

    // 2. Create learning_plan_versions table
    await queryInterface.createTable('learning_plan_versions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      learning_plan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'learning_plans',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      version_no: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      snapshot_data: {
        type: Sequelize.JSON,
        allowNull: false
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      trigger_event: {
        type: Sequelize.ENUM('submitted', 'returned', 'resubmitted', 'approved'),
        allowNull: false
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add index for performance
    await queryInterface.addIndex('learning_plan_versions', ['learning_plan_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('learning_plan_versions');
    await queryInterface.removeColumn('learning_plans', 'semester');
    await queryInterface.removeColumn('learning_plans', 'academic_year');
    await queryInterface.removeColumn('learning_plans', 'course_code');
  }
};
