const { sequelize, UserAccount, Faculty, IndustryConsultant } = require('../models');

const formatRoleLabel = (rawRole) => {
    const map = {
        INSTRUCTOR: 'Instructor',
        PROGRAM_HEAD: 'Program Head',
        LIBRARY_DIRECTOR: 'Director of Libraries',
        INDUSTRY_CONSULTANT: 'Industry Consultant',
        DEAN: 'Dean',
        VPAA: 'VPAA'
    };
    if (map[rawRole]) return map[rawRole];
    return String(rawRole || 'Approver')
        .toLowerCase()
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

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
              AND c.commenter_role != 'INDUSTRY_CONSULTANT'
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
// Supports multi-select subtopic targets, resolves parent Topic title + Subtopic title(s),
// and enriches comments with stakeholder name, role label, and return grouping metadata.
exports.getCommentsByTarget = async (req, res) => {
    const { iloId, commentFor } = req.params;
    const weekId = Number(iloId);

    try {
        const [rows] = await sequelize.query(`
            SELECT 
                c.comment_id,
                c.co_assign_id,
                c.stakeholder_id,
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
            WHERE c.week_id = ? AND c.comment_for = ? AND c.commenter_role != 'INDUSTRY_CONSULTANT'
            ORDER BY c.createdAt ASC, c.comment_id ASC, ct.comment_target_id ASC
        `, {
            replacements: [weekId, commentFor]
        });

        // Build Stakeholder Lookup Maps (by stakeholder_id and by role)
        const userById = {};
        const userByRole = {};

        try {
            if (UserAccount) {
                const accounts = await UserAccount.findAll({
                    include: [
                        Faculty ? { model: Faculty, as: 'faculty', required: false } : null,
                        IndustryConsultant ? { model: IndustryConsultant, as: 'consultant', required: false } : null
                    ].filter(Boolean)
                });

                for (const acc of accounts) {
                    const fullName = acc.full_name || acc.faculty?.name || acc.consultant?.name;
                    const idKey = String(acc.id);
                    userById[idKey] = {
                        id: idKey,
                        name: fullName,
                        activeRole: acc.active_role
                    };

                    const rolesList = Array.isArray(acc.roles) ? acc.roles : [];
                    if ((acc.active_role === 'Instructor' || rolesList.includes('Instructor')) && !userByRole['INSTRUCTOR']) {
                        userByRole['INSTRUCTOR'] = fullName;
                    }
                    if ((acc.active_role === 'Program Head' || rolesList.includes('Program Head')) && !userByRole['PROGRAM_HEAD']) {
                        userByRole['PROGRAM_HEAD'] = fullName;
                    }
                    if ((acc.active_role === 'Director of Libraries' || rolesList.includes('Director of Libraries')) && !userByRole['LIBRARY_DIRECTOR']) {
                        userByRole['LIBRARY_DIRECTOR'] = fullName;
                    }
                    if ((acc.active_role === 'Industry Consultant' || rolesList.includes('Industry Consultant')) && !userByRole['INDUSTRY_CONSULTANT']) {
                        userByRole['INDUSTRY_CONSULTANT'] = fullName;
                    }
                    if ((acc.active_role === 'Dean' || rolesList.includes('Dean')) && !userByRole['DEAN']) {
                        userByRole['DEAN'] = fullName;
                    }
                    if ((acc.active_role === 'VPAA' || rolesList.includes('VPAA')) && !userByRole['VPAA']) {
                        userByRole['VPAA'] = fullName;
                    }
                }
            }
        } catch (userLookupErr) {
            console.warn('Unable to load user_accounts for comment enrichment:', userLookupErr.message);
        }

        const resolveCommenterName = (stakeholderId, rawRole) => {
            if (stakeholderId && userById[String(stakeholderId)]?.name) {
                return userById[String(stakeholderId)].name;
            }
            if (rawRole && userByRole[rawRole]) {
                return userByRole[rawRole];
            }
            return formatRoleLabel(rawRole);
        };

        // Load RETURNED workflow logs for any co_assign_id present in rows
        const assignIds = [...new Set(rows.map(r => r.co_assign_id).filter(Boolean))];
        const returnLogsByAssign = {};

        if (assignIds.length > 0) {
            try {
                const [retLogs] = await sequelize.query(`
                    SELECT log_id, co_assign_id, stakeholder_id, actor_role, action_type, createdAt
                    FROM AssignmentWorkflowLogs
                    WHERE co_assign_id IN (?) AND action_type = 'RETURNED'
                    ORDER BY createdAt ASC, log_id ASC
                `, {
                    replacements: [assignIds]
                });

                for (const log of retLogs) {
                    const aid = Number(log.co_assign_id);
                    if (!returnLogsByAssign[aid]) returnLogsByAssign[aid] = [];
                    const returnNumber = returnLogsByAssign[aid].length + 1;
                    returnLogsByAssign[aid].push({
                        log_id: log.log_id,
                        return_number: returnNumber,
                        return_date: log.createdAt,
                        stakeholder_id: log.stakeholder_id,
                        actor_role: log.actor_role,
                        actor_role_label: formatRoleLabel(log.actor_role),
                        actor_name: resolveCommenterName(log.stakeholder_id, log.actor_role)
                    });
                }
            } catch (logErr) {
                console.warn('Unable to load AssignmentWorkflowLogs for return grouping:', logErr.message);
            }
        }

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
                const aid = Number(row.co_assign_id);
                const assignReturns = returnLogsByAssign[aid] || [];

                // Match comment to its corresponding RETURNED workflow log
                let matchedReturn = null;
                const roleMatches = assignReturns.filter(r => r.actor_role === row.commenter_role);
                if (roleMatches.length === 1) {
                    matchedReturn = roleMatches[0];
                } else if (roleMatches.length > 1) {
                    const commentTime = new Date(row.createdAt).getTime();
                    matchedReturn = roleMatches.reduce((best, curr) => {
                        const bestDiff = Math.abs(new Date(best.return_date).getTime() - commentTime);
                        const currDiff = Math.abs(new Date(curr.return_date).getTime() - commentTime);
                        return currDiff < bestDiff ? curr : best;
                    }, roleMatches[0]);
                } else if (assignReturns.length > 0) {
                    const commentTime = new Date(row.createdAt).getTime();
                    matchedReturn = assignReturns.reduce((best, curr) => {
                        const bestDiff = Math.abs(new Date(best.return_date).getTime() - commentTime);
                        const currDiff = Math.abs(new Date(curr.return_date).getTime() - commentTime);
                        return currDiff < bestDiff ? curr : best;
                    }, assignReturns[0]);
                }

                const effectiveStakeholderId = row.stakeholder_id || matchedReturn?.stakeholder_id || null;
                const commenterName = resolveCommenterName(effectiveStakeholderId, row.commenter_role);
                const commenterRoleLabel = formatRoleLabel(row.commenter_role);
                const returnNumber = matchedReturn ? matchedReturn.return_number : 1;
                const returnDate = matchedReturn ? matchedReturn.return_date : row.createdAt;

                commentsMap.set(cid, {
                    comment_id: cid,
                    co_assign_id: row.co_assign_id,
                    stakeholder_id: effectiveStakeholderId,
                    commenter_name: commenterName,
                    commenter_role: row.commenter_role,
                    commenter_role_label: commenterRoleLabel,
                    return_number: returnNumber,
                    return_date: returnDate,
                    total_returns: assignReturns.length || 1,
                    available_returns: assignReturns,
                    message: row.message,
                    resolved_status: row.resolved_status,
                    resolved_date: row.resolved_date,
                    week_id: row.week_id,
                    ilo_id: row.ilo_id,
                    comment_for: row.comment_for,
                    createdAt: matchedReturn ? matchedReturn.return_date : row.createdAt,
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
        const finalComments = Array.from(commentsMap.values())
            .map(c => {
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
            })
            .sort((a, b) => {
                if ((a.return_number || 1) !== (b.return_number || 1)) {
                    return (a.return_number || 1) - (b.return_number || 1);
                }
                return a.comment_id - b.comment_id;
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


// 4. Fetch suggestions submitted by Industry Consultant for a given course offering
exports.getIndustrySuggestions = async (req, res) => {
    const { pcId } = req.params;

    try {
        const [rows] = await sequelize.query(`
            SELECT 
                c.comment_id,
                c.co_assign_id,
                c.stakeholder_id,
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
                                st.title AS subtopic_title,
                t.title AS topic_title,
                tla.tla_name,
                r.title AS ref_title
            FROM Comments c
            JOIN CourseOfferingAssignments coa ON c.co_assign_id = coa.co_assign_id
            LEFT JOIN CommentTargets ct ON c.comment_id = ct.comment_id
            LEFT JOIN Weeks w ON c.week_id = w.week_id
            LEFT JOIN Subtopics st ON c.comment_for = 'topics' AND st.subtopic_id = ct.target_id
            LEFT JOIN Topics t ON st.topic_id = t.topic_id
            LEFT JOIN TeachingAndLearningActivities tla ON c.comment_for = 'tlas' AND tla.tla_id = ct.target_id
            LEFT JOIN WeeklyReferences wr ON c.comment_for = 'references' AND wr.weekly_reference_id = ct.target_id
            LEFT JOIN \`References\` r ON wr.reference_id = r.reference_id
            WHERE coa.pc_offering_id = ? AND c.commenter_role = 'INDUSTRY_CONSULTANT'
            ORDER BY c.createdAt ASC, c.comment_id ASC
        `, {
            replacements: [pcId]
        });

        let consultantName = 'Roberto Cruz';
        try {
            if (UserAccount) {
                const acc = await UserAccount.findOne({
                    where: { active_role: 'Industry Consultant' },
                    include: [IndustryConsultant ? { model: IndustryConsultant, as: 'consultant', required: false } : null].filter(Boolean)
                });
                if (acc) {
                    consultantName = acc.full_name || acc.consultant?.name || consultantName;
                }
            }
        } catch (e) {
            // fallback
        }

        const suggestions = rows.map(r => {
            const targetTitle = r.subtopic_title || r.topic_title || r.tla_name || r.ref_title || 'General Document';
            return {
                id: r.comment_id,
                message: r.message,
                commenterName: consultantName,
                commenterRole: 'Industry Consultant',
                targetType: r.comment_for ? r.comment_for.toUpperCase() : 'GENERAL',
                targetTitle: targetTitle,
                weekId: r.week_id,
                date: r.createdAt
            };
        });

        res.json({ suggestions });
    } catch (err) {
        console.error('Error fetching industry suggestions:', err);
        res.status(500).json({ error: 'Database error fetching suggestions.' });
    }
};
