'use strict';

export default {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('stakeholder', [
      {
        stakeholder_id: 'STKH001',
        sh_role_id: 1, // references role_id from role table
        last_name: 'Dela Cruz',
        first_name: 'Juan',
        birth_date: new Date('1990-01-01'),
        sex: 'Male',
        email: 'juan@example.com',
        contact_number: '09171234567'
      },
      {
        stakeholder_id: 'STKH002',
        sh_role_id: 2,
        last_name: 'Santos',
        first_name: 'Maria',
        birth_date: new Date('1992-05-15'),
        sex: 'Female',
        email: 'maria@example.com',
        contact_number: '09179876543'
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('stakeholder', null, {});
  }
};
