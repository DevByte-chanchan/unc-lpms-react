'use strict';
/** Migration: create Weeks table (references co_id) */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Weeks', {
            week_id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            co_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'CourseOutcomes',
                    key: 'co_id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            hours: {
                type: Sequelize.DECIMAL(4, 2),
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
        await queryInterface.dropTable('Weeks');
    }
};
