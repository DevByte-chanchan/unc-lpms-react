'use strict';

const { sequelize, Sequelize } = require('../models');
const { onComment, onCommentsResolved } = require('../utils/notificationEvents');
const {
    canAccessCourseRows,
    loadOfferingCourseRows,
    loadCourseCodeRows,
    loadCommentCourseRows
} = require('../middleware/courseAuthorization');
const { canViewComment, canViewSection, sectionOfComment } = require('../config/sectionAccess');
const { COMMENT_ROLE_BY_ACCOUNT, isApprover, seesEveryComment, filterComments, withoutHeldDeanComments } = require('../utils/commentVisibility');
const { earlierConsultantComments } = require('../utils/earlierConsultantComments');
const { withReviewRounds } = require('../utils/reviewRounds');
const { effectiveLogs } = require('../utils/effectiveLogs');
const { planEditState, deriveReviewState } = require('../utils/workflowRules');


// An approver sees only the comments they wrote, and only those about the part of the plan their role
// covers (utils/commentVisibility.js, config/sectionAccess.js). The instructor and the VPAA see them all.
// The author's account id is used here to decide, and is not sent on.
const visibleComments = (req, rows) => filterComments(req.user, rows).map(({ commenter_user_id: _author, ...row }) => row);

// For the instructor, a Dean return still with the Program Head keeps its new Dean comments back (see
// commentVisibility.withoutHeldDeanComments). Everyone else is unaffected.
// Each comment's review round (utils/reviewRounds.js), from the plan's effective workflow log.
const withRounds = async (rows, offeringId) => {
    if (!offeringId || !rows.length) return rows;
    const [assignment] = await sequelize.query('SELECT co_assign_id FROM CourseOfferingAssignments WHERE pc_offering_id = ? ORDER BY co_assign_id DESC LIMIT 1;',
        { replacements: [offeringId], type: Sequelize.QueryTypes.SELECT });
    return assignment ? withReviewRounds(await effectiveLogs(sequelize, assignment.co_assign_id), rows) : rows;
};

const forInstructorTiming = async (req, rows, offeringId) => {
    if (req.user?.role !== 'instructor' || !offeringId) return rows;
    const [assignment] = await sequelize.query('SELECT co_assign_id FROM CourseOfferingAssignments WHERE pc_offering_id = ? ORDER BY co_assign_id DESC LIMIT 1;',
        { replacements: [offeringId], type: Sequelize.QueryTypes.SELECT });
    if (!assignment) return rows;
    const logs = await effectiveLogs(sequelize, assignment.co_assign_id);
    const latest = (match) => { const hits = logs.filter(match); return hits.length ? hits[hits.length - 1].createdAt : null; };
    return withoutHeldDeanComments(req.user, rows, deriveReviewState(logs), {
        lastForwardAt: latest(entry => entry.action_type === 'FORWARDED'),
        lastDeanReturnAt: latest(entry => entry.actor_role === 'DEAN' && entry.action_type === 'RETURNED')
    });
};


/**
 * 1. GET /api/comments/unresolved-counts/:pcId/:revNum
 * Used by the main syllabus screen to get counts for red notification badges, per week and type.
 * ilo_id repeats week_id: the planner screens still call the week id iloId.
 */
exports.getUnresolvedCommentCounts = async (req, res) => {
    try {
        const { pcId, revNum } = req.params;

        if (!pcId) {
            return res.status(400).json({ message: 'Course offering ID and revision number are required.' });
        }

        const ownOnly = isApprover(req.user?.role) && !seesEveryComment(req.user?.role)
            ? ' AND (c.commenter_user_id = ? OR (c.commenter_user_id IS NULL AND c.commenter_role = ?))' : '';
        const ownParams = ownOnly ? [req.user.id, COMMENT_ROLE_BY_ACCOUNT[req.user.role]] : [];
        const counts = await sequelize.query(
            `SELECT
                 c.week_id,
                 c.week_id AS ilo_id,
                 c.comment_for,
                 COUNT(DISTINCT c.comment_id) AS count
             FROM Comments c
                 INNER JOIN Weeks w ON w.week_id = c.week_id
                 INNER JOIN CourseOutcomes co ON co.co_id = w.co_id
                 INNER JOIN ProgramCourseOfferings pco ON pco.pc_offering_id = co.pc_offering_id
             WHERE pco.pc_offering_id = ? AND (? IS NULL OR pco.revision_number = ?) AND c.resolved_status = 0
               AND c.commenter_role <> 'INDUSTRY_CONSULTANT'${ownOnly}
             GROUP BY c.week_id, c.comment_for;`,
            {
                replacements: [pcId, revNum || null, revNum || null, ...ownParams],
                type: Sequelize.QueryTypes.SELECT
            }
        );

        return res.status(200).json(counts
            .filter(row => canViewComment(req.user?.role, row))
            .map(row => ({ ...row, unresolved_count: row.count })));
    } catch (error) {
        console.error('Error fetching comment counts:', error);
        return res.status(500).json({ message: 'Internal server error working with comment statistics.' });
    }
};

