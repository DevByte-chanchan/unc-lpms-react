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
 * 3. PUT /api/comments/update-resolution
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

/**
 * 4. POST /api/comments
 * Creates a comment (from an approver/reviewer) and links its selected targets
 * (Topics / References / TLAs) via the CommentTargets table.
 * Body: { co_assign_id, commenter_role, message, ilo_id, comment_for, target_ids: [] }
 *   - comment_for: 'topics' | 'references' | 'tlas'
 *   - target_ids : primary keys of the selected Topic/Reference/TLA rows
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

        const commentId = await sequelize.transaction(async (t) => {
            const [insertId] = await sequelize.query(
                `INSERT INTO Comments
                     (co_assign_id, commenter_role, message, resolved_status, ilo_id, comment_for, createdAt, updatedAt)
                 VALUES (?, ?, ?, false, ?, ?, NOW(), NOW());`,
                {
                    replacements: [co_assign_id, commenter_role, message, ilo_id, normalizedFor],
                    type: Sequelize.QueryTypes.INSERT,
                    transaction: t
                }
            );

            if (ids.length > 0) {
                const placeholders = ids.map(() => '(?, ?, NOW(), NOW())').join(', ');
                const flat = [];
                ids.forEach(tid => { flat.push(insertId, tid); });
                await sequelize.query(
                    `INSERT INTO CommentTargets (comment_id, target_id, createdAt, updatedAt)
                     VALUES ${placeholders};`,
                    { replacements: flat, transaction: t }
                );
            }

            return insertId;
        });

        const [created] = await sequelize.query(
            `SELECT c.comment_id, c.co_assign_id, c.commenter_role, c.message, c.resolved_status,
                    c.ilo_id, c.comment_for, c.createdAt
             FROM Comments c WHERE c.comment_id = ?;`,
            { replacements: [commentId], type: Sequelize.QueryTypes.SELECT }
        );
        const targets = await sequelize.query(
            `SELECT target_id FROM CommentTargets WHERE comment_id = ?;`,
            { replacements: [commentId], type: Sequelize.QueryTypes.SELECT }
        );

        return res.status(201).json({ data: { ...created, targets: targets.map(row => row.target_id) } });
    } catch (error) {
        console.error('Error creating comment:', error);
        return res.status(500).json({ message: 'Internal server error creating comment.' });
    }
};