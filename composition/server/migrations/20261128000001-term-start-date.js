'use strict';

// Panel feedback (Nov 2026): faculty are told when to start their learning plan, not only when it is due. The
// Program Head sets an optional start date beside the term's due date; on that day every instructor with a plan not
// yet submitted is notified (utils/reminderJob.js).

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('TermDeadlines', 'start_date', { type: Sequelize.DATEONLY, allowNull: true });
    },
    async down(queryInterface) {
        await queryInterface.removeColumn('TermDeadlines', 'start_date');
    }
};
