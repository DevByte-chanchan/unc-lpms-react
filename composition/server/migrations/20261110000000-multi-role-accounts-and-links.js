'use strict';

// The account rules of feature/course-assignment, on this app's Users table (ids unchanged, so plans, comments,
// logs and notifications still point at the same people):
//   - Users.roles      one account, several roles: a JSON list of role keys; Users.role stays the first one
//   - Users.failed_attempts / locked_until   the sign-in lockout kept in the database (5 tries, 15 minutes)
//   - AccountInvitations   "set your password" links e-mailed to a new account
//   - PasswordResets       "forgot password" / "send password reset" links (1 hour, single use)
// Only the SHA-256 of a link token is stored. Native ADD COLUMN, so SQLite does not rebuild the Users table.

module.exports = {
    async up(queryInterface, Sequelize) {
        const users = await queryInterface.describeTable('Users');
        const add = async (column, sql) => {
            if (!users[column]) await queryInterface.sequelize.query(`ALTER TABLE Users ADD COLUMN ${column} ${sql};`);
        };
        await add('roles', 'TEXT');
        await add('failed_attempts', 'INTEGER NOT NULL DEFAULT 0');
        await add('locked_until', 'DATETIME');
        // Every existing account keeps exactly the role it had.
        await queryInterface.sequelize.query(
            `UPDATE Users SET roles = '["' || role || '"]' WHERE roles IS NULL OR roles = '';`);

        const tables = await queryInterface.showAllTables();
        if (!tables.includes('AccountInvitations')) {
            await queryInterface.createTable('AccountInvitations', {
                account_invitation_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
                user_id: { type: Sequelize.INTEGER, allowNull: false },
                email: { type: Sequelize.STRING(160), allowNull: false },
                sent_by_user_id: { type: Sequelize.INTEGER, allowNull: true },
                // sent | failed | cancelled | accepted
                status: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'sent' },
                last_error: { type: Sequelize.STRING(255), allowNull: true },
                sent_at: { type: Sequelize.DATE, allowNull: true },
                accepted_at: { type: Sequelize.DATE, allowNull: true },
                token_hash: { type: Sequelize.STRING(64), allowNull: true },
                expires_at: { type: Sequelize.DATE, allowNull: true },
                createdAt: { type: Sequelize.DATE, allowNull: false },
                updatedAt: { type: Sequelize.DATE, allowNull: false }
            });
            await queryInterface.addIndex('AccountInvitations', ['token_hash'], { name: 'account_invitations_token_hash' });
            await queryInterface.addIndex('AccountInvitations', ['user_id'], { name: 'account_invitations_user' });
        }
        if (!tables.includes('PasswordResets')) {
            await queryInterface.createTable('PasswordResets', {
                password_reset_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
                user_id: { type: Sequelize.INTEGER, allowNull: false },
                token_hash: { type: Sequelize.STRING(64), allowNull: false },
                expires_at: { type: Sequelize.DATE, allowNull: false },
                used_at: { type: Sequelize.DATE, allowNull: true },
                requested_ip: { type: Sequelize.STRING(64), allowNull: true },
                createdAt: { type: Sequelize.DATE, allowNull: false },
                updatedAt: { type: Sequelize.DATE, allowNull: false }
            });
            await queryInterface.addIndex('PasswordResets', ['token_hash'], { name: 'password_resets_token_hash' });
            await queryInterface.addIndex('PasswordResets', ['user_id'], { name: 'password_resets_user' });
        }
    },

    async down(queryInterface) {
        await queryInterface.dropTable('PasswordResets');
        await queryInterface.dropTable('AccountInvitations');
        // The Users columns stay (dropping them would rebuild the table on SQLite); roles is ignored by older code.
    }
};
