'use strict';

export default {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('role', [
      { role_name: 'Admin', date_created: new Date() },
      { role_name: 'User', date_created: new Date() },
      { role_name: 'Manager', date_created: new Date() }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('role', null, {});
  }
};
