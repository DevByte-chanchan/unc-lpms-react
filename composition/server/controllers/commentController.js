'use strict';

// Extract lowercase 'sequelize' (the instance) and uppercase 'Sequelize' (the library helper)
const { sequelize, Sequelize } = require('../models');

/**
 * 1. GET /api/comments/unresolved-counts/:code
 * Used by the main syllabus screen to get counts for red notification badges.
 */
exports.getUnresolvedCommentCounts = async (req, res) => {
    try {
        const { code } = req.params;

        if (!code) {
            return res.status(400).json({ message: 'Course code is required.' });
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
                 INNER JOIN Courses crs ON crs.course_id = pco.course_id
             WHERE crs.course_no = ? AND c.resolved_status = false
             GROUP BY c.ilo_id, c.comment_for;`,
            {
                replacements: [code],
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
 * 2. GET /api/comments/course/:code
 * Returns ALL comments for a course, joined through ILO → CO → Offering → Course,
 * with computed CO/ILO labels (CO1, CO1-ILO2) and the resolved target title so the
 * approver sidebar shows the same connected comments the instructor sees in
 * Review Corrections.
 */
exports.getCourseComments = async (req, res) => {
    try {
        const { code } = req.params;

        if (!code) {
            return res.status(400).json({ message: 'Course code is required.' });
        }

        const comments = await sequelize.query(
            `SELECT
                 c.comment_id,
                 c.commenter_role,
                 c.message,
                 c.resolved_status,
                 c.resolved_date,
                 c.ilo_id,
                 c.comment_for,
                 c.target_id,
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
                 INNER JOIN IntendedLearningOutcomes ilo ON ilo.ilo_id = c.ilo_id
                 INNER JOIN CourseOutcomes co ON co.co_id = ilo.co_id
                 INNER JOIN ProgramCourseOfferings pco ON pco.pc_offering_id = co.pc_offering_id
                 INNER JOIN Courses crs ON crs.course_id = pco.course_id
                 LEFT JOIN Topics top
                     ON c.comment_for = 'topics' AND top.topic_id = c.target_id
                 LEFT JOIN \`References\` ref
                     ON c.comment_for = 'references' AND ref.reference_id = c.target_id
                 LEFT JOIN TopicTLAs ttla
                     ON c.comment_for = 'tlas' AND ttla.topic_tla_id = c.target_id
                 LEFT JOIN TeachingAndLearningActivities tla
                     ON tla.tla_id = ttla.tla_id
             WHERE crs.course_no = ?
             ORDER BY c.createdAt DESC;`,
            {
                replacements: [code],
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
 * 3. GET /api/comments/filter/:iloId/:commentFor
 * Reusable endpoint that retrieves comments for ANY form.
 * :commentFor can be dynamically passed as 'references', 'topics', or 'tlas' by the UI.
 */
exports.getCommentsByTarget = async (req, res) => {
    try {
        const { iloId, commentFor } = req.params;

        // Ensure input data safety checks
        if (!iloId || !commentFor) {
            return res.status(400).json({ message: 'Missing required routing parameters (iloId, commentFor).' });
        }

        const comments = await sequelize.query(
            `SELECT 
                comment_id, 
                commenter_role, 
                message, 
                resolved_status, 
                ilo_id, 
                comment_for, 
                target_id, 
                createdAt 
             FROM Comments 
             WHERE ilo_id = ? AND comment_for = ?
             ORDER BY createdAt DESC;`,
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
 * 3. PUT /api/comments/update-resolution
 * Reusable batch update endpoint that synchronizes resolution state changes for any list.
 */
exports.updateResolutionStatuses = async (req, res) => {
    try {
        const { updates } = req.body; // Expects an array layout: [{ comment_id: 1, resolved_status: true }, ...]

        if (!updates || !Array.isArray(updates)) {
            return res.status(400).json({ message: 'Invalid payload structure. Updates array required.' });
        }

        if (updates.length === 0) {
            return res.status(200).json({ message: 'No adjustment tracking flags submitted.' });
        }

        // Execute batch update mutations safely enclosed within an ACID SQL transaction
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

/**
 * POST /api/comments
 * Creates an approver comment plus its selected targets (topics/references/tlas).
 * Body: { co_assign_id, commenter_role, message, ilo_id, comment_for, target_ids: [] }
 */
exports.createComment = async (req, res) => {
    try {
        const {
            co_assign_id = null,
            commenter_role,
            message,
            ilo_id = null,
            comment_for = null,
            target_ids = []
        } = req.body || {};

        if (!commenter_role || !message || !String(message).trim()) {
            return res.status(400).json({ message: 'commenter_role and message are required.' });
        }

        const normalizedFor = comment_for ? String(comment_for).toLowerCase().trim() : null;
        const ids = Array.isArray(target_ids)
            ? target_ids.filter(v => v !== null && v !== undefined && v !== '')
            : [];

        // Your Comments table stores a single target_id per row, so insert ONE row per selected
        // target (matches your seed + getCommentsByTarget read). Also mirror into CommentTargets.
        const perTarget = ids.length > 0 ? ids : [null];

        const createdRows = await sequelize.transaction(async (t) => {
            const out = [];
            for (const tid of perTarget) {
                const [insertId] = await sequelize.query(
                    `INSERT INTO Comments
                         (commenter_role, message, resolved_status, co_assign_id, ilo_id, comment_for, target_id, createdAt, updatedAt)
                     VALUES (?, ?, false, ?, ?, ?, ?, NOW(), NOW());`,
                    {
                        replacements: [commenter_role, message, co_assign_id, ilo_id, normalizedFor, tid],
                        type: Sequelize.QueryTypes.INSERT,
                        transaction: t
                    }
                );
                if (tid !== null) {
                    await sequelize.query(
                        `INSERT INTO CommentTargets (comment_id, target_id, createdAt, updatedAt) VALUES (?, ?, NOW(), NOW());`,
                        { replacements: [insertId, tid], transaction: t }
                    );
                }
                out.push({ comment_id: insertId, target_id: tid });
            }
            return out;
        });

        return res.status(201).json({
            data: { commenter_role, message, ilo_id, comment_for: normalizedFor, comments: createdRows }
        });
    } catch (error) {
        console.error('Error creating comment:', error);
        return res.status(500).json({ message: 'Internal server error creating comment.' });
    }
};