'use strict';

// The demo Program Head also teaches (seeders/20260812000000-demo-users.js: roles program-head + instructor). A database
// seeded before multi-role accounts got just its one role from 20261110000000; this gives it the second, once. Only
// that demo account, and only while it still has exactly the single role the earlier migration wrote, so a role an
// administrator has changed since is left alone.

const EMAIL = 'junar.danila@unc.edu.ph';

module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(
            `UPDATE Users SET roles = '["program-head","instructor"]' WHERE email = ? AND roles = '["program-head"]';`,
            { replacements: [EMAIL] });
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(
            `UPDATE Users SET roles = '["program-head"]' WHERE email = ? AND roles = '["program-head","instructor"]';`,
            { replacements: [EMAIL] });
    },
};
