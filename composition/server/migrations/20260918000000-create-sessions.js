'use strict';

// Sign-in sessions, so they survive a server restart. A row holds only what is needed to recognise
// the browser and apply the 8-hour limit: the SHA-256 of the session token (never the token itself),
// the user's id and role, and when it was created and when it expires (epoch milliseconds).
// The account's name, e-mail and active state are read from Users on every request, as before.
//
// No foreign key on purpose: removing or deactivating a user already revokes their sessions in code,
// and a row left behind for a deleted user is refused at the next request and removed.

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Sessions', {
            token_hash: { type: Sequelize.STRING(64), primaryKey: true, allowNull: false },
            user_id: { type: Sequelize.INTEGER, allowNull: false },
            role: { type: Sequelize.STRING(40), allowNull: false },
            created_at: { type: Sequelize.BIGINT, allowNull: false },
            expires_at: { type: Sequelize.BIGINT, allowNull: false }
        });
        await queryInterface.addIndex('Sessions', ['user_id'], { name: 'sessions_user_id' });
        await queryInterface.addIndex('Sessions', ['expires_at'], { name: 'sessions_expires_at' });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('Sessions');
    }
};
