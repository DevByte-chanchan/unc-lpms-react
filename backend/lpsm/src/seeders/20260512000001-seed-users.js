'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('users', [
      {
        id: 1,
        name: 'Dr. Sarah Wilson',
        role: 'instructor',
        email: 'sarah.wilson@unc.edu',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 2,
        name: 'Mr. James Chen',
        role: 'instructor',
        email: 'james.chen@unc.edu',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 10,
        name: 'Dr. Patricia Moore',
        role: 'program_head',
        email: 'patricia.moore@unc.edu',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 20,
        name: 'Ms. Linda Rodriguez',
        role: 'director_of_libraries',
        email: 'linda.rodriguez@unc.edu',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 30,
        name: 'Mr. Robert Thompson',
        role: 'industry_consultant',
        email: 'robert.thompson@example.com',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 40,
        name: 'Dr. Michael Johnson',
        role: 'dean',
        email: 'michael.johnson@unc.edu',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', null, {});
  }
};
