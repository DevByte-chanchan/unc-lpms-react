'use strict';

// A copy of a plan's content taken when an approver returns it (utils/planChanges.js), so that after the instructor
// resubmits, the approvers can see exactly what changed instead of re-reading the whole plan. One row per offering,
// replaced at the next return. No foreign key on purpose, like the other bookkeeping tables.

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('PlanReturnSnapshots', {
            offering_id: { type: Sequelize.INTEGER, primaryKey: true, allowNull: false },
            payload: { type: Sequelize.TEXT, allowNull: false },
            createdAt: { type: Sequelize.DATE, allowNull: false }
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('PlanReturnSnapshots');
    }
};
