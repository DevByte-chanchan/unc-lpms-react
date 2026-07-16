'use strict';

const { sequelize, Sequelize } = require('../models');

/**
 * 1. GET /api/comments/unresolved-counts/:pcId/:revNum
 * Used by the main syllabus screen to get counts for red notification badges.
 */
exports.getUnresolvedCommentCounts = async (req, res) => {
    try {
        // Fixed: Mapped to the actual router parameters
        const { pcId, revNum } = req.params;

        if (!pcId || !revNum) {
            return res.status(400).json({ message: 'Course offering ID and revision number are required.' });
        }

        const counts = await sequelize.query(
            `SELECT
                 c.ilo_id,
                 c.comment_for,
                 COUNT(c.comment_id) AS count
             FROM Comments c
                 INNER JOIN IntendedLearningOutcomes ilo ON ilo.ilo_id = c.ilo_id
                 INNER JOIN CourseOutcomes co ON co.co_id = ilo.co_id
                 INNER JOIN ProgramCourseOfferings pco ON pco.pc_offering_id = co.pc_offering_id
             WHERE pco.pc_offering_id = ? AND pco.revision_number = ? AND c.resolved_status = false
             GROUP BY c.ilo_id, c.comment_for;`,
            {
                replacements: [pcId, revNum],
                type: Sequelize.QueryTypes.SELECT
            }
        );

        return res.status(200).json(counts);
    } catch (error) {
        console.error('Error fetching comment counts:', error);
        return res.status(500).json({ message: 'Internal server error working with comment statistics.' });
    }
};

/**
 * 2. GET /api/comments/filter/:iloId/:commentFor
 * Retrieves comments utilizing a JOIN with the new CommentTargets table.
 */
exports.getCommentsByTarget = async (req, res) => {
    try {
        const { iloId, commentFor } = req.params;

        if (!iloId || !commentFor) {
            return res.status(400).json({ message: 'Missing required routing parameters (iloId, commentFor).' });
        }

        // Fixed: Added a LEFT JOIN to pull target_id from the new CommentTargets table
        const comments = await sequelize.query(
            `SELECT
                 c.comment_id,
                 c.commenter_role,
                 c.message,
                 c.resolved_status,
                 c.ilo_id,
                 c.comment_for,
                 ct.target_id,
                 c.createdAt
             FROM Comments c
                      LEFT JOIN CommentTargets ct ON c.comment_id = ct.comment_id
             WHERE c.ilo_id = ? AND c.comment_for = ?
             ORDER BY c.createdAt DESC;`,
            {
                replacements: [iloId, commentFor.toLowerCase().trim()],
                type: Sequelize.QueryTypes.SELECT
            }
        );

        return res.status(200).json(comments);
    } catch (error) {
        console.error('Error fetching context targeted comments:', error);
        return res.status(500).json({ message: 'Internal server error processing review items.' });
    }
};

/**
 * POST /api/comments/by-course
 * Creates an approver comment from the approval sidebar. The client only knows
 * labels (CO2, CO2-ILO1, target titles) — this resolves them against the
 * course's latest offering so the comment lands on real ilo_id / target ids,
 * making it visible in the instructor's Review Corrections + notif badges.
 * Body: { code, commenter_role, message, co_index, ilo_index, comment_for, target_titles: [] }
 */
