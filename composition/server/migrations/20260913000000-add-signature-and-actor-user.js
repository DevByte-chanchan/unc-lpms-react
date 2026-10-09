'use strict';

// E-signature metadata on Users (the image itself is an encrypted file on disk; nothing but
// metadata lives in the database) and the id of the user who performed each workflow action, so
// an approval can be tied to the person's signature. Older log rows keep actor_user_id NULL.
//
// Native ALTER TABLE on purpose: Sequelize's removeColumn rebuilds the table on SQLite, which
// cascade-deletes dependent rows.

const USER_COLUMNS = [
    ['signature_path', 'VARCHAR(80)'],
    ['signature_mime', 'VARCHAR(20)'],
    ['signature_iv', 'VARCHAR(32)'],
    ['signature_tag', 'VARCHAR(32)'],
    ['signature_key_version', 'INTEGER'],
    ['signature_updated_at', 'DATETIME']
];

const addMissing = async (queryInterface, table, columns) => {
    const [rows] = await queryInterface.sequelize.query(`PRAGMA table_info(${table})`);
    const existing = new Set(rows.map(r => r.name));
    for (const [name, definition] of columns) {
        if (!existing.has(name)) await queryInterface.sequelize.query(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
    }
};

module.exports = {
    async up(queryInterface) {
        await addMissing(queryInterface, 'Users', USER_COLUMNS);
        await addMissing(queryInterface, 'AssignmentWorkflowLogs', [['actor_user_id', 'INTEGER']]);
    },

    async down(queryInterface) {
        for (const [name] of USER_COLUMNS) await queryInterface.sequelize.query(`ALTER TABLE Users DROP COLUMN ${name}`);
        await queryInterface.sequelize.query('ALTER TABLE AssignmentWorkflowLogs DROP COLUMN actor_user_id');
    }
};
