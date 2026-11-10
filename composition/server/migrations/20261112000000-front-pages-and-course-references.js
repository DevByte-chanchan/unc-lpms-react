'use strict';

// ProgramFrontPages: each program's first three syllabus pages (University; Department / Program and PEOs; POs and
// PEOs) as the PDF its Program Head uploads. The approved learning plan export puts it in front of the generated
// pages (course details to signatures). One file per program, kept in the database (a few hundred KB).
//
// CourseReferences: the references the Director of Libraries files under a course (Department > Program > Course),
// so the library's titles are organised per course, not only per department.

module.exports = {
    async up(queryInterface, Sequelize) {
        const tables = await queryInterface.showAllTables();
        if (!tables.includes('ProgramFrontPages')) {
            await queryInterface.createTable('ProgramFrontPages', {
                program_id: { type: Sequelize.INTEGER, primaryKey: true },
                file_name: { type: Sequelize.STRING(200), allowNull: true },
                pdf: { type: Sequelize.BLOB, allowNull: false },
                uploaded_by: { type: Sequelize.INTEGER, allowNull: true },
                updatedAt: { type: Sequelize.DATE, allowNull: false },
            });
        }
        if (!tables.includes('CourseReferences')) {
            await queryInterface.createTable('CourseReferences', {
                course_reference_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
                course_id: { type: Sequelize.INTEGER, allowNull: false },
                reference_id: { type: Sequelize.INTEGER, allowNull: false },
                added_by: { type: Sequelize.INTEGER, allowNull: true },
                createdAt: { type: Sequelize.DATE, allowNull: false },
            });
            await queryInterface.addIndex('CourseReferences', ['course_id', 'reference_id'], { unique: true });
        }
    },

    async down(queryInterface) {
        await queryInterface.dropTable('ProgramFrontPages');
        await queryInterface.dropTable('CourseReferences');
    },
};