exports.createCourseComment = async (req, res) => {
    try {
        const { code, commenter_role, message, co_index, ilo_index, comment_for, target_titles } = req.body || {};

        const normalizedFor = comment_for ? String(comment_for).toLowerCase().trim() : null;
        const titles = Array.isArray(target_titles) ? target_titles.filter(Boolean) : [];

        if (!code || !commenter_role || !message || !String(message).trim()) {
            return res.status(400).json({ message: 'code, commenter_role and message are required.' });
        }
        const hasIndices = co_index && ilo_index;
        if (!hasIndices && !normalizedFor) {
            return res.status(400).json({ message: 'Provide co_index+ilo_index, or comment_for so the comment can be attached.' });
        }

        const offering = await sequelize.query(
            `SELECT pco.pc_offering_id
             FROM ProgramCourseOfferings pco
                 INNER JOIN Courses c ON c.course_id = pco.course_id
             WHERE c.course_no = ?
             ORDER BY pco.revision_number DESC LIMIT 1;`,
            { replacements: [code], type: Sequelize.QueryTypes.SELECT }
        );
        if (offering.length === 0) return res.status(404).json({ message: 'Course not found.' });
        const pcId = offering[0].pc_offering_id;

        // Attach to the course assignment so the Revisions timeline can group
        // this comment under the reviewer's RETURNED event.
        const assign = await sequelize.query(
            `SELECT co_assign_id FROM CourseOfferingAssignments WHERE pc_offering_id = ? ORDER BY co_assign_id DESC LIMIT 1;`,
            { replacements: [pcId], type: Sequelize.QueryTypes.SELECT }
        );
        const coAssignId = assign.length > 0 ? assign[0].co_assign_id : null;

        // Resolve target titles → ids, scoped to THIS course's offering —
        // titles are duplicated across courses (each seeder inserts its own
        // copy), so a global title lookup can match another course's row.
        const targetIds = [];
        if (normalizedFor && titles.length > 0) {
            const scopedLookups = {
                references: `SELECT r.reference_id AS id FROM \`References\` r
                             INNER JOIN ILOReferences ir ON ir.reference_id = r.reference_id
                             INNER JOIN IntendedLearningOutcomes i ON i.ilo_id = ir.ilo_id
                             INNER JOIN CourseOutcomes co ON co.co_id = i.co_id
                             WHERE r.title = ? AND co.pc_offering_id = ? LIMIT 1;`,
                topics: `SELECT t.topic_id AS id FROM Topics t
                         INNER JOIN ILOTopics it ON it.topic_id = t.topic_id
                         INNER JOIN IntendedLearningOutcomes i ON i.ilo_id = it.ilo_id
                         INNER JOIN CourseOutcomes co ON co.co_id = i.co_id
                         WHERE t.title = ? AND co.pc_offering_id = ? LIMIT 1;`,
                tlas: `SELECT tla.tla_id AS id FROM TeachingAndLearningActivities tla
                       INNER JOIN TopicTLAs tt ON tt.tla_id = tla.tla_id
                       INNER JOIN ILOTopics it ON it.ilo_topic_id = tt.ilo_topic_id
                       INNER JOIN IntendedLearningOutcomes i ON i.ilo_id = it.ilo_id
                       INNER JOIN CourseOutcomes co ON co.co_id = i.co_id
                       WHERE tla.tla_name = ? AND co.pc_offering_id = ? LIMIT 1;`,
            };
            const lookup = scopedLookups[normalizedFor] || scopedLookups.references;
            for (const t of titles) {
                const r = await sequelize.query(lookup,
                    { replacements: [t, pcId], type: Sequelize.QueryTypes.SELECT });
                if (r.length > 0) targetIds.push(r[0].id);
            }
        }

        // Resolve the ILO: from CO/ILO indices when given (full approver form),
        // otherwise from the first target itself (Director of Libraries flow,
        // which comments on a reference without picking a CO/ILO).
        let iloId = null;
        if (hasIndices) {
            const cos = await sequelize.query(
                `SELECT co_id FROM CourseOutcomes WHERE pc_offering_id = ? ORDER BY co_id ASC;`,
                { replacements: [pcId], type: Sequelize.QueryTypes.SELECT }
            );
            const co = cos[Number(co_index) - 1];
            if (!co) return res.status(404).json({ message: `Course outcome CO${co_index} not found.` });
            const ilos = await sequelize.query(
                `SELECT ilo_id FROM IntendedLearningOutcomes WHERE co_id = ? ORDER BY ilo_id ASC;`,
                { replacements: [co.co_id], type: Sequelize.QueryTypes.SELECT }
            );
            const ilo = ilos[Number(ilo_index) - 1];
            if (!ilo) return res.status(404).json({ message: `ILO ${ilo_index} of CO${co_index} not found.` });
            iloId = ilo.ilo_id;
        } else {
            if (targetIds.length > 0) {
                const joins = {
                    references: `SELECT ir.ilo_id AS ilo_id FROM ILOReferences ir
                                 INNER JOIN IntendedLearningOutcomes i ON i.ilo_id = ir.ilo_id
                                 INNER JOIN CourseOutcomes co ON co.co_id = i.co_id
                                 WHERE ir.reference_id = ? AND co.pc_offering_id = ? LIMIT 1;`,
                    topics: `SELECT it.ilo_id AS ilo_id FROM ILOTopics it
                             INNER JOIN IntendedLearningOutcomes i ON i.ilo_id = it.ilo_id
                             INNER JOIN CourseOutcomes co ON co.co_id = i.co_id
                             WHERE it.topic_id = ? AND co.pc_offering_id = ? LIMIT 1;`,
                    tlas: `SELECT it.ilo_id AS ilo_id FROM TopicTLAs tt
                           INNER JOIN ILOTopics it ON it.ilo_topic_id = tt.ilo_topic_id
                           INNER JOIN IntendedLearningOutcomes i ON i.ilo_id = it.ilo_id
                           INNER JOIN CourseOutcomes co ON co.co_id = i.co_id
                           WHERE tt.tla_id = ? AND co.pc_offering_id = ? LIMIT 1;`,
                };
                const found = await sequelize.query(joins[normalizedFor] || joins.references,
                    { replacements: [targetIds[0], pcId], type: Sequelize.QueryTypes.SELECT });
                if (found.length > 0) iloId = found[0].ilo_id;
            }
            if (!iloId) {
                // No specific target (e.g. DOL suggestion-only submission) —
                // attach to the first ILO of this offering that has entries of
                // this type, so it still reaches Review Corrections + badges.
                const fallbacks = {
                    references: `SELECT ir.ilo_id AS ilo_id FROM ILOReferences ir
                                 INNER JOIN IntendedLearningOutcomes i ON i.ilo_id = ir.ilo_id
                                 INNER JOIN CourseOutcomes co ON co.co_id = i.co_id
                                 WHERE co.pc_offering_id = ? ORDER BY ir.ilo_id ASC LIMIT 1;`,
                    topics: `SELECT it.ilo_id AS ilo_id FROM ILOTopics it
                             INNER JOIN IntendedLearningOutcomes i ON i.ilo_id = it.ilo_id
                             INNER JOIN CourseOutcomes co ON co.co_id = i.co_id
                             WHERE co.pc_offering_id = ? ORDER BY it.ilo_id ASC LIMIT 1;`,
                    tlas: `SELECT it.ilo_id AS ilo_id FROM TopicTLAs tt
                           INNER JOIN ILOTopics it ON it.ilo_topic_id = tt.ilo_topic_id
                           INNER JOIN IntendedLearningOutcomes i ON i.ilo_id = it.ilo_id
                           INNER JOIN CourseOutcomes co ON co.co_id = i.co_id
                           WHERE co.pc_offering_id = ? ORDER BY it.ilo_id ASC LIMIT 1;`,
                };
                const fb = await sequelize.query(fallbacks[normalizedFor] || fallbacks.references,
                    { replacements: [pcId], type: Sequelize.QueryTypes.SELECT });
                if (fb.length === 0) {
                    return res.status(404).json({ message: 'No suitable ILO found in this course to attach the comment.' });
                }
                iloId = fb[0].ilo_id;
            }
        }

        const now = new Date();
        const [commentId] = await sequelize.query(
            `INSERT INTO Comments (commenter_role, message, resolved_status, co_assign_id, ilo_id, comment_for, createdAt, updatedAt)
             VALUES (?, ?, 0, ?, ?, ?, ?, ?);`,
            { replacements: [commenter_role, message, coAssignId, iloId, normalizedFor, now, now], type: Sequelize.QueryTypes.INSERT }
        );
        for (const tid of targetIds) {
            await sequelize.query(
                `INSERT INTO CommentTargets (comment_id, target_id, createdAt, updatedAt) VALUES (?, ?, ?, ?);`,
                { replacements: [commentId, tid, now, now] }
            );
        }

        return res.status(201).json({ comment_id: commentId, ilo_id: iloId, comment_for: normalizedFor, target_ids: targetIds });
    } catch (error) {
        console.error('Error creating course comment:', error);
        return res.status(500).json({ message: 'Internal server error creating comment.' });
    }
};

