'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('SuggestedReferences', {
            suggested_ref_id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            ilo_reference_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'ILOReferences', // Name of target table
                    key: 'ilo_reference_id'  // Target table's PK from models/iloReference.js
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            reference_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'References',    // Name of target table
                    key: 'reference_id'     // Target table's PK
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE
            }
        });

        // Composite index ensures the Library Director cannot duplicate suggestions
        await queryInterface.addIndex('SuggestedReferences', ['ilo_reference_id', 'reference_id'], {
            unique: true,
            name: 'unique_suggested_reference_pairing'
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('SuggestedReferences');
    }
};