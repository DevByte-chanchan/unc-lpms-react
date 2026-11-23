'use strict';

// Title requests (approver plan 4.4): an instructor asks the Director of Libraries for a title the library does
// not have; the Director adds it to the library (the request then names that reference) or declines it with a
// reason. The instructor is told either way.

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('TitleRequests', {
            request_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            title: { type: Sequelize.STRING(300), allowNull: false },
            authors: { type: Sequelize.STRING(300), allowNull: true },
            note: { type: Sequelize.STRING(1000), allowNull: true },
            // the plan it is for, when asked from a plan (it names the course for the Director)
            pc_offering_id: { type: Sequelize.INTEGER, allowNull: true },
            requested_by: { type: Sequelize.INTEGER, allowNull: false },
            status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'pending' },
            reason: { type: Sequelize.STRING(1000), allowNull: true },
            reference_id: { type: Sequelize.INTEGER, allowNull: true },
            decided_by: { type: Sequelize.INTEGER, allowNull: true },
            decided_at: { type: Sequelize.DATE, allowNull: true },
            createdAt: { type: Sequelize.DATE, allowNull: false },
            updatedAt: { type: Sequelize.DATE, allowNull: false }
        });
        await queryInterface.addIndex('TitleRequests', ['status']);
        await queryInterface.addIndex('TitleRequests', ['requested_by']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('TitleRequests');
    }
};
