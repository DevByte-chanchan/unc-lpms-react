'use strict';

const { sequelize, Sequelize, AssignmentWorkflowLog, Comment } = require('../models');
const { assembleReviewRecord } = require('../utils/reviewRecord');

const select = (sql, replacements = []) =>
    sequelize.query(sql, { replacements, type: Sequelize.QueryTypes.SELECT });

// Same numbering the syllabus screens use: CO n, ILO k within it; an orientation ILO has no number.
const buildIloLabels = async (offeringId) => {
    const rows = await select(
        `SELECT co.co_id, ilo.ilo_id, ilo.is_orientation
         FROM CourseOutcomes co
             INNER JOIN IntendedLearningOutcomes ilo ON ilo.co_id = co.co_id
         WHERE co.pc_offering_id = ?
         ORDER BY co.co_id ASC, ilo.ilo_id ASC;`, [offeringId]);
    const labels = new Map();
    const coNumbers = new Map();
    const counters = new Map();
    for (const row of rows) {
        if (!coNumbers.has(row.co_id)) coNumbers.set(row.co_id, coNumbers.size + 1);
        if (row.is_orientation) { labels.set(row.ilo_id, 'Course Orientation'); continue; }
        counters.set(row.co_id, (counters.get(row.co_id) || 0) + 1);
        labels.set(row.ilo_id, `CO${coNumbers.get(row.co_id)}-ILO${counters.get(row.co_id)}`);
    }
    return labels;
};

const TITLE_SQL = {
    references: 'SELECT reference_id AS id, title FROM `References` WHERE reference_id IN',
    topics: 'SELECT topic_id AS id, title FROM Topics WHERE topic_id IN',
    tlas: 'SELECT tla_id AS id, tla_name AS title FROM TeachingAndLearningActivities WHERE tla_id IN',
};

const buildTargetTitles = async (comments) => {
    const targets = new Map();
    const ids = comments.map(comment => comment.comment_id);
    if (ids.length === 0) return targets;
    const rows = await select(`SELECT comment_id, target_id FROM CommentTargets WHERE comment_id IN (${ids.map(() => '?').join(', ')});`, ids);
    const byType = new Map();
    for (const comment of comments) {
        if (!TITLE_SQL[comment.comment_for]) continue;
        const wanted = rows.filter(row => row.comment_id === comment.comment_id).map(row => row.target_id);
        if (wanted.length) byType.set(comment.comment_id, { type: comment.comment_for, ids: wanted });
    }
    for (const type of Object.keys(TITLE_SQL)) {
        const all = [...new Set([...byType.values()].filter(entry => entry.type === type).flatMap(entry => entry.ids))];
        if (all.length === 0) continue;
        const titles = new Map((await select(`${TITLE_SQL[type]} (${all.map(() => '?').join(', ')});`, all)).map(row => [row.id, row.title]));
        for (const [commentId, entry] of byType) {
            if (entry.type !== type) continue;
            targets.set(commentId, entry.ids.map(id => titles.get(id)).filter(Boolean));
        }
    }
    return targets;
};

/**
 * GET /api/assignments/offering/:pcId/review-record
 * The accreditation review record for one revision: every comment, every workflow action
 * and the final approvers. Access follows the course (requireOfferingAccess).
 */
async function getReviewRecord(req, res, next) {
    try {
        const offeringId = req.courseAccess?.pc_offering_id;
        const assignmentId = req.courseAccess?.co_assign_id;
        const [course] = await select(
            `SELECT c.course_no, c.course_title, c.term, pco.revision_number
             FROM ProgramCourseOfferings pco INNER JOIN Courses c ON c.course_id = pco.course_id
             WHERE pco.pc_offering_id = ?;`, [offeringId]);
        if (!course) return res.status(404).json({ message: 'Course offering not found.' });

        const logs = assignmentId
            ? await AssignmentWorkflowLog.findAll({
                where: { co_assign_id: assignmentId },
                attributes: ['actor_role', 'actor_name', 'action_type', 'createdAt'],
                order: [['createdAt', 'ASC'], ['log_id', 'ASC']], raw: true
            })
            : [];
        const comments = assignmentId
            ? await Comment.findAll({ where: { co_assign_id: assignmentId }, order: [['createdAt', 'ASC'], ['comment_id', 'ASC']], raw: true })
            : [];

        const record = assembleReviewRecord({
            course: { code: course.course_no, title: course.course_title, term: course.term, revisionNumber: course.revision_number },
            logs,
            comments,
            iloLabels: await buildIloLabels(offeringId),
            targetTitles: await buildTargetTitles(comments),
        });
        return res.json({ ...record, generatedAt: new Date().toISOString() });
    } catch (err) {
        return next(err);
    }
}

module.exports = { getReviewRecord };
