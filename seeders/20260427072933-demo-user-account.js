'use strict';

export default {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('user_account', [
      {
        stakeholder_id: 'STKH001',
        password: 'hashedpassword123',
        account_status: 'active',
        date_created: new Date()
      },
      {
        stakeholder_id: 'STKH002',
        password: 'hashedpassword456',
        account_status: 'inactive',
        date_created: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('user_account', null, {});
  }
};
