const { sequelize } = require('../models');

// 1. Fetch unread counts grouped by Week and Type (for the red notification badges)
exports.getUnresolvedCommentCounts = async (req, res) => {
    const { pcId, revNum } = req.params;

    try {
        const [results] = await sequelize.query(`
            SELECT 
                c.week_id,
                c.week_id AS ilo_id,
                c.comment_for,
                COUNT(DISTINCT c.comment_id) as unresolved_count
            FROM Comments c
            JOIN Weeks w ON w.week_id = c.week_id
            JOIN CourseOutcomes co ON co.co_id = w.co_id
            JOIN ProgramCourseOfferings pco ON pco.pc_offering_id = co.pc_offering_id
            WHERE pco.pc_offering_id = ? 
              AND pco.revision_number = ?
              AND c.resolved_status = 0
            GROUP BY c.week_id, c.comment_for
        `, {
            replacements: [pcId, revNum]
        });

        res.json(results);
    } catch (err) {
        console.error('Error fetching comment counts:', err);
        res.status(500).json({ error: 'Database error fetching comment counts.' });
    }
};

// 2. Fetch specific comments for a Week + Target Type (Topics, TLAs, or References)
// Supports multi-select subtopic targets and resolves parent Topic title + Subtopic title(s)
exports.getCommentsByTarget = async (req, res) => {
    const { iloId, commentFor } = req.params;
    const weekId = Number(iloId);

    try {
        const [rows] = await sequelize.query(`
            SELECT 
                c.comment_id,
                c.co_assign_id,
                c.commenter_role,
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
            replacements: [weekId, commentFor]
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

        res.json(finalComments);
    } catch (err) {
        console.error('Error fetching targeted comments:', err);
        res.status(500).json({ error: 'Database error fetching targeted comments.' });
    }
};

// 3. Batch update resolved statuses when Instructor clicks "Save"
exports.updateResolutionStatuses = async (req, res) => {
    const { updates } = req.body; // Expecting array: [{ comment_id: 1, resolved_status: true }, ...]

    if (!Array.isArray(updates) || updates.length === 0) {
        return res.json({ message: 'No comment updates provided.' });
    }

    const t = await sequelize.transaction();

    try {
        const now = new Date();

        for (const item of updates) {
            const resolvedDate = item.resolved_status ? now : null;

            await sequelize.query(`
                UPDATE Comments 
                SET resolved_status = ?, resolved_date = ?, updatedAt = ?
                WHERE comment_id = ?
            `, {
                replacements: [item.resolved_status ? 1 : 0, resolvedDate, now, item.comment_id],
                transaction: t
            });
        }

        await t.commit();
        res.json({ message: 'Comment resolutions updated successfully.' });
    } catch (err) {
        await t.rollback();
        console.error('Error updating comment resolutions:', err);
        res.status(500).json({ error: 'Failed to update comment resolutions.' });
    }
};

exports.updateCommentResolutions = exports.updateResolutionStatuses;