/**
 * GET /api/comments/earlier-consultant/:pcId
 * The Industry Consultant's comments on the earlier versions of this plan (the revision or carry-over it
 * came from), so they can be the basis for the next version. Program Head: all consultants; consultant: own.
 */
exports.getEarlierConsultantComments = async (req, res, next) => {
    try {
        const versions = await earlierConsultantComments(sequelize, req.params.pcId, req.user);
        return res.status(200).json({ versions });
    } catch (error) {
        return next(error);
    }
};

/**
 * 2. GET /api/comments/filter/:iloId/:commentFor   (:iloId is the week id)
 */
// 2. Fetch specific comments for a Week + Target Type (Topics, TLAs, or References)
// Supports multi-select subtopic targets and resolves parent Topic title + Subtopic title(s)
exports.getCommentsByTarget = async (req, res) => {
    const { iloId, commentFor } = req.params;
    const weekId = Number(iloId);
    if (!weekId || !commentFor) {
        return res.status(400).json({ message: 'Missing required routing parameters (weekId, commentFor).' });
    }

    try {
        const [rows] = await sequelize.query(`
            SELECT 
                c.comment_id,
                c.co_assign_id,
                c.commenter_role,
                c.commenter_user_id,
                c.commenter_name,
                c.message,
                c.resolved_status,
                c.resolved_date,
                c.week_id,
                c.week_id AS ilo_id,
                c.comment_for,
                c.createdAt,
                ct.comment_target_id,
                ct.target_id,
                st.subtopic_id AS resolved_subtopic_id,
                st.title AS subtopic_title,
                t_sub.topic_id AS parent_topic_id,
                t_sub.title AS parent_topic_title,
                t_direct.topic_id AS direct_topic_id,
                t_direct.title AS direct_topic_title,
                tla.tla_id AS resolved_tla_id,
                tla.tla_name AS tla_title,
                wr.weekly_reference_id AS resolved_wr_id,
                r_wr.title AS wr_ref_title,
                r_direct.title AS direct_ref_title
            FROM Comments c
            LEFT JOIN CommentTargets ct ON c.comment_id = ct.comment_id
            LEFT JOIN Subtopics st ON c.comment_for = 'topics' AND st.subtopic_id = ct.target_id
            LEFT JOIN Topics t_sub ON st.topic_id = t_sub.topic_id
            LEFT JOIN Topics t_direct ON c.comment_for = 'topics' AND st.subtopic_id IS NULL AND t_direct.topic_id = ct.target_id
            LEFT JOIN TeachingAndLearningActivities tla ON c.comment_for = 'tlas' AND tla.tla_id = ct.target_id
            LEFT JOIN WeeklyReferences wr ON c.comment_for = 'references' AND wr.weekly_reference_id = ct.target_id
            LEFT JOIN \`References\` r_wr ON wr.reference_id = r_wr.reference_id
            LEFT JOIN \`References\` r_direct ON c.comment_for = 'references' AND wr.weekly_reference_id IS NULL AND r_direct.reference_id = ct.target_id
            WHERE c.week_id = ? AND c.comment_for = ?
            ORDER BY c.createdAt ASC, ct.comment_target_id ASC
        `, {
            replacements: [weekId, String(commentFor).toLowerCase().trim()]
        });

        // Preload week subtopics / references / tlas as fallback in case a target_id was re-created previously
        let weekSubtopicsFallback = null;
        let weekRefsFallback = null;
        let weekTlasFallback = null;

        const getWeekSubtopics = async () => {
            if (weekSubtopicsFallback !== null) return weekSubtopicsFallback;
            const [subs] = await sequelize.query(`
                SELECT st.subtopic_id, st.title AS subtopic_title, st.topic_id, t.title AS topic_title
                FROM Subtopics st
                JOIN Topics t ON st.topic_id = t.topic_id
                WHERE st.week_id = ?
                ORDER BY st.is_orientation ASC, st.subtopic_id ASC, st.sequence_order ASC
            `, { replacements: [weekId] });
            weekSubtopicsFallback = subs;
            return subs;
        };

        const getWeekRefs = async () => {
            if (weekRefsFallback !== null) return weekRefsFallback;
            const [refs] = await sequelize.query(`
                SELECT wr.weekly_reference_id, r.title AS ref_title
                FROM WeeklyReferences wr
                JOIN \`References\` r ON wr.reference_id = r.reference_id
                WHERE wr.week_id = ?
                ORDER BY wr.is_orientation ASC, wr.weekly_reference_id ASC
            `, { replacements: [weekId] });
            weekRefsFallback = refs;
            return refs;
        };

        const getWeekTlas = async () => {
            if (weekTlasFallback !== null) return weekTlasFallback;
            const [tlas] = await sequelize.query(`
                SELECT tla_id, tla_name
                FROM TeachingAndLearningActivities
                WHERE week_id = ?
                ORDER BY is_orientation ASC, tla_id ASC
            `, { replacements: [weekId] });
            weekTlasFallback = tlas;
            return tlas;
        };

        // Group rows by comment_id to support multiple targets per comment (e.g., multi-selected subtopics)
        const commentsMap = new Map();

        for (const row of rows) {
            const cid = Number(row.comment_id);
            if (!commentsMap.has(cid)) {
                commentsMap.set(cid, {
                    comment_id: cid,
                    co_assign_id: row.co_assign_id,
                    commenter_role: row.commenter_role,
                    commenter_user_id: row.commenter_user_id,
                    commenter_name: row.commenter_name,
                    message: row.message,
                    resolved_status: row.resolved_status,
                    resolved_date: row.resolved_date,
                    week_id: row.week_id,
                    ilo_id: row.ilo_id,
                    comment_for: row.comment_for,
                    createdAt: row.createdAt,
                    target_id: row.target_id,
                    target_ids: [],
                    topic_groups: [],
                    topic_title: null,
                    subtopic_titles: [],
                    target_titles: [],
                    target_title: null
                });
            }

            const commentObj = commentsMap.get(cid);
            if (row.target_id != null && !commentObj.target_ids.includes(Number(row.target_id))) {
                commentObj.target_ids.push(Number(row.target_id));
            }

            if (row.comment_for === 'topics') {
                let topicId = row.parent_topic_id || row.direct_topic_id || null;
                let topicTitle = row.parent_topic_title || row.direct_topic_title || null;
                let subtopicId = row.resolved_subtopic_id || null;
                let subtopicTitle = row.subtopic_title || null;

                // If target_id was orphaned (e.g., from an earlier Subtopic destroy/recreate), heal & resolve from the week's subtopics
                if (!topicTitle && !subtopicTitle) {
                    const weekSubs = await getWeekSubtopics();
                    if (weekSubs.length > 0) {
                        const fallbackSub = weekSubs[0];
                        topicId = fallbackSub.topic_id;
                        topicTitle = fallbackSub.topic_title;
                        subtopicId = fallbackSub.subtopic_id;
                        subtopicTitle = fallbackSub.subtopic_title;

                        if (row.comment_target_id) {
                            await sequelize.query(
                                `UPDATE CommentTargets SET target_id = ? WHERE comment_target_id = ?`,
                                { replacements: [subtopicId, row.comment_target_id] }
                            ).catch(() => {});
                        }
                    }
                }

                if (topicTitle || subtopicTitle) {
                    const effectiveTopicTitle = topicTitle || 'Topic';
                    let group = commentObj.topic_groups.find(
                        g => (topicId && Number(g.topic_id) === Number(topicId)) || g.topic_title === effectiveTopicTitle
                    );
                    if (!group) {
                        group = {
                            topic_id: topicId,
                            topic_title: effectiveTopicTitle,
                            subtopics: []
                        };
                        commentObj.topic_groups.push(group);
                    }
                    if (subtopicTitle && !group.subtopics.some(s => s.title === subtopicTitle)) {
                        group.subtopics.push({
                            subtopic_id: subtopicId || row.target_id,
                            title: subtopicTitle
                        });
                    }
                    if (subtopicTitle && !commentObj.subtopic_titles.includes(subtopicTitle)) {
                        commentObj.subtopic_titles.push(subtopicTitle);
                    }
                }
            } else if (row.comment_for === 'tlas') {
                let tlaTitle = row.tla_title || null;
                if (!tlaTitle) {
                    const weekTlas = await getWeekTlas();
                    if (weekTlas.length > 0) {
                        tlaTitle = weekTlas[0].tla_name;
                    }
                }
                if (tlaTitle && !commentObj.target_titles.includes(tlaTitle)) {
                    commentObj.target_titles.push(tlaTitle);
                }
            } else if (row.comment_for === 'references') {
                let refTitle = row.wr_ref_title || row.direct_ref_title || null;
                if (!refTitle) {
                    const weekRefs = await getWeekRefs();
                    if (weekRefs.length > 0) {
                        refTitle = weekRefs[0].ref_title;
                        if (row.comment_target_id) {
                            await sequelize.query(
                                `UPDATE CommentTargets SET target_id = ? WHERE comment_target_id = ?`,
                                { replacements: [weekRefs[0].weekly_reference_id, row.comment_target_id] }
                            ).catch(() => {});
                        }
                    }
                }
                if (refTitle && !commentObj.target_titles.includes(refTitle)) {
                    commentObj.target_titles.push(refTitle);
                }
            }
        }

        // Finalize formatted target_title and topic_title on each grouped comment
        const finalComments = Array.from(commentsMap.values()).map(c => {
            if (c.comment_for === 'topics' && c.topic_groups.length > 0) {
                c.topic_title = c.topic_groups.map(g => g.topic_title).join(' / ');
                c.target_title = c.topic_groups
                    .map(g => g.subtopics.length > 0
                        ? `${g.topic_title}: ${g.subtopics.map(s => s.title).join('; ')}`
                        : g.topic_title
                    )
                    .join(' | ');
            } else if (c.target_titles.length > 0) {
                c.target_title = c.target_titles.join(', ');
            }
            return c;
        });

        // Who may read which comment, and the Dean-return timing for the instructor (see the top of this file).
        const [plan] = await sequelize.query('SELECT co.pc_offering_id FROM Weeks w INNER JOIN CourseOutcomes co ON co.co_id = w.co_id WHERE w.week_id = ?;',
            { replacements: [weekId], type: Sequelize.QueryTypes.SELECT });
        res.json(visibleComments(req, await forInstructorTiming(req, finalComments, plan?.pc_offering_id)));
    } catch (err) {
        console.error('Error fetching targeted comments:', err);
        res.status(500).json({ error: 'Database error fetching targeted comments.' });
    }
};

