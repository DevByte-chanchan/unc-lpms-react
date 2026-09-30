'use strict';

const { sequelize, Sequelize } = require('../models');

const GLOBAL_REVIEW_ROLES = new Set([
    'director-of-libraries',
    'industry-consultant',
    'vpaa'
]);

const CONTEXT_COLUMNS = `
    pco.pc_offering_id,
    pco.revision_number,
    coa.co_assign_id,
    coa.stakeholder_id AS instructor_user_id,
    p.stakeholder_id AS program_head_user_id,
    d.stakeholder_id AS dean_user_id`;

const CONTEXT_JOINS = `
    INNER JOIN ProgramCourseOfferings pco ON pco.pc_offering_id = scope.pc_offering_id
    LEFT JOIN CourseOfferingAssignments coa ON coa.pc_offering_id = pco.pc_offering_id
    INNER JOIN Programs p ON p.program_id = pco.program_id
    INNER JOIN Departments d ON d.dept_id = pco.dept_id`;

const normalizeId = value => value == null ? '' : String(value);

const canAccessCourseRows = (user, rows) => {
    if (!user || !Array.isArray(rows) || rows.length === 0) return false;
    if (GLOBAL_REVIEW_ROLES.has(user.role)) return true;

    const userId = normalizeId(user.id ?? user.user_id);
    if (!userId) return false;

    if (user.role === 'instructor') {
        return rows.some(row => normalizeId(row.instructor_user_id) === userId);
    }
    if (user.role === 'program-head') {
        return rows.some(row => normalizeId(row.program_head_user_id) === userId);
    }
    if (user.role === 'dean') {
        return rows.some(row => normalizeId(row.dean_user_id) === userId);
    }
    return false;
};

const selectRows = async (sql, replacements, transaction) => sequelize.query(sql, {
    replacements,
    type: Sequelize.QueryTypes.SELECT,
    ...(transaction ? { transaction } : {})
});

const loadOfferingCourseRows = async (pcId, revNum) => {
    const revisionClause = revNum == null ? '' : ' AND pco.revision_number = ?';
    return selectRows(
        `SELECT DISTINCT ${CONTEXT_COLUMNS}
         FROM (SELECT ? AS pc_offering_id) scope
         ${CONTEXT_JOINS}
         WHERE pco.pc_offering_id = ?${revisionClause};`,
        revNum == null ? [pcId, pcId] : [pcId, pcId, revNum]
    );
};

const loadAssignmentCourseRows = async (assignmentId, transaction) => selectRows(
    `SELECT DISTINCT ${CONTEXT_COLUMNS}
     FROM (SELECT pc_offering_id FROM CourseOfferingAssignments WHERE co_assign_id = ?) scope
     ${CONTEXT_JOINS}
     WHERE coa.co_assign_id = ?;`,
    [assignmentId, assignmentId],
    transaction
);

const loadCourseCodeRows = async (code, pcId) => {
    const offeringClause = pcId == null ? '' : ' AND candidate.pc_offering_id = ?';
    return selectRows(
        `SELECT DISTINCT ${CONTEXT_COLUMNS}
         FROM (
             SELECT candidate.pc_offering_id
             FROM ProgramCourseOfferings candidate
             INNER JOIN Courses course ON course.course_id = candidate.course_id
             WHERE course.course_no = ?${offeringClause}
             ORDER BY candidate.revision_number DESC, candidate.pc_offering_id DESC
             LIMIT 1
         ) scope
         ${CONTEXT_JOINS};`,
        pcId == null ? [code] : [code, pcId]
    );
};

const loadIloCourseRows = async (iloId) => selectRows(
    `SELECT DISTINCT ${CONTEXT_COLUMNS}
     FROM (
         SELECT co.pc_offering_id
         FROM IntendedLearningOutcomes ilo
         INNER JOIN CourseOutcomes co ON co.co_id = ilo.co_id
         WHERE ilo.ilo_id = ?
     ) scope
     ${CONTEXT_JOINS};`,
    [iloId]
);

const loadIloReferenceCourseRows = async (iloReferenceId) => selectRows(
    `SELECT DISTINCT ${CONTEXT_COLUMNS}
     FROM (
         SELECT co.pc_offering_id
         FROM ILOReferences ir
         INNER JOIN IntendedLearningOutcomes ilo ON ilo.ilo_id = ir.ilo_id
         INNER JOIN CourseOutcomes co ON co.co_id = ilo.co_id
         WHERE ir.ilo_reference_id = ?
     ) scope
     ${CONTEXT_JOINS};`,
    [iloReferenceId]
);

const loadCommentCourseRows = async (commentIds) => {
    const ids = [...new Set((commentIds || []).map(Number).filter(Number.isSafeInteger))];
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(', ');
    return selectRows(
        `SELECT DISTINCT c.comment_id, ${CONTEXT_COLUMNS}
         FROM (
             SELECT DISTINCT co.pc_offering_id, c.comment_id
             FROM Comments c
             INNER JOIN IntendedLearningOutcomes ilo ON ilo.ilo_id = c.ilo_id
             INNER JOIN CourseOutcomes co ON co.co_id = ilo.co_id
             WHERE c.comment_id IN (${placeholders})
         ) scope
         INNER JOIN Comments c ON c.comment_id = scope.comment_id
         ${CONTEXT_JOINS};`,
        ids
    );
};

const createCourseAccessMiddleware = resolver => async (req, res, next) => {
    try {
        const rows = await resolver(req);
        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(404).json({ error: 'Course resource not found.' });
        }
        if (!canAccessCourseRows(req.user, rows)) {
            return res.status(403).json({ error: 'You do not have access to this course.' });
        }
        req.courseAccess = rows[0];
        return next();
    } catch (error) {
        return next(error);
    }
};

const requireOfferingAccess = createCourseAccessMiddleware(req =>
    loadOfferingCourseRows(req.params.pcId, req.params.revNum)
);
const requireCourseCodeAccess = createCourseAccessMiddleware(req =>
    loadCourseCodeRows(req.params.code)
);
const requireIloParamAccess = param => createCourseAccessMiddleware(req =>
    loadIloCourseRows(req.params[param])
);
const requireIloBodyAccess = field => createCourseAccessMiddleware(req =>
    loadIloCourseRows(req.body?.[field])
);
const requireIloQueryAccess = field => createCourseAccessMiddleware(req =>
    loadIloCourseRows(req.query?.[field])
);
const requireIloReferenceParamAccess = param => createCourseAccessMiddleware(req =>
    loadIloReferenceCourseRows(req.params[param])
);

module.exports = {
    GLOBAL_REVIEW_ROLES,
    canAccessCourseRows,
    createCourseAccessMiddleware,
    loadOfferingCourseRows,
    loadAssignmentCourseRows,
    loadCourseCodeRows,
    loadIloCourseRows,
    loadIloReferenceCourseRows,
    loadCommentCourseRows,
    requireOfferingAccess,
    requireCourseCodeAccess,
    requireIloParamAccess,
    requireIloBodyAccess,
    requireIloQueryAccess,
    requireIloReferenceParamAccess
};