/**
 * GET /api/comments/by-course/:code?pcId=<optional>
 * Returns ALL comments for a course looked up by course_no, enriched with computed
 * CO/ILO labels (co_no, ilo_no) and the resolved target title so the approver
 * sidebar can show comments fully connected to their targets — even when the
 * page URL has no pcId/revNum params.
 */
exports.getCourseCommentsByCode = async (req, res) => {
    try {
        const { code } = req.params;
        const { pcId } = req.query;

        if (!code) {
            return res.status(400).json({ message: 'Course code is required.' });
        }

        let offeringFilter = '';
        const replacements = [code];
        if (pcId && !Number.isNaN(Number(pcId))) {
            offeringFilter = ' AND pco.pc_offering_id = ?';
            replacements.push(Number(pcId));
        }

        const comments = await sequelize.query(
            `SELECT
                 c.comment_id,
                 c.commenter_role,
                 c.message,
                 c.resolved_status,
                 c.ilo_id,
                 c.comment_for,
                 ct.target_id,
                 c.createdAt,
                 ilo.description AS ilo_description,
                 co.co_description,
                 (SELECT COUNT(*) FROM CourseOutcomes co2
                  WHERE co2.pc_offering_id = co.pc_offering_id AND co2.co_id <= co.co_id) AS co_no,
                 (SELECT COUNT(*) FROM IntendedLearningOutcomes i2
                  WHERE i2.co_id = ilo.co_id AND i2.ilo_id <= ilo.ilo_id) AS ilo_no,
                 CASE c.comment_for
                     WHEN 'topics'     THEN top.title
                     WHEN 'references' THEN ref.title
                     WHEN 'tlas'       THEN tla.tla_name
                 END AS target_title
             FROM Comments c
                 LEFT JOIN CommentTargets ct ON ct.comment_id = c.comment_id
                 INNER JOIN IntendedLearningOutcomes ilo ON ilo.ilo_id = c.ilo_id
                 INNER JOIN CourseOutcomes co ON co.co_id = ilo.co_id
                 INNER JOIN ProgramCourseOfferings pco ON pco.pc_offering_id = co.pc_offering_id
                 INNER JOIN Courses crs ON crs.course_id = pco.course_id
                 LEFT JOIN Topics top
                     ON c.comment_for = 'topics' AND top.topic_id = ct.target_id
                 LEFT JOIN \`References\` ref
                     ON c.comment_for = 'references' AND ref.reference_id = ct.target_id
                 LEFT JOIN TeachingAndLearningActivities tla
                     ON c.comment_for = 'tlas' AND tla.tla_id = ct.target_id
             WHERE crs.course_no = ?${offeringFilter}
             ORDER BY c.createdAt DESC;`,
            {
                replacements,
                type: Sequelize.QueryTypes.SELECT
            }
        );

        return res.status(200).json(comments);
    } catch (error) {
        console.error('Error fetching course comments by code:', error);
        return res.status(500).json({ message: 'Internal server error fetching course comments.' });
    }
};

