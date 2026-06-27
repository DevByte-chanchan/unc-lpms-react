'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('syllabus_content', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      course_code: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      academic_year: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      semester: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      content: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'Full syllabus content (topics, ILOS, references, assessments, etc.)'
      },
      is_current: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_by: {
        type: Sequelize.INTEGER,
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
    await queryInterface.addIndex('syllabus_content', ['course_code', 'academic_year'], { unique: true });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('syllabus_content');
  }
};
