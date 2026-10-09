'use strict';

// Demo of the term carry-over: the Program Head assigns BIT213L to the lead instructor for the
// next term. The course has an approved syllabus (Rev 2), so the assignment carries it over
// automatically: a copy with the same revision number and identical content, shown as
// "Carried over (Rev 2)". The instructor can then start a revision from it.
//
// Goes through the same service the API uses, so the demo data is built by the real rules.
// Runs after the demo accounts exist (they are looked up by email).

module.exports = {
    async up(queryInterface) {
        const { assignCourseForTerm } = require('../services/offeringService');
        const select = (sql) => queryInterface.sequelize.query(sql, { type: queryInterface.sequelize.QueryTypes.SELECT });

        const [programHead] = await select(`SELECT user_id, name FROM Users WHERE email = 'junar.danila@unc.edu.ph'`);
        const [instructor] = await select(`SELECT user_id FROM Users WHERE email = 'monica.norton@unc.edu.ph'`);
        const [offering] = await select(
            `SELECT pco.course_id, pco.program_id FROM ProgramCourseOfferings pco
             INNER JOIN Courses c ON c.course_id = pco.course_id
             WHERE c.course_no = 'BIT213L' ORDER BY pco.revision_number DESC LIMIT 1`);
        if (!programHead || !instructor || !offering) {
            console.warn('Carry-over demo skipped: the demo accounts or BIT213L are not seeded.');
            return;
        }

        const result = await assignCourseForTerm({
            courseId: offering.course_id,
            programId: offering.program_id,
            schoolYear: '2027-2028',
            semester: '1st',
            instructorUserId: instructor.user_id,
            user: { id: programHead.user_id, name: programHead.name },
        });
        console.log(`Carried BIT213L over to 2027-2028 1st semester as offering ${result.offeringId} (Rev ${result.revision}).`);
    },

    async down() {
        console.warn('The carried-over offering is part of the assignment history; remove it by rebuilding the database.');
    }
};
