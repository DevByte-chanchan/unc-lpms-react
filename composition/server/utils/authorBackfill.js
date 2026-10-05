'use strict';

// Fills in who wrote each comment and who performed each workflow action, where the name
// can be recovered. Older rows only recorded a role. A role is recoverable when exactly
// one active account holds it (the demo build has one account per role), or, for the
// instructor, from the plan's assigned instructor. Anything ambiguous stays NULL: a guess
// would put the wrong person's name on an accreditation record.
//
// Idempotent: only rows that still have no name are touched. Called by the migration and,
// for a from-scratch build, again after the demo accounts are seeded.

const ACCOUNT_ROLE_BY_WORKFLOW_ROLE = {
    PROGRAM_HEAD: 'program-head',
    LIBRARY_DIRECTOR: 'director-of-libraries',
    INDUSTRY_CONSULTANT: 'industry-consultant',
    DEAN: 'dean',
};

const backfillAuthors = async (queryInterface) => {
    const { sequelize } = queryInterface;
    const select = (sql) => sequelize.query(sql, { type: sequelize.QueryTypes.SELECT });
    const run = (sql, replacements = []) => sequelize.query(sql, { replacements });

    const users = await select('SELECT user_id, name, role FROM Users WHERE is_active IS NULL OR is_active != 0');
    const byRole = new Map();
    for (const user of users) {
        if (!byRole.has(user.role)) byRole.set(user.role, []);
        byRole.get(user.role).push(user);
    }

    for (const [workflowRole, accountRole] of Object.entries(ACCOUNT_ROLE_BY_WORKFLOW_ROLE)) {
        const holders = byRole.get(accountRole) || [];
        if (holders.length !== 1) continue;
        const { user_id: userId, name } = holders[0];
        await run('UPDATE Comments SET commenter_user_id = ?, commenter_name = ? WHERE commenter_role = ? AND commenter_name IS NULL', [userId, name, workflowRole]);
        await run('UPDATE AssignmentWorkflowLogs SET actor_name = ? WHERE actor_role = ? AND actor_name IS NULL', [name, workflowRole]);
    }

    // The instructor is the plan's assigned instructor.
    const assigned = `(SELECT u.%COL% FROM CourseOfferingAssignments a
                        INNER JOIN Users u ON CAST(u.user_id AS TEXT) = CAST(a.stakeholder_id AS TEXT)
                        WHERE a.co_assign_id = %TABLE%.co_assign_id)`;
    await run(`UPDATE Comments
               SET commenter_user_id = ${assigned.replace('%COL%', 'user_id').replace('%TABLE%', 'Comments')},
                   commenter_name = ${assigned.replace('%COL%', 'name').replace('%TABLE%', 'Comments')}
               WHERE commenter_role = 'INSTRUCTOR' AND commenter_name IS NULL AND co_assign_id IS NOT NULL`);
    await run(`UPDATE AssignmentWorkflowLogs
               SET actor_name = ${assigned.replace('%COL%', 'name').replace('%TABLE%', 'AssignmentWorkflowLogs')}
               WHERE actor_role = 'INSTRUCTOR' AND actor_name IS NULL`);
};

module.exports = { backfillAuthors };
