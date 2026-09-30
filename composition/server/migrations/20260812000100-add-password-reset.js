'use strict';

// Password reset support: two columns on Users.
//
// Additive and reversible — it adds nothing to any other table. A separate
// PasswordResets table would allow a history of requests, but one outstanding
// reset per account is the correct behaviour anyway (requesting a new link
// should invalidate the old one), and two columns express that directly.
//
// Note the column is `reset_token_hash`, not `reset_token`. The raw token goes
// to the user and is never stored: if this database is read by someone who
// should not have it, they still cannot reset anyone's password with what they
// find, because a SHA-256 digest cannot be turned back into the link.

module.exports = {
    async up(queryInterface, Sequelize) {
        const columns = await queryInterface.describeTable('Users');
        if (!columns.reset_token_hash) {
            await queryInterface.addColumn('Users', 'reset_token_hash', {
                type: Sequelize.STRING(64),   // hex SHA-256
                allowNull: true
            });
        }
        if (!columns.reset_expires_at) {
            await queryInterface.addColumn('Users', 'reset_expires_at', {
                type: Sequelize.DATE,
                allowNull: true
            });
        }
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('Users', 'reset_expires_at');
        await queryInterface.removeColumn('Users', 'reset_token_hash');
    }
};
