'use strict';

const INDEX_NAME = 'course_offering_assignments_pc_offering_unique';

module.exports = {
    async up(queryInterface) {
        await queryInterface.addIndex('CourseOfferingAssignments', ['pc_offering_id'], {
            name: INDEX_NAME,
            unique: true
        });
    },

    async down(queryInterface) {
        await queryInterface.removeIndex('CourseOfferingAssignments', INDEX_NAME);
    }
};
