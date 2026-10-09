'use strict';

// A poke used to remind a reviewer ("reminder: review pending by Program Head"). It now reminds an
// instructor to submit their plan, so the old reviewer reminders are obsolete: remove them from
// everyone's notification list. Only poke notifications with that exact old wording are touched.

module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(
            "DELETE FROM Notifications WHERE type = 'poke' AND message LIKE '%reminder: review pending%';"
        );
    },

    async down() {
        // The deleted reminders cannot be restored, and nothing creates them any more.
    }
};
