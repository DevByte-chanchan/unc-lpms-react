'use strict';

// The Industry Consultant's comments on the earlier versions of a plan, for whoever works on the next one.
// The consultant is not part of the approval chain; their comments are a record that becomes the basis for
// the next version of the syllabus. A revision, or a carry-over into a new term, has an earlier version it
// came from (base_offering_id / carried_from_offering_id); this follows that chain back.
//
// Who sees what: the Program Head sees every consultant's comments; a consultant sees only their own.

const { Sequelize } = require('sequelize');

const MAX_DEPTH = 12;

const select = (sequelize, sql, replacements = []) => sequelize.query(sql, { replacements, type: Sequelize.QueryTypes.SELECT });

// The offerings this one came from, nearest first.
const ancestorsOf = async (sequelize, offeringId) => {
    const found = [];
    const seen = new Set([Number(offeringId)]);
    let current = Number(offeringId);
    for (let depth = 0; depth < MAX_DEPTH; depth += 1) {
        const [row] = await select(sequelize, 'SELECT base_offering_id, carried_from_offering_id FROM ProgramCourseOfferings WHERE pc_offering_id = ?', [current]);
        const next = row && (row.base_offering_id ?? row.carried_from_offering_id);
        if (!next || seen.has(Number(next))) break;
        seen.add(Number(next));
        found.push(Number(next));
        current = Number(next);
    }
    return found;
};

// user: the signed-in account { id, role }. Returns [{ offeringId, schoolYear, semester, revision, comments: [...] }],
// only the earlier versions that have a consultant comment.
const earlierConsultantComments = async (sequelize, offeringId, user) => {
    const ancestors = await ancestorsOf(sequelize, offeringId);
    if (ancestors.length === 0) return [];
    const marks = ancestors.map(() => '?').join(', ');
    const own = user.role === 'industry-consultant' ? ' AND c.commenter_user_id = ?' : '';
    const rows = await select(sequelize,
        `SELECT DISTINCT c.comment_id, c.message, c.comment_for, c.createdAt, pco.pc_offering_id AS offeringId,
                pco.school_year AS schoolYear, pco.semester, pco.revision_number AS revision
         FROM Comments c
             LEFT JOIN Weeks w ON w.week_id = c.week_id
             LEFT JOIN CourseOutcomes co ON co.co_id = w.co_id
             LEFT JOIN CourseOfferingAssignments a ON a.co_assign_id = c.co_assign_id
             INNER JOIN ProgramCourseOfferings pco ON pco.pc_offering_id = COALESCE(co.pc_offering_id, a.pc_offering_id)
         WHERE c.commenter_role = 'INDUSTRY_CONSULTANT' AND pco.pc_offering_id IN (${marks})${own}
         ORDER BY c.createdAt DESC`,
        [...ancestors, ...(own ? [user.id] : [])]);

    const byOffering = new Map();
    for (const row of rows) {
        if (!byOffering.has(row.offeringId)) byOffering.set(row.offeringId, { offeringId: row.offeringId, schoolYear: row.schoolYear, semester: row.semester, revision: row.revision, comments: [] });
        byOffering.get(row.offeringId).comments.push({ id: row.comment_id, message: row.message, about: row.comment_for || null, at: row.createdAt });
    }
    return ancestors.filter(id => byOffering.has(id)).map(id => byOffering.get(id));
};

module.exports = { earlierConsultantComments, ancestorsOf };
