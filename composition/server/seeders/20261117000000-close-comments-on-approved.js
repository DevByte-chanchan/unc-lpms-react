'use strict';

// The demo seeders insert approved plans with open comments; an approved plan has none (utils/closeApprovedComments.js).
// Runs last, after the demo-users seeder has set the approval dates.
const { closeApprovedComments } = require('../utils/closeApprovedComments');

module.exports = {
    async up(queryInterface) {
        await closeApprovedComments(queryInterface.sequelize);
    },

    async down() {
        // Demo data only; undo by re-seeding.
    }
};
