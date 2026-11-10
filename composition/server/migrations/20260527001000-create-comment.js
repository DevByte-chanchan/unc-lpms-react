'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Comments', {
      comment_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      co_assign_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'CourseOfferingAssignments',
          key: 'co_assign_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      stakeholder_id: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      commenter_role: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'e.g., INDUSTRY_CONSULTANT, PROGRAM_HEAD, LIBRARY_DIRECTOR, DEAN'
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      resolved_status: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      resolved_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      week_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Weeks',
          key: 'week_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      comment_for: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Target domain: topics, tlas, references, or general'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Comments');
  }
};
