'use strict';
/** Migration: create Departments */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Departments', {
            dept_id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            stakeholder_id: {            // references lpms_users; stored as plain attribute
                type: Sequelize.INTEGER,
                allowNull: true
            },
            name: {
                type: Sequelize.STRING(50),
                allowNull: false
            },
            code: {
                type: Sequelize.STRING(10),
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
        await queryInterface.dropTable('Departments');
    }
};
