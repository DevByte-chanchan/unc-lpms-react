'use strict';

const { sequelize, Sequelize, Comment } = require('../models');
const { buildIloLabels, buildTargetTitles, approvedOrigin, freezeReviewRecord, loadSnapshot } = require('../utils/reviewRecordInputs');
const { assignmentChain, effectiveLogs } = require('../utils/effectiveLogs');
const { assembleReviewRecord } = require('../utils/reviewRecord');
const { canSeeRecordComment } = require('../utils/commentVisibility');

const select = (sql, replacements = []) =>
    sequelize.query(sql, { replacements, type: Sequelize.QueryTypes.SELECT });

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
            `SELECT c.course_no, c.course_title, c.term, pco.revision_number, pco.school_year, pco.semester, pco.carried_from_offering_id, pco.approved_at
             FROM ProgramCourseOfferings pco INNER JOIN Courses c ON c.course_id = pco.course_id
             WHERE pco.pc_offering_id = ?;`, [offeringId]);
        if (!course) return res.status(404).json({ message: 'Course offering not found.' });

        // A carried-over offering's record is the record of the revision it carries.
        const logs = await effectiveLogs(sequelize, assignmentId);
        // Under review, an approver's record holds their own comments only; once the plan is approved they get
        // the whole record of the part they cover (utils/commentVisibility.js, config/sectionAccess.js).
        const approved = course.approved_at != null || course.carried_from_offering_id != null;
        const liveComments = assignmentId
            ? await Comment.findAll({
                where: { co_assign_id: await assignmentChain(sequelize, assignmentId) },
                order: [['createdAt', 'ASC'], ['comment_id', 'ASC']], raw: true
            })
            : [];
        // An approved plan's record is read from the copy frozen at approval (taken now if this is the first
        // look, for plans approved before snapshots existed), so renaming a reference or renumbering outcomes
        // later cannot change it. A comment that was deleted since is still in the record.
        const origin = approved ? await approvedOrigin(offeringId) : null;
        if (origin) await freezeReviewRecord(origin);
        const frozen = origin ? await loadSnapshot(origin) : null;
        const byId = new Map([...liveComments, ...(frozen ? frozen.comments : [])].map(comment => [comment.comment_id, comment]));
        const comments = [...byId.values()]
            .sort((x, y) => String(x.createdAt).localeCompare(String(y.createdAt)) || x.comment_id - y.comment_id)
            .filter(comment => canSeeRecordComment(req.user, comment, { approved }));

        // Comment locations may refer to the ILOs of the offering this one was carried from.
        const chain = assignmentId ? await assignmentChain(sequelize, assignmentId) : [];
        const offeringIds = chain.length
            ? (await select(`SELECT pc_offering_id FROM CourseOfferingAssignments WHERE co_assign_id IN (${chain.map(() => '?').join(', ')})`, chain)).map(r => r.pc_offering_id)
            : [offeringId];
        const iloLabels = new Map();
        for (const id of offeringIds) for (const [iloId, label] of await buildIloLabels(id)) iloLabels.set(iloId, label);
        if (frozen) for (const [iloId, label] of frozen.iloLabels) iloLabels.set(iloId, label);

        const record = assembleReviewRecord({
            course: {
                code: course.course_no,
                title: course.course_title,
                term: course.school_year ? `${course.semester} Semester, ${course.school_year}` : course.term,
                revisionNumber: course.revision_number > 0 ? course.revision_number : null,
                carriedOver: !!course.carried_from_offering_id,
            },
            logs,
            comments,
            iloLabels,
            targetTitles: new Map([...await buildTargetTitles(comments), ...(frozen ? frozen.targetTitles : [])]),
        });
        return res.json({ ...record, generatedAt: new Date().toISOString() });
    } catch (err) {
        return next(err);
    }
}

module.exports = { getReviewRecord };