/**
 * 3. GET /api/comments/course/:pcId/:revNum
 * Returns ALL comments for a course offering + revision number, across all ILOs and types.
 * Used by the approver view to merge server-side comments with localStorage comments.
 */
exports.getCourseComments = async (req, res) => {
    try {
        const { pcId, revNum } = req.params;

        if (!pcId || !revNum) {
            return res.status(400).json({ message: 'Course offering ID and revision number are required.' });
        }

        const comments = await sequelize.query(
            `SELECT
                 c.comment_id,
                 c.commenter_role,
                 c.message,
                 c.resolved_status,
                 c.ilo_id,
                 c.comment_for,
                 ct.target_id,
                 c.createdAt,
                 c.updatedAt
             FROM Comments c
                      LEFT JOIN CommentTargets ct ON c.comment_id = ct.comment_id
                      INNER JOIN IntendedLearningOutcomes ilo ON ilo.ilo_id = c.ilo_id
                      INNER JOIN CourseOutcomes co ON co.co_id = ilo.co_id
                      INNER JOIN ProgramCourseOfferings pco ON pco.pc_offering_id = co.pc_offering_id
             WHERE pco.pc_offering_id = ? AND pco.revision_number = ?
             ORDER BY c.createdAt DESC;`,
            {
                replacements: [pcId, revNum],
                type: Sequelize.QueryTypes.SELECT
            }
        );

        return res.status(200).json(comments);
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

        await sequelize.transaction(async (t) => {
            for (const item of updates) {
                await sequelize.query(
                    `UPDATE Comments
                     SET resolved_status = ?
                     WHERE comment_id = ?;`,
                    {
                        replacements: [item.resolved_status ? 1 : 0, item.comment_id],
                        transaction: t
                    }
                );
            }
        });

        return res.status(200).json({ message: 'Resolution statuses synchronized successfully.' });
    } catch (error) {
        console.error('Error batch updating comment resolution statuses:', error);
        return res.status(500).json({ message: 'Internal database transaction failure updating checkpoints.' });
    }
};