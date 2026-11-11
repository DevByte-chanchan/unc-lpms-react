'use strict';
/** Migration: create Reference table */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('References', {
            reference_id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            course_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'Courses',
                    key: 'course_id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            course_no: {
                type: Sequelize.STRING(20),
                allowNull: true
            },
            title: {
                type: Sequelize.STRING(200),
                allowNull: false
            },
            type: {
                type: Sequelize.STRING(30),
                allowNull: false
            },
            author: {
                type: Sequelize.STRING(200),
                allowNull: true
            },
            isbn: {
                type: Sequelize.STRING(100),
                allowNull: true
            },
            link: {
                type: Sequelize.STRING(500),
                allowNull: true
            },
            publication_year: {
                type: Sequelize.DATE,
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
        await queryInterface.dropTable('References');
    }
};
