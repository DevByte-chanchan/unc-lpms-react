'use strict';

// OfficialOfferings: the registrar's Subject Offerings list (the Dean's .xls), imported by the Program Head once
// enrollment ends, one row per course section with the faculty named on it. It sits BESIDE the pre-assignment
// (CourseOfferingAssignments) so the two can be compared; it never changes an assignment by itself. A re-import of
// the same program and term replaces that term's rows.

module.exports = {
    async up(queryInterface, Sequelize) {
        const tables = await queryInterface.showAllTables();
        if (tables.includes('OfficialOfferings')) return;
        await queryInterface.createTable('OfficialOfferings', {
            official_offering_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            program_id: { type: Sequelize.INTEGER, allowNull: false },
            school_year: { type: Sequelize.STRING(9), allowNull: false },
            semester: { type: Sequelize.STRING(10), allowNull: false },
            course_no: { type: Sequelize.STRING(40), allowNull: false },
            section: { type: Sequelize.STRING(20), allowNull: false, defaultValue: '' },
            title: { type: Sequelize.STRING(200), allowNull: true },
            faculty: { type: Sequelize.TEXT, allowNull: false, defaultValue: '[]' }, // JSON list of names, as printed
            imported_by: { type: Sequelize.INTEGER, allowNull: true },
            createdAt: { type: Sequelize.DATE, allowNull: false },
        });
        await queryInterface.addIndex('OfficialOfferings', ['program_id', 'school_year', 'semester']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('OfficialOfferings');
    },
};
