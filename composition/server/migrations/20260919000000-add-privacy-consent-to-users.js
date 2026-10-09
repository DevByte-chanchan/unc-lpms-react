'use strict';

// Records which version of the Privacy Notice a person accepted when they registered, and when.
// Accounts created before this (or created by an administrator, not by registration) have neither.
//
// Native ALTER TABLE: Sequelize's removeColumn rebuilds the table on SQLite, which would cascade-delete
// dependent rows.

const COLUMNS = [
    ['privacy_consent_version', 'VARCHAR(20)'],
    ['privacy_consent_at', 'DATETIME']
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
