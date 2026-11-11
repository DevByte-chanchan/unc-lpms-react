'use strict';

// Brings the weekly-planner demo plans (seeders 20260512 to 20260528, from
// feature/learning-plan-composition) in line with the approver module's rules, without
// editing those seeders:
//   - reference types use the exact keys of config/referenceTypes.js
//   - every graded ILO has its Introductory / Enabling / Demonstrative level
//   - a plan the Dean never approved is a working copy (revision 0) and every plan has its term
//   - the workflow log is the source of a plan's status: an assignment with none gets its
//     ASSIGNED (and SUBMITTED) rows, and the Industry Consultant, who is not in the approval
//     chain, records no workflow action (a consultant return, and its comments, become the Program Head's)
// Runs before 20260812000000-demo-users, which links the demo accounts and backfills the rest.

const { IED_LEVELS } = require('../utils/iedRule');

const TYPE_KEYS = { TEXTBOOK: 'Textbook', OER: 'OER', ONLINE: 'Online Resource' };
const SEMESTER_START_MONTH = { '1st': 5, '2nd': 11 }; // June, December (0-based months)

const termOf = (date) => {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return { schoolYear: null, semester: null };
    const month = d.getUTCMonth();
    const year = d.getUTCFullYear();
    if (month >= SEMESTER_START_MONTH['1st'] && month < 11) return { schoolYear: `${year}-${year + 1}`, semester: '1st' };
    if (month >= 11) return { schoolYear: `${year}-${year + 1}`, semester: '2nd' };
    return { schoolYear: `${year - 1}-${year}`, semester: '2nd' };
};

module.exports = {
    async up(queryInterface) {
        const { sequelize } = queryInterface;
        const select = (sql, replacements = []) => sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT });
        const run = (sql, replacements = []) => sequelize.query(sql, { replacements });

        for (const [from, to] of Object.entries(TYPE_KEYS)) {
            await run('UPDATE `References` SET type = ? WHERE type = ?', [to, from]);
        }

        await run('UPDATE IntendedLearningOutcomes SET is_orientation = 0 WHERE is_orientation IS NULL');
        const ilos = await select('SELECT ilo_id, co_id, is_orientation, ied_level FROM IntendedLearningOutcomes ORDER BY co_id ASC, ilo_id ASC');
        const position = new Map();
        for (const ilo of ilos) {
            if (ilo.is_orientation) continue;
            const index = position.get(ilo.co_id) || 0;
            position.set(ilo.co_id, index + 1);
            if (!ilo.ied_level && IED_LEVELS[index]) {
                await run('UPDATE IntendedLearningOutcomes SET ied_level = ? WHERE ilo_id = ?', [IED_LEVELS[index], ilo.ilo_id]);
            }
        }

        // Workflow logs: the consultant is out of the chain.
        await run("DELETE FROM AssignmentWorkflowLogs WHERE actor_role = 'INDUSTRY_CONSULTANT' AND action_type <> 'RETURNED'");
        const consultantReturns = await select(
            "SELECT log_id, co_assign_id, createdAt FROM AssignmentWorkflowLogs WHERE actor_role = 'INDUSTRY_CONSULTANT' AND action_type = 'RETURNED'");
        for (const entry of consultantReturns) {
            // Followed by the Program Head's own return before the next submission: that one stands.
            const [next] = await select(
                `SELECT actor_role, action_type FROM AssignmentWorkflowLogs
                 WHERE co_assign_id = ? AND julianday(createdAt) > julianday(?) AND log_id <> ?
                 ORDER BY julianday(createdAt) ASC LIMIT 1`, [entry.co_assign_id, entry.createdAt, entry.log_id]);
            if (next && next.actor_role === 'PROGRAM_HEAD' && next.action_type === 'RETURNED') {
                await run('DELETE FROM AssignmentWorkflowLogs WHERE log_id = ?', [entry.log_id]);
            } else {
                await run("UPDATE AssignmentWorkflowLogs SET actor_role = 'PROGRAM_HEAD' WHERE log_id = ?", [entry.log_id]);
                // The comments behind that return become the Program Head's too, or the returner has none to show.
                await run(`UPDATE Comments SET commenter_role = 'PROGRAM_HEAD', commenter_user_id = NULL, commenter_name = NULL
                           WHERE co_assign_id = ? AND commenter_role = 'INDUSTRY_CONSULTANT'`, [entry.co_assign_id]);
            }
        }

        const unlogged = await select(
            `SELECT a.co_assign_id, a.date_assigned, a.date_submitted FROM CourseOfferingAssignments a
             WHERE NOT EXISTS (SELECT 1 FROM AssignmentWorkflowLogs l WHERE l.co_assign_id = a.co_assign_id)`);
        for (const a of unlogged) {
            const assigned = a.date_assigned || new Date();
            await run(`INSERT INTO AssignmentWorkflowLogs (co_assign_id, actor_role, action_type, createdAt, updatedAt)
                       VALUES (?, 'PROGRAM_HEAD', 'ASSIGNED', ?, ?)`, [a.co_assign_id, assigned, assigned]);
            if (a.date_submitted) {
                await run(`INSERT INTO AssignmentWorkflowLogs (co_assign_id, actor_role, action_type, createdAt, updatedAt)
                           VALUES (?, 'INSTRUCTOR', 'SUBMITTED', ?, ?)`, [a.co_assign_id, a.date_submitted, a.date_submitted]);
            }
        }

        // Offerings: a plan the Dean never approved has no revision number yet; every plan has a term.
        const offerings = await select(
            `SELECT pco.pc_offering_id, pco.school_year, pco.semester,
                    (SELECT MIN(a.date_assigned) FROM CourseOfferingAssignments a WHERE a.pc_offering_id = pco.pc_offering_id) AS assigned,
                    EXISTS (SELECT 1 FROM AssignmentWorkflowLogs l INNER JOIN CourseOfferingAssignments a ON a.co_assign_id = l.co_assign_id
                            WHERE a.pc_offering_id = pco.pc_offering_id AND l.actor_role = 'DEAN' AND l.action_type = 'ACCEPTED') AS approved
             FROM ProgramCourseOfferings pco`);
        for (const offering of offerings) {
            const { schoolYear, semester } = termOf(offering.assigned || new Date());
            await run(`UPDATE ProgramCourseOfferings
                       SET school_year = COALESCE(school_year, ?), semester = COALESCE(semester, ?),
                           revision_number = CASE WHEN ? THEN revision_number ELSE 0 END
                       WHERE pc_offering_id = ?`, [schoolYear, semester, offering.approved ? 1 : 0, offering.pc_offering_id]);
        }
    },

    async down() {
        // Data alignment only; undo by re-seeding.
    }
};
