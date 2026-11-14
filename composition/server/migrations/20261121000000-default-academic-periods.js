'use strict';

// An existing database gets the academic_periods table (20260528000000) but never its seeder, so the instructor
// dashboard would show "No active term". This adds the same two default periods when the table is still empty.
const seeder = require('../seeders/20260529000000-seed-academic-periods.js');

module.exports = {
    async up(queryInterface, Sequelize) {
        await seeder.up(queryInterface, Sequelize);
    },
    async down() {
        // The periods may have been edited since; leave them.
    }
};
