'use strict';
/** Migration: create CourseOfferingAssignments */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('CourseOfferingAssignments', {
            co_assign_id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            pc_offering_id: {            // FK -> ProgramCourseOfferings
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'ProgramCourseOfferings', key: 'pc_offering_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            stakeholder_id: {            // references lpms_users; plain attribute (varchar per ERD)
                type: Sequelize.STRING(20),
                allowNull: true
            },
            date_assigned: { type: Sequelize.DATE, allowNull: true },
            date_submitted: { type: Sequelize.DATE, allowNull: true },
            date_updated: { type: Sequelize.DATE, allowNull: true },
            ph_date_returned: { type: Sequelize.DATE, allowNull: true },
            ic_date_returned: { type: Sequelize.DATE, allowNull: true },
            ld_date_returned: { type: Sequelize.DATE, allowNull: true },
            d_date_returned: { type: Sequelize.DATE, allowNull: true },
            ph_date_accepted: { type: Sequelize.DATE, allowNull: true },
            ic_date_accepted: { type: Sequelize.DATE, allowNull: true },
            ld_date_accepted: { type: Sequelize.DATE, allowNull: true },
            d_date_accepted: { type: Sequelize.DATE, allowNull: true },
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
        await queryInterface.dropTable('CourseOfferingAssignments');
    }
};
