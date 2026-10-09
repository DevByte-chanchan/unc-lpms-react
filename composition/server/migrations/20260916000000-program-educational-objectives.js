'use strict';

// Program-level master data kept by the Program Head: the program's educational objectives
// (PEOs, each marked as related to the UNC mission statement) and, per program outcome, which PEOs
// and graduate attributes it supports. Marks are stored as JSON arrays of numbers on the outcome:
// PEO numbers follow the PEO order, graduate attributes are 1..4 (EC, CL, ERC, LL).
//
// Native ALTER TABLE: Sequelize's removeColumn rebuilds the table on SQLite, which would
// cascade-delete the CO-PO alignments that reference ProgramOutcomes.

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('ProgramEducationalObjectives', {
            peo_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            program_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'Programs', key: 'program_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            statement: { type: Sequelize.STRING(500), allowNull: false },
            mission_aligned: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        const columns = await queryInterface.describeTable('ProgramOutcomes');
        for (const name of ['peo_numbers', 'ga_numbers']) {
            if (!columns[name]) {
                await queryInterface.sequelize.query(`ALTER TABLE ProgramOutcomes ADD COLUMN ${name} TEXT NOT NULL DEFAULT '[]';`);
            }
        }
    },

    async down(queryInterface) {
        await queryInterface.dropTable('ProgramEducationalObjectives');
        // The two ProgramOutcomes columns are left in place: dropping them would rebuild the table.
    }
};
