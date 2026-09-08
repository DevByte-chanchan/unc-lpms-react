'use strict';
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('DepartmentAcademicPeriods', {
            department_academic_period_id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            dept_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'Departments',
                    key: 'dept_id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            academic_period_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'AcademicPeriods',
                    key: 'academic_period_id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
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
        await queryInterface.dropTable('DepartmentAcademicPeriods');
    }
};
