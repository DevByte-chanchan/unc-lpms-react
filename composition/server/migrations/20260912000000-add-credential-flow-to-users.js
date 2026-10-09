'use strict';

// Credential flow: an admin-issued temporary password must be changed at first sign-in and
// stops working after 72 hours. Existing accounts are unaffected (must_change_password = 0).
//
// Native ALTER TABLE on purpose: Sequelize's removeColumn rebuilds the table on SQLite, which
// cascade-deletes dependent rows.

const COLUMNS = [
    ['must_change_password', 'BOOLEAN NOT NULL DEFAULT 0'],
    ['password_changed_at', 'DATETIME'],
    ['temp_password_expires_at', 'DATETIME']
];

module.exports = {
    async up(queryInterface) {
        const [rows] = await queryInterface.sequelize.query('PRAGMA table_info(Users)');
        const existing = new Set(rows.map(r => r.name));
        for (const [name, definition] of COLUMNS) {
            if (!existing.has(name)) await queryInterface.sequelize.query(`ALTER TABLE Users ADD COLUMN ${name} ${definition}`);
        }
    },

    async down(queryInterface) {
        for (const [name] of COLUMNS) {
            await queryInterface.sequelize.query(`ALTER TABLE Users DROP COLUMN ${name}`);
        }
    }
};
