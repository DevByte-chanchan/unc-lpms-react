'use strict';

// A carried-over offering is the same approved syllabus in a new term (same revision
// number, identical content), so its approval history is the history of the offering it was
// carried from. The workflow log stays the single source of truth: for a carried-over
// offering the "effective" log is the source's log followed by its own, so every status check
// (editable? approved? who approved and when?) works unchanged.

const select = (sequelize, sql, replacements, transaction) =>
    sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT, ...(transaction ? { transaction } : {}) });

// Assignment ids from the oldest source to this one: [source..., this].
const assignmentChain = async (sequelize, assignmentId, transaction) => {
    const chain = [];
    const seen = new Set();
    let current = assignmentId;
    while (current && !seen.has(current)) {
        seen.add(current);
        chain.unshift(current);
        const [row] = await select(sequelize,
            `SELECT src.co_assign_id AS source_assignment
             FROM CourseOfferingAssignments a
                 INNER JOIN ProgramCourseOfferings pco ON pco.pc_offering_id = a.pc_offering_id
                 LEFT JOIN CourseOfferingAssignments src ON src.pc_offering_id = pco.carried_from_offering_id
             WHERE a.co_assign_id = ?;`, [current], transaction);
        current = row?.source_assignment || null;
    }
    return chain;
};

const effectiveLogs = async (sequelize, assignmentId, transaction) => {
    if (!assignmentId) return [];
    const chain = await assignmentChain(sequelize, assignmentId, transaction);
    const logs = [];
    for (const id of chain) {
        logs.push(...await select(sequelize,
            `SELECT log_id, co_assign_id, actor_role, actor_name, actor_user_id, action_type, createdAt
             FROM AssignmentWorkflowLogs WHERE co_assign_id = ? ORDER BY createdAt ASC, log_id ASC;`, [id], transaction));
    }
    return logs;
};

module.exports = { assignmentChain, effectiveLogs };
