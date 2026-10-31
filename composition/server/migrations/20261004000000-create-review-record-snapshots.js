'use strict';

// A frozen copy of what a review record is built from, taken when the Dean approves a plan: its comments, the
// labels of the outcomes they refer to, and the titles of the references, topics and activities they point at.
// Without it an approved record would quietly change when a reference is renamed or outcomes are renumbered.
// One row per approved offering. No foreign key on purpose, like the other bookkeeping tables.

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('ReviewRecordSnapshots', {
            offering_id: { type: Sequelize.INTEGER, primaryKey: true, allowNull: false },
            payload: { type: Sequelize.TEXT, allowNull: false },
            createdAt: { type: Sequelize.DATE, allowNull: false }
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('ReviewRecordSnapshots');
    }
};
