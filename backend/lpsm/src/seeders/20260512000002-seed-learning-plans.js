'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('learning_plans', [
      {
        id: 1,
        instructor_id: 1,
        course_name: 'CS301 - Algorithms',
        status: 'draft',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 2,
        instructor_id: 1,
        course_name: 'CS401 - Database Systems',
        status: 'draft',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 3,
        instructor_id: 2,
        course_name: 'MATH201 - Calculus II',
        status: 'draft',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('learning_plans', null, {});
  }
};
