'use strict';
/** Migration: create ProgramOutcomes */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('ProgramOutcomes', {
            po_id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            program_id: {                // FK -> Programs
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'Programs', key: 'program_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            description: {
                type: Sequelize.STRING(200),
                allowNull: false
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
    },
    async down(queryInterface) {
        await queryInterface.dropTable('ProgramOutcomes');
    }
};
