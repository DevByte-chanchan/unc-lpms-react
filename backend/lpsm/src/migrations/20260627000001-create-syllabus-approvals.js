'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('syllabus_approvals', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      course_code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      course_name: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      instructor_name: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      academic_year: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      semester: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      current_stage: {
        type: Sequelize.ENUM('submitted', 'parallel_review', 'program_head', 'dean', 'approved', 'returned'),
        defaultValue: 'submitted'
      },
      oic_status: {
        type: Sequelize.ENUM('pending', 'approved', 'returned'),
        defaultValue: 'pending'
      },
      oic_comment: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      oic_reviewed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      submitted_at: {
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
    await queryInterface.dropTable('syllabus_approvals');
  }
};
