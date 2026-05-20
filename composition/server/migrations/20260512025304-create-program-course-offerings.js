'use strict';
/** Migration: create ProgramCourseOfferings */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('ProgramCourseOfferings', {
            pc_offering_id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            revision_number: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 1
            },
            course_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'Courses', key: 'course_id' },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT'
            },
            program_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'Programs', key: 'program_id' },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT'
            },
            dept_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'Departments', key: 'dept_id' },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT'
            },
            course_description: {
                type: Sequelize.TEXT,
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
        await queryInterface.dropTable('ProgramCourseOfferings');
    }
};
