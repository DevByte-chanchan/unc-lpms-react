'use strict';

// What the library holds for each reference: how many copies (empty = not known), a status
// (available, lost or withdrawn), a subject category, and the date the library received it.
// Every existing reference becomes 'available' with the rest empty.
//
// Native ALTER TABLE: Sequelize's removeColumn rebuilds the table on SQLite, which would cascade-delete
// dependent rows (the ILOReferences of every plan).

const COLUMNS = [
    ['copies', 'INTEGER'],
    ['status', "VARCHAR(20) NOT NULL DEFAULT 'available'"],
    ['category', 'VARCHAR(50)'],
    ['date_received', 'DATE']
];

module.exports = {
    async up(queryInterface) {
        const [rows] = await queryInterface.sequelize.query('PRAGMA table_info(`References`)');
        const existing = new Set(rows.map(r => r.name));
        for (const [name, definition] of COLUMNS) {
            if (!existing.has(name)) await queryInterface.sequelize.query('ALTER TABLE `References` ADD COLUMN ' + name + ' ' + definition);
        }
    },

    async down(queryInterface) {
        for (const [name] of COLUMNS) {
            await queryInterface.sequelize.query('ALTER TABLE `References` DROP COLUMN ' + name);
        }
    }
};
