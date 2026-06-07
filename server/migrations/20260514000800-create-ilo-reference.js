'use strict';
/** Migration: create ILO_Reference join table (reference_id <-> ilo_id) */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('ILOReferences', {
            ilo_reference_id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            reference_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'References',
                    key: 'reference_id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            ilo_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'IntendedLearningOutcomes',
                    key: 'ilo_id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
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
        await queryInterface.dropTable('ILOReferences');
    }
};
