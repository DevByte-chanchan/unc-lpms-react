'use strict';
/** Migration: create ProgramOutcomeAlignments */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('ProgramOutcomeAlignments', {
            po_alignment_id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            co_id: {                     // FK -> CourseOutcomes
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'CourseOutcomes', key: 'co_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            po_id: {                     // FK -> ProgramOutcomes
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'ProgramOutcomes', key: 'po_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            attainment_level: {
                type: Sequelize.CHAR(1),
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
        await queryInterface.dropTable('ProgramOutcomeAlignments');
    }
};
