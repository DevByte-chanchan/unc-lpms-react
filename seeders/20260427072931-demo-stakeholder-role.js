'use strict';

export default {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('stakeholder_role', [
      {
        stakeholder_id: 'STKH001',
        role_id: 1,
        role_status: 'active',
        date_created: new Date()
      },
      {
        stakeholder_id: 'STKH002',
        role_id: 2,
        role_status: 'active',
        date_created: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('stakeholder_role', null, {});
  }
};