/**
 * POST /api/comments/by-course
 * Creates an approver comment from the approval sidebar. The client only knows labels
 * (CO2, Week 3, target titles); this resolves them against the plan so the comment lands
 * on a real week and real targets, and shows in the instructor's planner and badges.
 * Body: { code, pcId?, commenter_role, message, co_index, week_index | ilo_index, comment_for, target_titles: [] }
 * Targets (CommentTargets.target_id): a subtopic for topics, a TLA, or a weekly reference.
 */
const TARGET_LOOKUPS = {
    // a topic title or a subtopic title; every subtopic row of a matching topic in that scope
    topics: `SELECT st.subtopic_id AS id, st.week_id FROM Subtopics st
                 INNER JOIN Topics t ON t.topic_id = st.topic_id
                 INNER JOIN Weeks w ON w.week_id = st.week_id
                 INNER JOIN CourseOutcomes co ON co.co_id = w.co_id
             WHERE (t.title = ? OR st.title = ?) AND co.pc_offering_id = ?
             ORDER BY st.week_id ASC, st.subtopic_id ASC;`,
    tlas: `SELECT tla.tla_id AS id, tla.week_id FROM TeachingAndLearningActivities tla
               INNER JOIN Weeks w ON w.week_id = tla.week_id
               INNER JOIN CourseOutcomes co ON co.co_id = w.co_id
           WHERE (tla.tla_name = ? OR tla.tla_name = ?) AND co.pc_offering_id = ?
           ORDER BY tla.week_id ASC, tla.tla_id ASC;`,
    references: `SELECT wr.weekly_reference_id AS id, wr.week_id FROM WeeklyReferences wr
                     INNER JOIN \`References\` r ON r.reference_id = wr.reference_id
                     INNER JOIN Weeks w ON w.week_id = wr.week_id
                     INNER JOIN CourseOutcomes co ON co.co_id = w.co_id
                 WHERE (r.title = ? OR r.title = ?) AND co.pc_offering_id = ?
                 ORDER BY wr.week_id ASC, wr.weekly_reference_id ASC;`
};
const FIRST_WEEK_WITH = {
    topics: 'SELECT st.week_id FROM Subtopics st',
    tlas: 'SELECT tla.week_id FROM TeachingAndLearningActivities tla',
    references: 'SELECT wr.week_id FROM WeeklyReferences wr'
};

