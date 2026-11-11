'use strict';

/** Migration: add course_id and course_no to References table */
module.exports = {
    async up(queryInterface, Sequelize) {
        const tableInfo = await queryInterface.describeTable('References');
        if (!tableInfo.course_id) {
            await queryInterface.addColumn('References', 'course_id', {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'Courses',
                    key: 'course_id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            });
        }
        if (!tableInfo.course_no) {
            await queryInterface.addColumn('References', 'course_no', {
                type: Sequelize.STRING(20),
                allowNull: true
            });
        }
    },

    async down(queryInterface, Sequelize) {
        const tableInfo = await queryInterface.describeTable('References');
        if (tableInfo.course_id) {
            await queryInterface.removeColumn('References', 'course_id');
        }
        if (tableInfo.course_no) {
            await queryInterface.removeColumn('References', 'course_no');
        }
    }
};
