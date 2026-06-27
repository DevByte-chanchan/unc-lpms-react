'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('syllabus_versions', {
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
      version_no: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      snapshot_data: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'Copy of syllabus approval state at that point'
      },
      trigger_event: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('syllabus_versions');
  }
};