exports.createCourseComment = async (req, res) => {
    try {
        const { code, commenter_role, message, co_index, week_index, comment_for, target_titles } = req.body || {};

        if (commenter_role !== COMMENT_ROLE_BY_ACCOUNT[req.user?.role]) {
            return res.status(403).json({ error: 'Comment attribution must match the signed-in account.' });
        }

        const section = sectionOfComment({ comment_for: comment_for ? String(comment_for).toLowerCase().trim() : null });
        if (!canViewSection(req.user?.role, section)) {
            return res.status(403).json({ error: 'That part of the learning plan is not assigned to your role.', code: 'SECTION_RESTRICTED' });
        }

        const normalizedFor = comment_for ? String(comment_for).toLowerCase().trim() : null;
        const titles = Array.isArray(target_titles) ? target_titles.filter(Boolean) : [];

        if (!code || !commenter_role || !message || !String(message).trim()) {
            return res.status(400).json({ message: 'code, commenter_role and message are required.' });
        }
        if (!co_index && !normalizedFor) {
            return res.status(400).json({ message: 'Provide co_index (and week_index), or comment_for so the comment can be attached.' });
        }

        // The plan being reviewed (pcId), when the client sends it: one course code can have several plans (programs,
        // terms, revisions) and the newest revision is not necessarily the one on screen. It must be a plan of this code.
        const requestedPcId = /^[0-9]+$/.test(String(req.body?.pcId ?? '')) ? Number(req.body.pcId) : null;
        const offering = await sequelize.query(
            `SELECT pco.pc_offering_id
             FROM ProgramCourseOfferings pco
                 INNER JOIN Courses c ON c.course_id = pco.course_id
             WHERE c.course_no = ?${requestedPcId ? ' AND pco.pc_offering_id = ?' : ''}
             ORDER BY pco.revision_number DESC, pco.pc_offering_id DESC LIMIT 1;`,
            { replacements: requestedPcId ? [code, requestedPcId] : [code], type: Sequelize.QueryTypes.SELECT }
        );
        if (offering.length === 0) return res.status(404).json({ message: 'Course not found.' });
        const pcId = offering[0].pc_offering_id;
        const accessRows = await loadOfferingCourseRows(pcId);
        if (!canAccessCourseRows(req.user, accessRows)) {
            return res.status(403).json({ error: 'You do not have access to this course.' });
        }

        // Attach to the course assignment so the Revisions timeline can group
        // this comment under the reviewer's RETURNED event.
        const assign = await sequelize.query(
            `SELECT co_assign_id FROM CourseOfferingAssignments WHERE pc_offering_id = ? ORDER BY co_assign_id DESC LIMIT 1;`,
            { replacements: [pcId], type: Sequelize.QueryTypes.SELECT }
        );
        const coAssignId = assign.length > 0 ? assign[0].co_assign_id : null;
        if (!coAssignId) {
            return res.status(409).json({ error: 'This learning plan has no instructor assigned yet, so it takes no comments.' });
        }
        // An approved plan is closed: a new comment would sit open with nothing the instructor can do about it.
        // Changes go through a new revision instead.
        if (planEditState(await effectiveLogs(sequelize, coAssignId)).state === 'Approved') {
            return res.status(409).json({ error: 'This learning plan is already approved, so it no longer takes comments. Changes go into a new revision.' });
        }

        // The week: from CO + week indices when given (the full approver form). An older client sends an
        // ILO index instead; ILOs no longer own content, so that comment goes on the course outcome's first week.
        let weekId = null;
        if (co_index) {
            const cos = await sequelize.query(
                `SELECT co_id FROM CourseOutcomes WHERE pc_offering_id = ? ORDER BY co_id ASC;`,
                { replacements: [pcId], type: Sequelize.QueryTypes.SELECT }
            );
            const co = cos[Number(co_index) - 1];
            if (!co) return res.status(404).json({ message: `Course outcome CO${co_index} not found.` });
            const weeks = await sequelize.query(
                `SELECT week_id FROM Weeks WHERE co_id = ? ORDER BY week_id ASC;`,
                { replacements: [co.co_id], type: Sequelize.QueryTypes.SELECT }
            );
            const position = week_index ? Number(week_index) : 1;
            const week = weeks[position - 1];
            if (!week) return res.status(404).json({ message: `Week ${position} of CO${co_index} not found.` });
            weekId = week.week_id;
        }

        // Resolve target titles to ids, scoped to THIS plan (and to the week when one was picked):
        // titles repeat across courses and weeks.
        const targetIds = [];
        let firstTargetWeek = null;
        if (normalizedFor && titles.length > 0) {
            const lookup = TARGET_LOOKUPS[normalizedFor] || TARGET_LOOKUPS.references;
            for (const title of titles) {
                const rows = (await sequelize.query(lookup,
                    { replacements: [title, title, pcId], type: Sequelize.QueryTypes.SELECT }))
                    .filter(row => weekId == null || Number(row.week_id) === Number(weekId));
                const picked = normalizedFor === 'topics' ? rows.filter(row => Number(row.week_id) === Number(rows[0]?.week_id)) : rows.slice(0, 1);
                for (const row of picked) {
                    if (!targetIds.includes(row.id)) targetIds.push(row.id);
                    if (firstTargetWeek == null) firstTargetWeek = row.week_id;
                }
            }
        }

        if (weekId == null) weekId = firstTargetWeek;
        if (weekId == null) {
            // No specific target (e.g. a Director of Libraries suggestion with nothing picked): the first
            // week of this plan that has entries of this type, so it still reaches the planner and badges.
            const base = FIRST_WEEK_WITH[normalizedFor] || FIRST_WEEK_WITH.references;
            const alias = base.split(' ').pop();
            const fallback = await sequelize.query(
                `${base}
                     INNER JOIN Weeks w ON w.week_id = ${alias}.week_id
                     INNER JOIN CourseOutcomes co ON co.co_id = w.co_id
                 WHERE co.pc_offering_id = ? ORDER BY co.co_id ASC, w.week_id ASC LIMIT 1;`,
                { replacements: [pcId], type: Sequelize.QueryTypes.SELECT });
            if (fallback.length === 0) {
                return res.status(404).json({ message: 'No suitable week found in this course to attach the comment.' });
            }
            weekId = fallback[0].week_id;
        }

        const now = new Date();
        const [commentId] = await sequelize.query(
            `INSERT INTO Comments (commenter_role, commenter_user_id, commenter_name, message, resolved_status, co_assign_id, week_id, comment_for, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?);`,
            {
                replacements: [commenter_role, req.user?.id ?? null, req.user?.name || null, message, coAssignId, weekId, normalizedFor, now, now],
                type: Sequelize.QueryTypes.INSERT
            }
        );
        for (const tid of targetIds) {
            await sequelize.query(
                `INSERT INTO CommentTargets (comment_id, target_id, createdAt, updatedAt) VALUES (?, ?, ?, ?);`,
                { replacements: [commentId, tid, now, now] }
            );
        }

        // Tell the other side (the instructor, or the reviewers with a pending item). Never fails the comment.
        await onComment({
            offeringId: pcId, actorUserId: req.user?.id, commenterRole: commenter_role, assignmentId: coAssignId
        });

        return res.status(201).json({ comment_id: commentId, week_id: weekId, ilo_id: weekId, comment_for: normalizedFor, target_ids: targetIds });
    } catch (error) {
        console.error('Error creating course comment:', error);
        return res.status(500).json({ message: 'Internal server error creating comment.' });
    }
};

