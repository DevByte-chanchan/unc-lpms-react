'use strict';

// Comments recorded only the commenter's role. The accreditation review record has to say
// who said what, so store the author's user id and name on each comment, and backfill both
// (and the workflow logs' actor_name) wherever a role maps to exactly one person.
// Additive and idempotent. down() uses native DROP COLUMN (see the ILO migrations).

const { backfillAuthors } = require('../utils/authorBackfill');

module.exports = {
    async up(queryInterface, Sequelize) {
        const columns = await queryInterface.describeTable('Comments');
        if (!columns.commenter_user_id) {
            await queryInterface.addColumn('Comments', 'commenter_user_id', { type: Sequelize.INTEGER, allowNull: true });
        }
        if (!columns.commenter_name) {
            await queryInterface.addColumn('Comments', 'commenter_name', { type: Sequelize.STRING(100), allowNull: true });
        }
        await backfillAuthors(queryInterface);
    },

    async down(queryInterface) {
        const columns = await queryInterface.describeTable('Comments');
        for (const name of ['commenter_user_id', 'commenter_name']) {
            if (columns[name]) await queryInterface.sequelize.query(`ALTER TABLE Comments DROP COLUMN ${name};`);
        }
    }
};
