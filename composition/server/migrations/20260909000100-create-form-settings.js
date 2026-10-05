'use strict';

// The ISO "form" identity printed on every exported document: the form's document control
// number, its ISO revision number and its effectivity date. These belong to the FORM, not to
// a syllabus, and change only when the institution reissues the form, so they live in one
// table the Dean can update instead of being typed into the page templates.
// (A syllabus's own revision number is separate and stays in the body of the syllabus.)
//
// Seeded with the values the templates carried before. down() drops the table.

const DEFAULTS = [
    { form_key: 'syllabus', doc_control_no: 'UNC-FM-VPAA-01', revision_no: '0', effectivity: '06/01/2024' },
    { form_key: 'coaep', doc_control_no: 'UNC-FM-VPAA-02', revision_no: '0', effectivity: '06/01/2024' },
];

module.exports = {
    async up(queryInterface, Sequelize) {
        const tables = await queryInterface.showAllTables();
        if (!tables.map(t => (typeof t === 'string' ? t : t.tableName)).includes('FormSettings')) {
            await queryInterface.createTable('FormSettings', {
                form_key: { type: Sequelize.STRING(30), primaryKey: true, allowNull: false },
                doc_control_no: { type: Sequelize.STRING(30), allowNull: false },
                revision_no: { type: Sequelize.STRING(10), allowNull: false },
                effectivity: { type: Sequelize.STRING(10), allowNull: false },
                updated_by_name: { type: Sequelize.STRING(100), allowNull: true },
                createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
                updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            });
        }
        const now = new Date();
        for (const row of DEFAULTS) {
            const [existing] = await queryInterface.sequelize.query('SELECT form_key FROM FormSettings WHERE form_key = ?', { replacements: [row.form_key] });
            if (existing.length === 0) await queryInterface.bulkInsert('FormSettings', [{ ...row, createdAt: now, updatedAt: now }]);
        }
    },

    async down(queryInterface) {
        await queryInterface.dropTable('FormSettings');
    }
};
