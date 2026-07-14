'use strict';

// Puts one course into a "Pending" state (submitted, awaiting review — no acceptances/returns yet)
// so the approver Pending tab has data. Targets co_assign_id 4 (BIT202) which was Draft.
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(
            `UPDATE CourseOfferingAssignments
                SET date_submitted = '2026-03-18 00:00:00'
              WHERE co_assign_id = 4 AND date_submitted IS NULL;`
        );
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(
            `UPDATE CourseOfferingAssignments
                SET date_submitted = NULL
              WHERE co_assign_id = 4;`
        );
    },
};
