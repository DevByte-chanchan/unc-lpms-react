'use strict';

// The syllabus deadline of a term, and the bookkeeping the automatic reminders need.
//
//   TermDeadlines   one due date per program, school year and semester. The Program Head (for the
//                   programs they head) and the Dean (for their department's programs) set it.
//   ReminderLog     one row for every reminder the system sent, keyed by subject, kind and day, so a
//                   restart or a second run on the same day never sends it twice.
//   ReminderPauses  a plan whose reminders the Program Head has paused.
//
// No foreign keys on purpose, like Sessions: a row left behind for a removed program or offering is
// ignored, and removing it would need no cascade.

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('TermDeadlines', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            program_id: { type: Sequelize.INTEGER, allowNull: false },
            school_year: { type: Sequelize.STRING(9), allowNull: false },
            semester: { type: Sequelize.STRING(10), allowNull: false },
            syllabus_due: { type: Sequelize.DATEONLY, allowNull: false },
            set_by: { type: Sequelize.INTEGER, allowNull: true },
            createdAt: { type: Sequelize.DATE, allowNull: false },
            updatedAt: { type: Sequelize.DATE, allowNull: false }
        });
        await queryInterface.addIndex('TermDeadlines', ['program_id', 'school_year', 'semester'], { name: 'term_deadlines_one_per_term', unique: true });

        await queryInterface.createTable('ReminderLog', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            subject: { type: Sequelize.STRING(60), allowNull: false },
            kind: { type: Sequelize.STRING(30), allowNull: false },
            day: { type: Sequelize.DATEONLY, allowNull: false },
            createdAt: { type: Sequelize.DATE, allowNull: false }
        });
        await queryInterface.addIndex('ReminderLog', ['subject', 'kind', 'day'], { name: 'reminder_log_once_a_day', unique: true });

        await queryInterface.createTable('ReminderPauses', {
            offering_id: { type: Sequelize.INTEGER, primaryKey: true, allowNull: false },
            paused_by: { type: Sequelize.INTEGER, allowNull: true },
            createdAt: { type: Sequelize.DATE, allowNull: false }
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('ReminderPauses');
        await queryInterface.dropTable('ReminderLog');
        await queryInterface.dropTable('TermDeadlines');
    }
};
