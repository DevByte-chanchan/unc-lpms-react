'use strict';

// Which industry consultant the Program Head has assigned to a course. A consultant has
// read access and may comment; their comments are documentation and never block the chain.
//
// Assignments are deactivated, never deleted: the row (and who assigned whom, and when it
// ended) stays as part of the accreditation trail. Re-assigning the same consultant
// reactivates the same row, so (course, consultant) is unique.

module.exports = {
    async up(queryInterface, Sequelize) {
        const tables = await queryInterface.showAllTables();
        if ((tables || []).map(t => (typeof t === 'string' ? t : t.tableName)).includes('CourseConsultants')) return;
        await queryInterface.createTable('CourseConsultants', {
            course_consultant_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            course_id: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'Courses', key: 'course_id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT'
            },
            consultant_user_id: { type: Sequelize.INTEGER, allowNull: false },
            assigned_by_user_id: { type: Sequelize.INTEGER, allowNull: true },
            is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            deactivated_at: { type: Sequelize.DATE, allowNull: true },
            deactivated_by_user_id: { type: Sequelize.INTEGER, allowNull: true },
            createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        });
        await queryInterface.addIndex('CourseConsultants', ['course_id', 'consultant_user_id'], {
            unique: true,
            name: 'course_consultants_course_consultant_unique',
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('CourseConsultants');
    }
};
