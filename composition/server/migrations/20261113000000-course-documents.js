'use strict';

// CourseDocuments: a Program Head's own file for one course offering, beside the table generated from the
// instructor's plan. kind 'co-po' (CO and PO alignment) or 'coaep'. When one is uploaded, View / Export shows the
// uploaded file instead of the generated table; the instructor's plan is never changed. One file per offering and kind.

module.exports = {
    async up(queryInterface, Sequelize) {
        const tables = await queryInterface.showAllTables();
        if (tables.includes('CourseDocuments')) return;
        await queryInterface.createTable('CourseDocuments', {
            course_document_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            pc_offering_id: { type: Sequelize.INTEGER, allowNull: false },
            kind: { type: Sequelize.STRING(10), allowNull: false },
            file_name: { type: Sequelize.STRING(200), allowNull: false },
            content_type: { type: Sequelize.STRING(100), allowNull: false },
            data: { type: Sequelize.BLOB, allowNull: false },
            uploaded_by: { type: Sequelize.INTEGER, allowNull: true },
            updatedAt: { type: Sequelize.DATE, allowNull: false },
        });
        await queryInterface.addIndex('CourseDocuments', ['pc_offering_id', 'kind'], { unique: true });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('CourseDocuments');
    },
};
