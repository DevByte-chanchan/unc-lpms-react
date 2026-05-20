'use strict';
/** Migration: create Prerequisites */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Prerequisites', {
            prerequisite_id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            course_id: {                 // FK -> Courses (the course that requires a prerequisite)
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'Courses', key: 'course_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            prerequisite_course_id: {    // FK -> Courses (the course that is the prerequisite)
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'Courses', key: 'course_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
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
        await queryInterface.dropTable('Prerequisites');
    }
};
