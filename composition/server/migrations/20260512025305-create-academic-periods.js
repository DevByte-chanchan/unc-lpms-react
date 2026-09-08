'use strict';
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('AcademicPeriods', {
            academic_period_id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            start_date: {
                type: Sequelize.DATEONLY,
                allowNull: false
            },
            end_date: {
                type: Sequelize.DATEONLY,
                allowNull: false
            },
            midterm_deadline: {
                type: Sequelize.DATEONLY,
                allowNull: true
            },
            finals_deadline: {
                type: Sequelize.DATEONLY,
                allowNull: true
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('AcademicPeriods');
    }
};
