'use strict';

// Panel feedback (Nov 2026): the Director of Libraries allows titles older than the recency window when a subject
// has nothing newer; they check them and want them highlighted, not refused. So older titles stay attachable and
// are flagged. The Director can still turn blocking back on in Reference rules.

module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query('UPDATE CatalogSettings SET enforce_recency = 0 WHERE id = 1');
    },
    async down(queryInterface) {
        await queryInterface.sequelize.query('UPDATE CatalogSettings SET enforce_recency = 1 WHERE id = 1');
    }
};
