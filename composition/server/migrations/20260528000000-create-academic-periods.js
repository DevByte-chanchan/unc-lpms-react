'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('academic_periods', {
            academic_period_id: {
                type: Sequelize.INTEGER.UNSIGNED,
                primaryKey: true,
                autoIncrement: true,
            },
            label: {
                type: Sequelize.STRING(64),
                allowNull: false,
                unique: true,
            },
            school_year: {
                type: Sequelize.STRING(10),
                allowNull: false,
            },
            semester: {
                type: Sequelize.STRING(16),
                allowNull: false,
            },
            is_active: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            sort_order: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            status: {
                type: Sequelize.ENUM('Active', 'Closed'),
                allowNull: false,
                defaultValue: 'Active',
            },
            closed_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            start_date: {
                type: Sequelize.DATEONLY,
                allowNull: true,
            },
            end_date: {
                type: Sequelize.DATEONLY,
                allowNull: true,
            },
            classes_start: {
                type: Sequelize.DATEONLY,
                allowNull: true,
            },
            prelim_exam: {
                type: Sequelize.DATEONLY,
                allowNull: true,
            },
            midterm_exam: {
                type: Sequelize.DATEONLY,
                allowNull: true,
            },
            semifinal_exam: {
                type: Sequelize.DATEONLY,
                allowNull: true,
            },
            final_exam: {
                type: Sequelize.DATEONLY,
                allowNull: true,
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('academic_periods');
    },
};
