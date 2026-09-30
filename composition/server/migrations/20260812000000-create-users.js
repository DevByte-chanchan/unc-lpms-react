'use strict';

// Adds the Users table.
//
// This is additive: it creates one new table and touches nothing that already
// exists, so running it against the existing database cannot affect course,
// comment or assignment data. `down` drops only this table.
//
// Before this migration LPMS had no user table at all — accounts lived in the
// browser's localStorage with a 32-bit checksum standing in for a password
// hash. That is the gap this closes.

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Users', {
            user_id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            name: {
                type: Sequelize.STRING(120),
                allowNull: false
            },
            email: {
                type: Sequelize.STRING(160),
                allowNull: false,
                unique: true
            },
            password_hash: {
                // scrypt$N$r$p$salt$hash — see server/utils/password.js
                type: Sequelize.STRING(255),
                allowNull: false
            },
            role: {
                // Deliberately STRING, not ENUM. SQLite has no native ENUM and
                // Sequelize emulates it with a CHECK constraint that cannot be
                // altered later without rebuilding the table — a bad trade for
                // a list that may gain a role. The model validates the value.
                type: Sequelize.STRING(40),
                allowNull: false
            },
            is_active: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true
            },
            last_login_at: {
                type: Sequelize.DATE,
                allowNull: true
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });

        // Login looks an account up by email on every attempt.
        await queryInterface.addIndex('Users', ['email'], {
            name: 'users_email_idx',
            unique: true
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('Users');
    }
};
