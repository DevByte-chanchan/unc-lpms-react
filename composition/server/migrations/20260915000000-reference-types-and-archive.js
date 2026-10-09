'use strict';

// References: archive flag, who created a reference, a publisher / provider column, and the
// free-text `type` values normalized to the keys in config/referenceTypes.js.
//
// Types are mapped by exact (case-insensitive) match only. A value that matches nothing is left
// as it is and reported, never guessed at; the Director fixes it by editing the reference.
//
// Native ALTER TABLE: Sequelize's removeColumn rebuilds the table on SQLite, which would
// cascade-delete dependent rows.

const { LEGACY_TYPES } = require('../config/referenceTypes');

const COLUMNS = [
    ['archived', 'BOOLEAN NOT NULL DEFAULT 0'],
    ['created_by', 'INTEGER'],
    ['publisher', 'VARCHAR(200)']
];

module.exports = {
    async up(queryInterface) {
        const sql = (text, replacements = []) => queryInterface.sequelize.query(text, { replacements });
        const [info] = await sql('PRAGMA table_info(`References`)');
        const existing = new Set(info.map(c => c.name));
        for (const [name, definition] of COLUMNS) {
            if (!existing.has(name)) await sql(`ALTER TABLE \`References\` ADD COLUMN ${name} ${definition}`);
        }

        for (const [legacy, key] of Object.entries(LEGACY_TYPES)) {
            await sql('UPDATE `References` SET type = ? WHERE LOWER(TRIM(type)) = ? AND type <> ?', [key, legacy, key]);
        }

        const [unmapped] = await sql(
            'SELECT type, COUNT(*) AS n FROM `References` WHERE type NOT IN (?, ?, ?, ?) GROUP BY type',
            ['Textbook', 'OER', 'Online Resource', 'Online Subscription']
        );
        if (unmapped.length) {
            console.warn('References with an unrecognised type were left unchanged (edit them to classify):',
                unmapped.map(row => `"${row.type}" x${row.n}`).join(', '));
        }
    },

    async down(queryInterface) {
        // Types stay normalized; only the added columns are removed.
        for (const [name] of COLUMNS) {
            await queryInterface.sequelize.query(`ALTER TABLE \`References\` DROP COLUMN ${name}`);
        }
    }
};
