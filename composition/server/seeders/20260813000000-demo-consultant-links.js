'use strict';

// The weekly demo plans carry Industry Consultant comments, but a consultant reads only the courses they are
// assigned to (CourseConsultants), and no demo course had one, so the demo consultant account saw nothing.
// Link the demo consultant to every course whose plans have consultant comments, assigned by the Program Head,
// and put the consultant's name on those comments. Runs after 20260812000000-demo-users (it needs the accounts).

module.exports = {
    async up(queryInterface) {
        const { sequelize } = queryInterface;
        const select = (sql, replacements = []) => sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT });
        const [consultant] = await select("SELECT user_id, name FROM Users WHERE role = 'industry-consultant' ORDER BY user_id LIMIT 1");
        if (!consultant) return;
        const [head] = await select("SELECT user_id FROM Users WHERE role = 'program-head' ORDER BY user_id LIMIT 1");

        const courses = await select(
            `SELECT DISTINCT pco.course_id
             FROM Comments c
                 INNER JOIN CourseOfferingAssignments a ON a.co_assign_id = c.co_assign_id
                 INNER JOIN ProgramCourseOfferings pco ON pco.pc_offering_id = a.pc_offering_id
             WHERE c.commenter_role = 'INDUSTRY_CONSULTANT'`);
        const now = new Date();
        for (const { course_id: courseId } of courses) {
            const [existing] = await select('SELECT 1 AS x FROM CourseConsultants WHERE course_id = ? AND consultant_user_id = ?',
                [courseId, consultant.user_id]);
            if (existing) continue;
            await queryInterface.bulkInsert('CourseConsultants', [{
                course_id: courseId,
                consultant_user_id: consultant.user_id,
                assigned_by_user_id: head ? head.user_id : null,
                is_active: true,
                createdAt: now,
                updatedAt: now
            }], {});
        }

        await sequelize.query(
            `UPDATE Comments SET commenter_user_id = ?, commenter_name = COALESCE(commenter_name, ?)
             WHERE commenter_role = 'INDUSTRY_CONSULTANT' AND commenter_user_id IS NULL`,
            { replacements: [consultant.user_id, consultant.name] });
        // And the Program Head's name on the comments that came with a converted consultant return (20260811).
        if (head) {
            await sequelize.query(
                `UPDATE Comments SET commenter_user_id = ?, commenter_name = COALESCE(commenter_name, (SELECT name FROM Users WHERE user_id = ?))
                 WHERE commenter_role = 'PROGRAM_HEAD' AND commenter_user_id IS NULL`,
                { replacements: [head.user_id, head.user_id] });
        }
    },

    async down() {
        // Demo data only; undo by re-seeding.
    }
};
