'use strict';
/** Migration: create Courses */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Courses', {
            course_id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            course_no: {
                type: Sequelize.STRING(20),
                allowNull: false
            },
            course_title: {
                type: Sequelize.STRING(100),
                allowNull: false
            },
            credit: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            contact_hrs: {
                type: Sequelize.STRING(2),
                allowNull: false
            },
            classification: {
                type: Sequelize.STRING(50),
                allowNull: false
            },
            cmo: {
                type: Sequelize.STRING(30),
                allowNull: false
            },
            year_lvl: {
                type: Sequelize.STRING(30),
                allowNull: false
            },
            term: {
                type: Sequelize.STRING(30),
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
        await queryInterface.dropTable('Courses');
    }
};
