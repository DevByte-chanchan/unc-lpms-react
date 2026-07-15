'use strict';
/** Migration: create Programs */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Programs', {
            program_id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            dept_id: {                   // internal FK -> Departments
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'Departments', key: 'dept_id' },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT'
            },
            name: {
                type: Sequelize.STRING(100),
                allowNull: false
            },
            stakeholder_id: {            // references lpms_users; plain attribute
                type: Sequelize.INTEGER,
                allowNull: true
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
        await queryInterface.dropTable('Programs');
    }
};
