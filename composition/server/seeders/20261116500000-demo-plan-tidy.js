'use strict';

// Makes the weekly demo plans (seeders 20260512 to 20260528) read like real review history, without editing them:
//   - every week has the course's weekly contact hours (MATH311L is "3 Hrs Lec" but was seeded with 5 h weeks)
//   - comments behind a return are dated just before that return (some were stamped with the seeding time,
//     which put them after the return and in the wrong review round)
//   - every comment carries its type tag, as the comment form writes it ("[Requested revision] ..."):
//       an approver who returned the plan asked for a change; the consultant (never in the approval chain)
//       suggests a topic or TLA; anything else is a note. Shouted prefixes ("REVISION REQUIRED: ") are dropped.
// Runs after the demo-users seeder (workflow logs and approval dates exist) and before 20261117000000.

const { weeklyHours } = require('../utils/planChecks');

const SHOUTED = /^\s*[A-Z][A-Z ]{3,}:\s*/;
const TAGGED = /^\s*\[[^\]]+\]/;

module.exports = {
    async up(queryInterface) {
        const { sequelize } = queryInterface;
        const select = (sql, replacements = []) => sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT });
        const run = (sql, replacements = []) => sequelize.query(sql, { replacements });

        // Hours: each week of a plan gets its course's weekly contact hours.
        const plans = await select(
            `SELECT pco.pc_offering_id AS id, c.contact_hrs FROM ProgramCourseOfferings pco INNER JOIN Courses c ON c.course_id = pco.course_id`);
        for (const plan of plans) {
            const hours = weeklyHours(plan.contact_hrs);
            if (hours == null) continue;
            await run(`UPDATE Weeks SET hours = ? WHERE hours <> ? AND co_id IN (SELECT co_id FROM CourseOutcomes WHERE pc_offering_id = ?)`,
                [hours, hours, plan.id]);
        }

        const comments = await select('SELECT comment_id, co_assign_id, commenter_role, comment_for, message, createdAt FROM Comments');
        for (const c of comments) {
            // The returns on this plan, in time order.
            const returns = await select(
                `SELECT actor_role, createdAt FROM AssignmentWorkflowLogs WHERE co_assign_id = ? AND action_type = 'RETURNED'
                 ORDER BY julianday(createdAt) ASC`, [c.co_assign_id]);

            // Dates: a comment written after the plan's last return, with no resubmission since, belongs to that return.
            const last = returns[returns.length - 1];
            if (last) {
                const [after] = await select(
                    `SELECT COUNT(*) AS n FROM AssignmentWorkflowLogs WHERE co_assign_id = ? AND action_type = 'SUBMITTED'
                     AND julianday(createdAt) > julianday(?)`, [c.co_assign_id, last.createdAt]);
                if (!after.n && new Date(c.createdAt) > new Date(last.createdAt)) {
                    // the models' UTC text format; a raw Date would be bound as local time and mis-sort
                    const before = new Date(new Date(last.createdAt).getTime() - 15 * 60 * 1000).toISOString().replace('T', ' ').replace('Z', ' +00:00');
                    await run('UPDATE Comments SET createdAt = ?, updatedAt = ? WHERE comment_id = ?', [before, before, c.comment_id]);
                }
            }

            // Type tag.
            if (TAGGED.test(c.message || '')) continue;
            const text = String(c.message || '').replace(SHOUTED, '');
            const type = c.commenter_role === 'INDUSTRY_CONSULTANT'
                ? ({ topics: 'Suggested topic', tlas: 'Suggested TLA' }[c.comment_for] || 'Note')
                : returns.some(r => r.actor_role === c.commenter_role) ? 'Requested revision' : 'Note';
            await run('UPDATE Comments SET message = ? WHERE comment_id = ?', [`[${type}] ${text}`, c.comment_id]);
        }
    },

    async down() {
        // Demo data only; undo by re-seeding.
    }
};
