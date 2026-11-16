'use strict';

// A due date's own reminder schedule. remind_before: the days before the due date a reminder goes out, comma
// separated ("7,3,1,0", 0 = on the day). overdue_every: after the due date, a reminder every this many days (0 = none).
// Both empty: the defaults in config/reminders.js.
module.exports = {
    async up(queryInterface, Sequelize) {
        const columns = await queryInterface.describeTable('TermDeadlines');
        if (!columns.remind_before) await queryInterface.addColumn('TermDeadlines', 'remind_before', { type: Sequelize.STRING(40), allowNull: true });
        if (!columns.overdue_every) await queryInterface.addColumn('TermDeadlines', 'overdue_every', { type: Sequelize.INTEGER, allowNull: true });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('TermDeadlines', 'overdue_every');
        await queryInterface.removeColumn('TermDeadlines', 'remind_before');
    }
};