/**
 * GET /api/comments/by-course/:code?pcId=<optional>
 * Returns ALL comments for a course looked up by course_no, with computed labels (co_no, week_no)
 * and the resolved target title, so the approver sidebar can show each comment against its target.
 */
exports.getCourseCommentsByCode = async (req, res) => {
    try {
        const { code } = req.params;
        const { pcId } = req.query;

        if (!code) {
            return res.status(400).json({ message: 'Course code is required.' });
        }

        const accessRows = await loadCourseCodeRows(code, pcId);
        if (accessRows.length === 0) {
            return res.status(404).json({ message: 'Course not found.' });
        }
        if (!canAccessCourseRows(req.user, accessRows)) {
            return res.status(403).json({ error: 'You do not have access to this course.' });
        }

        // Only the offering whose access was just checked: other offerings of the same course code belong to other
        // programs, instructors and revisions, and their comments are not this caller's to read.
        const comments = await sequelize.query(
            `SELECT
                 c.comment_id,
                 c.commenter_role,
                 c.commenter_user_id,
                 c.commenter_name,
                 c.message,
                 c.resolved_status,
                 c.resolved_date,
                 c.week_id,
                 c.week_id AS ilo_id,
                 c.comment_for,
                 ct.target_id,
                 wr.reference_id AS target_reference_id,
                 c.createdAt,
                 c.updatedAt,
                 co.co_description,
                 (SELECT COUNT(*) FROM CourseOutcomes co2
                  WHERE co2.pc_offering_id = co.pc_offering_id AND co2.co_id <= co.co_id) AS co_no,
                 (SELECT COUNT(*) FROM Weeks w2
                  WHERE w2.co_id = w.co_id AND w2.week_id <= w.week_id) AS week_no_in_co,
                 (SELECT COUNT(*) FROM Weeks w3 INNER JOIN CourseOutcomes co3 ON co3.co_id = w3.co_id
                  WHERE co3.pc_offering_id = co.pc_offering_id
                    AND (co3.co_id < co.co_id OR (co3.co_id = co.co_id AND w3.week_id <= w.week_id))) AS week_no,
                 CASE c.comment_for
                     WHEN 'topics'     THEN COALESCE(top.title || CASE WHEN st.title IS NOT NULL AND st.title <> '' THEN ': ' || st.title ELSE '' END, top_direct.title)
                     WHEN 'references' THEN ref.title
                     WHEN 'tlas'       THEN tla.tla_name
                 END AS target_title
             FROM Comments c
                 LEFT JOIN CommentTargets ct ON ct.comment_id = c.comment_id
                 INNER JOIN Weeks w ON w.week_id = c.week_id
                 INNER JOIN CourseOutcomes co ON co.co_id = w.co_id
                 INNER JOIN ProgramCourseOfferings pco ON pco.pc_offering_id = co.pc_offering_id
                 LEFT JOIN Subtopics st
                     ON c.comment_for = 'topics' AND st.subtopic_id = ct.target_id
                 LEFT JOIN Topics top ON top.topic_id = st.topic_id
                 LEFT JOIN Topics top_direct
                     ON c.comment_for = 'topics' AND st.subtopic_id IS NULL AND top_direct.topic_id = ct.target_id
                 LEFT JOIN WeeklyReferences wr
                     ON c.comment_for = 'references' AND wr.weekly_reference_id = ct.target_id
                 LEFT JOIN \`References\` ref ON ref.reference_id = wr.reference_id
                 LEFT JOIN TeachingAndLearningActivities tla
                     ON c.comment_for = 'tlas' AND tla.tla_id = ct.target_id
             WHERE pco.pc_offering_id = ?
             ORDER BY c.createdAt DESC;`,
            {
                replacements: [accessRows[0].pc_offering_id],
                type: Sequelize.QueryTypes.SELECT
            }
        );

        const offeringId = accessRows[0].pc_offering_id;
        return res.status(200).json(visibleComments(req, await withRounds(await forInstructorTiming(req, comments, offeringId), offeringId)));
    } catch (error) {
        console.error('Error fetching course comments by code:', error);
        return res.status(500).json({ message: 'Internal server error fetching course comments.' });
    }
};

