'use strict';
/** Migration: create WeeklyReferences join table (week_id <-> reference_id) */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('WeeklyReferences', {
            weekly_reference_id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            week_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'Weeks',
                    key: 'week_id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
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
            is_orientation: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
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
        await queryInterface.dropTable('WeeklyReferences');
    }
};
