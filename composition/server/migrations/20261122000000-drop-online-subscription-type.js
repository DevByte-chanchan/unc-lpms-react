'use strict';

// Online Subscription is no longer a reference type (2026-11-15). Any reference still stored with it
// becomes an Online Resource: both need a title and a link, so nothing is lost.
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(
            "UPDATE `References` SET type = 'Online Resource' WHERE type = 'Online Subscription'"
        );
    },

    // ponytail: one-way; the old subscription rows cannot be told apart once converted.
    async down() {}
};