/**
 * 3. GET /api/comments/course/:pcId/:revNum
 * Returns ALL comments for a course offering (and revision number, when given), across all weeks and types.
 */
exports.getCourseComments = async (req, res) => {
    try {
        const { pcId, revNum } = req.params;

        if (!pcId) {
            return res.status(400).json({ message: 'Course offering ID and revision number are required.' });
        }

        const comments = await sequelize.query(
            `SELECT
                 c.comment_id,
                 c.commenter_role,
                 c.commenter_user_id,
                 c.commenter_name,
                 c.message,
                 c.resolved_status,
                 c.resolved_date,
                 c.week_id,
                 c.week_id AS ilo_id,
                 c.comment_for,
                 ct.target_id,
                 wr.reference_id AS target_reference_id,
                 c.createdAt,
                 c.updatedAt,
                 co.co_description,
                 (SELECT COUNT(*) FROM CourseOutcomes co2
                  WHERE co2.pc_offering_id = co.pc_offering_id AND co2.co_id <= co.co_id) AS co_no,
                 (SELECT COUNT(*) FROM Weeks w2
                  WHERE w2.co_id = w.co_id AND w2.week_id <= w.week_id) AS week_no_in_co,
                 (SELECT COUNT(*) FROM Weeks w3 INNER JOIN CourseOutcomes co3 ON co3.co_id = w3.co_id
                  WHERE co3.pc_offering_id = co.pc_offering_id
                    AND (co3.co_id < co.co_id OR (co3.co_id = co.co_id AND w3.week_id <= w.week_id))) AS week_no,
                 CASE c.comment_for
                     WHEN 'topics'     THEN COALESCE(top.title || CASE WHEN st.title IS NOT NULL AND st.title <> '' THEN ': ' || st.title ELSE '' END, top_direct.title)
                     WHEN 'references' THEN ref.title
                     WHEN 'tlas'       THEN tla.tla_name
                 END AS target_title
             FROM Comments c
                 LEFT JOIN CommentTargets ct ON ct.comment_id = c.comment_id
                 INNER JOIN Weeks w ON w.week_id = c.week_id
                 INNER JOIN CourseOutcomes co ON co.co_id = w.co_id
                 INNER JOIN ProgramCourseOfferings pco ON pco.pc_offering_id = co.pc_offering_id
                 LEFT JOIN Subtopics st
                     ON c.comment_for = 'topics' AND st.subtopic_id = ct.target_id
                 LEFT JOIN Topics top ON top.topic_id = st.topic_id
                 LEFT JOIN Topics top_direct
                     ON c.comment_for = 'topics' AND st.subtopic_id IS NULL AND top_direct.topic_id = ct.target_id
                 LEFT JOIN WeeklyReferences wr
                     ON c.comment_for = 'references' AND wr.weekly_reference_id = ct.target_id
                 LEFT JOIN \`References\` ref ON ref.reference_id = wr.reference_id
                 LEFT JOIN TeachingAndLearningActivities tla
                     ON c.comment_for = 'tlas' AND tla.tla_id = ct.target_id
             WHERE pco.pc_offering_id = ? AND (? IS NULL OR pco.revision_number = ?)
             ORDER BY c.createdAt DESC;`,
            {
                replacements: [pcId, revNum || null, revNum || null],
                type: Sequelize.QueryTypes.SELECT
            }
        );

        return res.status(200).json(visibleComments(req, await withRounds(await forInstructorTiming(req, comments, Number(pcId)), Number(pcId))));
    } catch (error) {
        console.error('Error fetching course comments:', error);
        return res.status(500).json({ message: 'Internal server error fetching course comments.' });
    }
};

/**
 * 4. PUT /api/comments/update-resolution
 * Synchronizes resolution state changes.
 */
exports.updateResolutionStatuses = async (req, res) => {
    try {
        const { updates } = req.body;

        if (!updates || !Array.isArray(updates)) {
            return res.status(400).json({ message: 'Invalid payload structure. Updates array required.' });
        }

        if (updates.length === 0) {
            return res.status(200).json({ message: 'No adjustment tracking flags submitted.' });
        }

        if (updates.length > 100) {
            return res.status(400).json({ message: 'At most 100 resolution updates may be submitted at once.' });
        }

        const commentIds = [...new Set(updates.map(item => Number(item?.comment_id)))];
        if (commentIds.some(id => !Number.isSafeInteger(id) || id <= 0)) {
            return res.status(400).json({ message: 'Each update must contain a valid comment_id.' });
        }
        const accessRows = await loadCommentCourseRows(commentIds);
        for (const commentId of commentIds) {
            const rowsForComment = accessRows.filter(row => Number(row.comment_id) === commentId);
            if (rowsForComment.length === 0) {
                return res.status(404).json({ message: `Comment ${commentId} was not found.` });
            }
            if (!canAccessCourseRows(req.user, rowsForComment)) {
                return res.status(403).json({ error: 'You do not have access to this course.' });
            }
        }

        // Remember which comments are being newly resolved, to tell their authors afterwards.
        const newlyResolvedIds = updates.filter(item => item.resolved_status).map(item => Number(item.comment_id));
        const previouslyOpen = newlyResolvedIds.length === 0 ? [] : await sequelize.query(
            `SELECT c.comment_id, c.commenter_user_id AS authorUserId, a.pc_offering_id AS offeringId
             FROM Comments c LEFT JOIN CourseOfferingAssignments a ON a.co_assign_id = c.co_assign_id
             WHERE c.resolved_status = 0 AND c.comment_id IN (${newlyResolvedIds.map(() => '?').join(', ')});`,
            { replacements: newlyResolvedIds, type: Sequelize.QueryTypes.SELECT });

        const now = new Date();
        await sequelize.transaction(async (t) => {
            for (const item of updates) {
                await sequelize.query(
                    `UPDATE Comments
                     SET resolved_status = ?, resolved_date = ?, updatedAt = ?
                     WHERE comment_id = ?;`,
                    {
                        replacements: [item.resolved_status ? 1 : 0, item.resolved_status ? now : null, now, item.comment_id],
                        transaction: t
                    }
                );
            }
        });

        if (previouslyOpen.length) {
            await onCommentsResolved({ resolved: previouslyOpen, actorUserId: req.user?.id, actorRole: req.user?.role });
        }

        return res.status(200).json({ message: 'Resolution statuses synchronized successfully.' });
    } catch (error) {
        console.error('Error batch updating comment resolution statuses:', error);
        return res.status(500).json({ message: 'Internal database transaction failure updating checkpoints.' });
    }
};

exports.updateCommentResolutions = exports.updateResolutionStatuses;
