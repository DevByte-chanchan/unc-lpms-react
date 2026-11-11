const {
    Topic,
    Subtopic,
    Week,
    sequelize,
    IntendedLearningOutcome,
    CourseOutcome,
    ProgramCourseOffering,
    Course
} = require('../models');
const { Op } = require('sequelize');

function parseIsOrientation(val) {
    if (typeof val === 'boolean') return val;
    if (val === 1 || val === '1') return true;
    if (typeof val === 'string') {
        const lower = val.trim().toLowerCase();
        return lower === 'true' || lower === 'yes' || lower === 'orientation';
    }
    return false;
}

// Helper: Resolve a Week record and its parent CourseOutcome from a weekId (or fallback coId/iloId)
async function resolveWeekRecord(rawId) {
    const id = Number(rawId);
    if (!id) return null;

    let week = await Week.findByPk(id);
    if (week) return week;

    // Fallback: if an ilo_id was passed, find its CourseOutcome's first week
    const ilo = await IntendedLearningOutcome.findByPk(id);
    if (ilo) {
        week = await Week.findOne({
            where: { co_id: ilo.co_id },
            order: [['week_id', 'ASC']]
        });
        if (week) return week;
    }

    // Fallback: if a co_id was passed, find its first week
    week = await Week.findOne({
        where: { co_id: id },
        order: [['week_id', 'ASC']]
    });
    return week;
}

// Helper: Calculate weekly contact hours from Course credit & contact_hrs
function computeWeeklyContactHoursFromCourse(course) {
    let lecCredits = 0;
    let labCredits = 0;
    if (course && course.credit) {
        const lecMatch = String(course.credit).match(/(\d+)\s*LEC/i);
        const labMatch = String(course.credit).match(/(\d+)\s*LAB/i);
        if (lecMatch) lecCredits = parseInt(lecMatch[1], 10);
        if (labMatch) labCredits = parseInt(labMatch[1], 10);
    }
    if (lecCredits === 0 && labCredits === 0) {
        lecCredits = 2;
        labCredits = 1;
    }

    let lecContactHours = lecCredits * 1;
    let labContactHours = labCredits * 3;
    if (course && course.contact_hrs) {
        const lecHrsMatch = String(course.contact_hrs).match(/(\d+)\s*Hrs?\s*Lec/i);
        const labHrsMatch = String(course.contact_hrs).match(/(\d+)\s*Hrs?\s*Lab/i);
        if (lecHrsMatch) lecContactHours = parseInt(lecHrsMatch[1], 10);
        if (labHrsMatch) labContactHours = parseInt(labHrsMatch[1], 10);
    }

    const totalWeeklyHours = (lecContactHours + labContactHours) || 5;
    const orientationHours = (lecContactHours > 0 && lecContactHours < totalWeeklyHours)
        ? lecContactHours
        : Math.min(2, Math.max(1, totalWeeklyHours - 1));

    return {
        lecCredits,
        labCredits,
        lecContactHours,
        labContactHours,
        totalWeeklyHours,
        orientationHours
    };
}

// GET /api/topics/week-context/:weekId
// Returns the Course Outcome metadata, Course Details (description, credits, contact_hrs, calculated weekly hours),
// ILOs, all Course Outcomes for switching, unresolved comment counts per week, and all Weeks
async function getWeekContext(req, res) {
    try {
        const rawId = req.params.weekId || req.query.weekId || req.query.iloId;
        const isOrientation = parseIsOrientation(req.query.isOrientation ?? req.query.orientation);

        const week = await resolveWeekRecord(rawId);
        if (!week) {
            return res.status(404).json({ message: 'Week not found' });
        }

        const currentCo = await CourseOutcome.findByPk(week.co_id, {
            include: [{
                model: ProgramCourseOffering,
                include: [{
                    model: Course,
                    attributes: ['course_id', 'course_no', 'course_title', 'credit', 'contact_hrs']
                }]
            }]
        });
        if (!currentCo) {
            return res.status(404).json({ message: 'Course Outcome not found' });
        }

        const pco = currentCo.ProgramCourseOffering;
        const course = pco?.Course;
        const courseDescription = (pco?.course_description || pco?.description || '').replace(/\s+/g, ' ').trim();
        const courseTitle = course?.course_title || '';
        const courseNo = course?.course_no || '';
        const courseCredit = course?.credit || '';
        const courseContactHrs = course?.contact_hrs || '';

        const {
            lecContactHours,
            labContactHours,
            totalWeeklyHours,
            orientationHours
        } = computeWeeklyContactHoursFromCourse(course);

        // Fetch all Course Outcomes for this offering to determine CO number, ILOs, and global week numbers
        const allCos = await CourseOutcome.findAll({
            where: { pc_offering_id: currentCo.pc_offering_id },
            order: [['co_id', 'ASC']]
        });
        const allCoIds = allCos.map(c => c.co_id);

        const [allWeeks, allIlos] = await Promise.all([
            Week.findAll({
                where: { co_id: allCoIds },
                order: [['co_id', 'ASC'], ['week_id', 'ASC']]
            }),
            IntendedLearningOutcome.findAll({
                where: { co_id: allCoIds },
                order: [['co_id', 'ASC'], ['ilo_id', 'ASC']]
            })
        ]);

        const allWeekIds = allWeeks.map(w => w.week_id);

        // Fetch unresolved comment counts grouped by week_id and comment_for
        const commentCountsByWeek = {};
        if (allWeekIds.length > 0) {
            try {
                const [commentRows] = await sequelize.query(`
                    SELECT
                        c.week_id,
                        c.comment_for,
                        COUNT(DISTINCT c.comment_id) AS unresolved_count
                    FROM Comments c
                    WHERE c.week_id IN (:weekIds)
                      AND c.resolved_status = 0
                    GROUP BY c.week_id, c.comment_for
                `, {
                    replacements: { weekIds: allWeekIds }
                });

                for (const row of commentRows) {
                    const wid = Number(row.week_id);
                    const type = row.comment_for;
                    const count = Number(row.unresolved_count) || 0;
                    if (!commentCountsByWeek[wid]) {
                        commentCountsByWeek[wid] = { topics: 0, tlas: 0, references: 0, total: 0 };
                    }
                    if (type === 'topics' || type === 'tlas' || type === 'references') {
                        commentCountsByWeek[wid][type] = count;
                        commentCountsByWeek[wid].total += count;
                    }
                }
            } catch (commentErr) {
                console.warn('Could not load commentCountsByWeek in getWeekContext:', commentErr.message);
            }
        }

        const coIndex = allCos.findIndex(c => c.co_id === currentCo.co_id);
        const coNumber = isOrientation ? 0 : (coIndex >= 0 ? coIndex + 1 : 1);

        // Build structured weeks and ILOs per Course Outcome matching 18-week academic term:
        // CO 1: Weeks 1-4 (Week 1 shares Course Orientation)
        // CO 2: Weeks 5-8
        // Week 9: Midterm Exam (buffer week)
        // CO 3: Weeks 10-13
        // CO 4: Weeks 14-17
        // Week 18: Final Exam (buffer week)
        let currentWeekCounter = 1;
        const weeksByCo = {};
        for (let cIdx = 0; cIdx < allCos.length; cIdx++) {
            const co = allCos[cIdx];
            const cid = Number(co.co_id);
            weeksByCo[cid] = [];

            // After CO 2 (or when week counter reaches 9), skip Week 9 because it is dedicated to Midterm Exam
            if (cIdx === 2 || currentWeekCounter === 9) {
                if (currentWeekCounter <= 9) currentWeekCounter = 10;
            }

            const coWeeksList = allWeeks.filter(w => Number(w.co_id) === cid);
            for (let wIdx = 0; wIdx < coWeeksList.length; wIdx++) {
                const w = coWeeksList[wIdx];
                const seqWeekNumber = currentWeekCounter++;
                const rawWeekHours = Number(w.hours) || totalWeeklyHours;
                const cNum = cIdx + 1;

                const effectiveHours = (cNum === 1 && wIdx === 0)
                    ? Math.max(1, rawWeekHours - orientationHours)
                    : rawWeekHours;

                const weekComments = commentCountsByWeek[Number(w.week_id)] || { topics: 0, tlas: 0, references: 0, total: 0 };

                weeksByCo[cid].push({
                    week_id: w.week_id,
                    co_id: w.co_id,
                    weekNumber: seqWeekNumber,
                    weekIndexInCo: wIdx + 1,
                    globalWeekNumber: seqWeekNumber,
                    hours: effectiveHours,
                    unresolvedComments: weekComments
                });
            }
        }

        const ilosByCo = {};
        const orientationIlos = [];
        for (const ilo of allIlos) {
            const cid = Number(ilo.co_id);
            const cleanIlo = {
                ilo_id: ilo.ilo_id,
                co_id: ilo.co_id,
                description: (ilo.description || '').replace(/\s+/g, ' ').trim(),
                assessment_tool: ilo.assessment_tool || '',
                is_orientation: Boolean(ilo.is_orientation)
            };
            if (cleanIlo.is_orientation) {
                orientationIlos.push(cleanIlo);
            } else {
                if (!ilosByCo[cid]) ilosByCo[cid] = [];
                ilosByCo[cid].push(cleanIlo);
            }
        }

        const orientationDescription = 'Introduce students to the University and College Vision, Mission, and Objectives (VMO), course expectations, grading system, and ethical AI guidelines.';
        const firstCo = allCos[0] || currentCo;
        const firstCoId = Number(firstCo.co_id);
        const firstCoWeeks = weeksByCo[firstCoId] || [];
        const orientationWeeks = firstCoWeeks.length > 0
            ? [{
                ...firstCoWeeks[0],
                weekNumber: 1,
                globalWeekNumber: 1,
                hours: orientationHours
            }]
            : [];

        const orientationOutcomeItem = {
            co_id: firstCoId,
            coNumber: 0,
            isOrientation: true,
            coDescription: orientationDescription,
            ilos: orientationIlos,
            weeks: orientationWeeks,
            firstWeekId: orientationWeeks.length > 0 ? orientationWeeks[0].week_id : null,
            unresolvedTotal: orientationWeeks.reduce((sum, w) => sum + (w.unresolvedComments?.total || 0), 0)
        };

        const regularCourseOutcomes = allCos.map((c, idx) => {
            const cid = Number(c.co_id);
            const cWeeks = weeksByCo[cid] || [];
            const cIlos = ilosByCo[cid] || [];
            const totalUnresolved = cWeeks.reduce((sum, w) => sum + (w.unresolvedComments?.total || 0), 0);
            return {
                co_id: cid,
                coNumber: idx + 1,
                isOrientation: false,
                coDescription: (c.co_description || '').replace(/^CO\s*\d+\s*:\s*/i, '').trim(),
                ilos: cIlos,
                weeks: cWeeks,
                firstWeekId: cWeeks.length > 0 ? cWeeks[0].week_id : null,
                unresolvedTotal: totalUnresolved
            };
        });

        const courseOutcomes = [orientationOutcomeItem, ...regularCourseOutcomes];

        const coWeeks = weeksByCo[Number(currentCo.co_id)] || [];
        const currentCoIlos = isOrientation
            ? orientationIlos
            : (ilosByCo[Number(currentCo.co_id)] || []);

        // Course Orientation form contains ONLY Week 1, whereas Course Outcome 1 form contains all weeks (Weeks 1-4)
        const returnedWeeks = isOrientation ? orientationWeeks : coWeeks;
        const activeWeekId = isOrientation && returnedWeeks.length > 0
            ? returnedWeeks[0].week_id
            : week.week_id;

        return res.json({
            activeWeekId,
            isOrientation,
            co_id: currentCo.co_id,
            pc_offering_id: currentCo.pc_offering_id,
            revision_number: currentCo.ProgramCourseOffering?.revision_number || 1,
            courseNo,
            courseTitle,
            courseDescription,
            courseCredit,
            courseContactHrs,
            lecContactHours,
            labContactHours,
            totalWeeklyHours,
            coNumber,
            coDescription: isOrientation
                ? orientationDescription
                : (currentCo.co_description || '').replace(/^CO\s*\d+\s*:\s*/i, '').trim(),
            ilos: currentCoIlos,
            weeks: returnedWeeks,
            courseOutcomes,
            commentCountsByWeek
        });
    } catch (err) {
        console.error('getWeekContext error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Fetch topics that are EITHER unassigned OR assigned to the current (weekId, isOrientation) context
async function getAvailableTopics(req, res) {
    try {
        const rawId = req.query.weekId || req.query.iloId;
        const isOrientation = parseIsOrientation(req.query.isOrientation ?? req.query.orientation);
        const week = await resolveWeekRecord(rawId);
        if (!week) return res.status(400).json({ message: 'Valid weekId is required' });
        const weekId = week.week_id;

        // Find all subtopics in the database to see which topics are assigned to which (week_id, is_orientation) context
        const allSubtopics = await Subtopic.findAll({
            attributes: ['subtopic_id', 'week_id', 'topic_id', 'title', 'sequence_order', 'is_orientation'],
            order: [['sequence_order', 'ASC'], ['subtopic_id', 'ASC']],
            raw: true
        });

        const topicsInCurrentContext = new Set();
        const topicsInOtherContexts = new Set();
        const subtopicsByTopicForCurrentContext = {};
        const subtopicsByTopicDefault = {};

        for (const sub of allSubtopics) {
            const tid = Number(sub.topic_id);
            const subIsOrientation = Boolean(sub.is_orientation);

            if (Number(sub.week_id) === Number(weekId) && subIsOrientation === isOrientation) {
                topicsInCurrentContext.add(tid);
                if (!subtopicsByTopicForCurrentContext[tid]) subtopicsByTopicForCurrentContext[tid] = [];
                subtopicsByTopicForCurrentContext[tid].push({
                    subtopic_id: sub.subtopic_id,
                    title: sub.title,
                    sequence_order: sub.sequence_order
                });
            } else {
                topicsInOtherContexts.add(tid);
            }

            if (!subtopicsByTopicDefault[tid]) subtopicsByTopicDefault[tid] = [];
            subtopicsByTopicDefault[tid].push({
                subtopic_id: sub.subtopic_id,
                title: sub.title,
                sequence_order: sub.sequence_order
            });
        }

        // Exclude topics that are already used in other weeks or the other orientation context
        const excludedTopicIds = [...topicsInOtherContexts].filter(tid => !topicsInCurrentContext.has(tid));

        const topics = await Topic.findAll({
            where: excludedTopicIds.length > 0
                ? { topic_id: { [Op.notIn]: excludedTopicIds } }
                : {},
            order: [['title', 'ASC']],
            raw: true
        });

        const result = topics.map(t => ({
            topic_id: t.topic_id,
            title: t.title,
            subtopics: subtopicsByTopicForCurrentContext[t.topic_id] || subtopicsByTopicDefault[t.topic_id] || []
        }));

        return res.json(result);
    } catch (err) {
        console.error('getAvailableTopics error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Fetch currently assigned topics and their subtopics for a specific Week & Orientation context
async function getAssignedTopics(req, res) {
    try {
        const rawId = req.params.iloId || req.params.weekId;
        const isOrientation = parseIsOrientation(req.query.isOrientation ?? req.query.orientation);
        const week = await resolveWeekRecord(rawId);
        if (!week) return res.status(400).json({ message: 'Valid weekId is required' });
        const weekId = week.week_id;

        const subtopics = await Subtopic.findAll({
            where: { week_id: weekId, is_orientation: isOrientation },
            include: [{
                model: Topic,
                as: 'topic',
                attributes: ['topic_id', 'title']
            }],
            order: [['subtopic_id', 'ASC'], ['sequence_order', 'ASC']]
        });

        const topicIds = [...new Set(subtopics.map(s => Number(s.topic_id)).filter(Boolean))];

        // Check if any of these topics also appeared in an earlier week (making it a continued topic)
        let continuedTopicIds = new Set();
        if (topicIds.length > 0 && !isOrientation) {
            const earlierSubtopics = await Subtopic.findAll({
                where: {
                    topic_id: { [Op.in]: topicIds },
                    week_id: { [Op.lt]: weekId },
                    is_orientation: false
                },
                attributes: ['topic_id'],
                raw: true
            });
            continuedTopicIds = new Set(earlierSubtopics.map(s => Number(s.topic_id)));
        }

        // Group subtopics by parent topic in order of appearance
        const topicsMap = new Map();
        for (const s of subtopics) {
            const topicObj = s.topic;
            if (!topicObj) continue;
            const tid = Number(topicObj.topic_id);

            if (!topicsMap.has(tid)) {
                topicsMap.set(tid, {
                    topic_id: tid,
                    title: topicObj.title,
                    isContinuation: continuedTopicIds.has(tid),
                    subtopics: []
                });
            }

            topicsMap.get(tid).subtopics.push({
                subtopic_id: s.subtopic_id,
                week_id: s.week_id,
                topic_id: tid,
                title: s.title,
                sequence_order: s.sequence_order,
                is_orientation: Boolean(s.is_orientation)
            });
        }

        const assigned = Array.from(topicsMap.values());
        // Sort subtopics within each topic by sequence_order
        assigned.forEach(t => {
            t.subtopics.sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0));
        });

        return res.json(assigned);
    } catch (err) {
        console.error('getAssignedTopics error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Master sync function: Creates custom topics, updates edits, and manages weekly Subtopic assignments
// Preserves existing subtopic_id values so CommentTargets referencing subtopic_id remain intact!
async function assignTopicsToILO(req, res) {
    const t = await sequelize.transaction();
    try {
        const rawWeekId = req.body.week_id || req.body.ilo_id;
        const topics = req.body.topics;
        const isOrientation = parseIsOrientation(req.body.is_orientation ?? req.body.isOrientation ?? req.query.isOrientation);

        if (!rawWeekId || !Array.isArray(topics)) {
            await t.rollback();
            return res.status(400).json({ message: 'week_id and topics array are required' });
        }

        const week = await resolveWeekRecord(rawWeekId);
        if (!week) {
            await t.rollback();
            return res.status(404).json({ message: 'Week not found' });
        }
        const week_id = week.week_id;

        // 1. Fetch existing subtopics for this (week_id, is_orientation) context so we can preserve subtopic_ids
        const existingSubtopics = await Subtopic.findAll({
            where: { week_id, is_orientation: isOrientation },
            order: [['subtopic_id', 'ASC']],
            transaction: t,
            raw: true
        });
        const existingById = new Map(existingSubtopics.map(s => [Number(s.subtopic_id), s]));
        const usedExistingIds = new Set();

        const finalTopicIds = [];
        const desiredSubtopics = [];

        // 2. Process each topic and collect desired subtopic entries
        for (const topicData of topics) {
            let currentTopicId = topicData.topic_id ? Number(topicData.topic_id) : null;
            const cleanTitle = (topicData.title || 'Untitled Topic').trim();

            if (!currentTopicId) {
                if (topicData.isContinuation) {
                    const existingByTitle = await Topic.findOne({
                        where: { title: cleanTitle },
                        transaction: t
                    });
                    if (existingByTitle) {
                        currentTopicId = existingByTitle.topic_id;
                    }
                }

                if (!currentTopicId) {
                    const newTopic = await Topic.create({
                        title: cleanTitle
                    }, { transaction: t });
                    currentTopicId = newTopic.topic_id;
                }
            } else if (!topicData.isContinuation) {
                await Topic.update(
                    { title: cleanTitle },
                    { where: { topic_id: currentTopicId }, transaction: t }
                );
            }

            finalTopicIds.push(currentTopicId);

            const rawSubtopics = Array.isArray(topicData.subtopics) && topicData.subtopics.length > 0
                ? topicData.subtopics
                : [{ title: '', sequence_order: 0 }];

            rawSubtopics.forEach((s, idx) => {
                desiredSubtopics.push({
                    incoming_subtopic_id: s.subtopic_id ? Number(s.subtopic_id) : null,
                    week_id: week_id,
                    topic_id: currentTopicId,
                    title: s.title != null ? String(s.title) : '',
                    sequence_order: s.sequence_order ?? (idx + 1),
                    is_orientation: isOrientation
                });
            });
        }

        // Pass 1: Match by explicit incoming_subtopic_id
        for (const item of desiredSubtopics) {
            if (item.incoming_subtopic_id && existingById.has(item.incoming_subtopic_id) && !usedExistingIds.has(item.incoming_subtopic_id)) {
                item.matched_subtopic_id = item.incoming_subtopic_id;
                usedExistingIds.add(item.incoming_subtopic_id);
            }
        }

        // Pass 2: Match by (topic_id, title) or (topic_id, sequence_order)
        for (const item of desiredSubtopics) {
            if (item.matched_subtopic_id) continue;
            const candidate = existingSubtopics.find(es =>
                !usedExistingIds.has(Number(es.subtopic_id)) &&
                Number(es.topic_id) === Number(item.topic_id) &&
                (es.title === item.title || Number(es.sequence_order) === Number(item.sequence_order))
            );
            if (candidate) {
                item.matched_subtopic_id = Number(candidate.subtopic_id);
                usedExistingIds.add(item.matched_subtopic_id);
            }
        }

        // Pass 3: Reuse any remaining existing subtopic rows in order
        for (const item of desiredSubtopics) {
            if (item.matched_subtopic_id) continue;
            const candidate = existingSubtopics.find(es => !usedExistingIds.has(Number(es.subtopic_id)));
            if (candidate) {
                item.matched_subtopic_id = Number(candidate.subtopic_id);
                usedExistingIds.add(item.matched_subtopic_id);
            }
        }

        // Execute updates and inserts
        const keptSubtopicIds = [];
        for (const item of desiredSubtopics) {
            if (item.matched_subtopic_id) {
                await Subtopic.update({
                    week_id: item.week_id,
                    topic_id: item.topic_id,
                    title: item.title,
                    sequence_order: item.sequence_order,
                    is_orientation: item.is_orientation
                }, {
                    where: { subtopic_id: item.matched_subtopic_id },
                    transaction: t
                });
                keptSubtopicIds.push(item.matched_subtopic_id);
            } else {
                const created = await Subtopic.create({
                    week_id: item.week_id,
                    topic_id: item.topic_id,
                    title: item.title,
                    sequence_order: item.sequence_order,
                    is_orientation: item.is_orientation
                }, { transaction: t });
                keptSubtopicIds.push(Number(created.subtopic_id));
            }
        }

        // Delete any surplus existing subtopics that were removed
        const idsToDelete = existingSubtopics
            .map(es => Number(es.subtopic_id))
            .filter(id => !usedExistingIds.has(id));

        if (idsToDelete.length > 0) {
            await Subtopic.destroy({
                where: { subtopic_id: { [Op.in]: idsToDelete } },
                transaction: t
            });
        }

        await t.commit();
        return res.json({ message: 'Topics successfully assigned to week', assignedCount: finalTopicIds.length });
    } catch (err) {
        await t.rollback();
        console.error('assignTopicsToILO error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

/**
 * Normalizes AI-generated or fallback topics so that:
 * 1. Primary (recommended) topics have subtopic time weights (`minutes`) whose total sum EXACTLY equals `targetWeeklyMinutes` (computed from weekly hours).
 * 2. Alternative topics also have realistic subtopic time weights (`minutes`) and `isAlternative: true`.
 * 3. Subtopics are NOT padded or truncated to 5 — the exact realistic number of subtopics returned by the AI is preserved, and within each row pair (0&1, 2&3, etc.), the cards dynamically align in height on the frontend.
 */
function normalizeSuggestedTopicsWithWeights(rawPrimary = [], rawAlternatives = [], targetWeeklyMinutes = 180) {
    const cleanTopicList = (list, isAlt) => {
        return (Array.isArray(list) ? list : [])
            .filter(t => t && (t.title || t.topic))
            .map((t, idx) => {
                const rawSubs = Array.isArray(t.subtopics) ? t.subtopics : [];
                const subs = rawSubs
                    .map((s, sIdx) => {
                        if (typeof s === 'string') {
                            return {
                                id: `ai-sub-${Date.now()}-${isAlt ? 'alt' : 'rec'}-${idx}-${sIdx}-${Math.random().toString(36).slice(2, 6)}`,
                                title: s.trim(),
                                minutes: 30
                            };
                        }
                        const rawMin = Number(s.minutes || s.weight || s.duration || 30);
                        const roundedMin = Math.max(10, Math.round(rawMin / 5) * 5);
                        return {
                            id: s.id || `ai-sub-${Date.now()}-${isAlt ? 'alt' : 'rec'}-${idx}-${sIdx}-${Math.random().toString(36).slice(2, 6)}`,
                            title: String(s.title || s.name || '').trim(),
                            minutes: roundedMin
                        };
                    })
                    .filter(s => Boolean(s.title));

                return {
                    id: t.id || `ai-topic-${Date.now()}-${isAlt ? 'alt' : 'rec'}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
                    title: String(t.title || t.topic || `Topic ${idx + 1}`).trim(),
                    isAlternative: Boolean(isAlt),
                    checked: !isAlt,
                    subtopics: subs.map(s => ({
                        ...s,
                        checked: !isAlt
                    }))
                };
            })
            .filter(t => t.subtopics.length > 0);
    };

    const primaryTopics = cleanTopicList(rawPrimary, false);
    const alternativeTopics = cleanTopicList(rawAlternatives, true);

    // Calibrate primaryTopics subtopic minutes so their sum equals targetWeeklyMinutes exactly
    const allPrimarySubs = [];
    primaryTopics.forEach(t => {
        t.subtopics.forEach(s => allPrimarySubs.push(s));
    });

    if (allPrimarySubs.length > 0 && targetWeeklyMinutes > 0) {
        const currentSum = allPrimarySubs.reduce((acc, s) => acc + (Number(s.minutes) || 0), 0);
        if (currentSum !== targetWeeklyMinutes) {
            if (currentSum > 0) {
                const scale = targetWeeklyMinutes / currentSum;
                allPrimarySubs.forEach(s => {
                    s.minutes = Math.max(10, Math.round((s.minutes * scale) / 5) * 5);
                });
            } else {
                const evenShare = Math.max(10, Math.floor(targetWeeklyMinutes / allPrimarySubs.length / 5) * 5);
                allPrimarySubs.forEach(s => {
                    s.minutes = evenShare;
                });
            }

            // Distribute any remaining rounding difference in 5-minute increments across subtopics
            let diff = targetWeeklyMinutes - allPrimarySubs.reduce((acc, s) => acc + s.minutes, 0);
            let safety = 0;
            while (diff !== 0 && safety < 200) {
                for (let i = 0; i < allPrimarySubs.length && diff !== 0; i++) {
                    const step = diff > 0 ? 5 : -5;
                    if (step < 0 && allPrimarySubs[i].minutes <= 10) continue;
                    allPrimarySubs[i].minutes += step;
                    diff -= step;
                }
                safety++;
            }
        }
    }

    const computeTopicWithTotals = (t) => {
        const totalMinutes = t.subtopics.reduce((acc, s) => acc + (Number(s.minutes) || 0), 0);
        return {
            ...t,
            totalMinutes
        };
    };

    return {
        recommendedTopics: primaryTopics.map(computeTopicWithTotals),
        alternativeTopics: alternativeTopics.map(computeTopicWithTotals)
    };
}

// AI-Driven Topic & Subtopic Suggestions with Time-Weight Feasibility Analysis
async function suggestTopicsWithAI(req, res) {
    try {
        const {
            iloId,
            weekId,
            courseCode,
            courseDescription: bodyCourseDescription,
            coNumber: bodyCoNumber,
            coDescription: bodyCoDescription,
            weekNumber: bodyWeekNumber,
            weeklyHours: bodyWeeklyHours,
            isOrientation: bodyIsOrientation,
            selectedIlos = [],
            previousWeeksTopics = [],
            currentTopics = [],
            alreadySuggested = [],
            useSample = false
        } = req.body;

        const targetId = weekId || iloId;
        const isOrientation = parseIsOrientation(bodyIsOrientation);

        // 1. Fetch academic context from DB as fallback/enrichment for frontend payload
        let dbCourseDescription = '';
        let dbCoDescription = '';
        let dbCourseTitle = '';
        let dbCourseNo = courseCode || '';
        let dbCredit = '';
        let dbContactHrs = '';
        let dbCalculatedHours = 5;
        let dbCoIlos = [];

        if (targetId) {
            try {
                const week = await resolveWeekRecord(targetId);
                if (week && week.co_id) {
                    const co = await CourseOutcome.findByPk(week.co_id, {
                        include: [{
                            model: ProgramCourseOffering,
                            include: [{ model: Course }]
                        }]
                    });
                    if (co) {
                        dbCoDescription = (co.co_description || '').replace(/\s+/g, ' ').trim();
                        if (co.ProgramCourseOffering) {
                            dbCourseDescription = (co.ProgramCourseOffering.course_description || co.ProgramCourseOffering.description || '').replace(/\s+/g, ' ').trim();
                            if (co.ProgramCourseOffering.Course) {
                                const c = co.ProgramCourseOffering.Course;
                                dbCourseNo = c.course_no || dbCourseNo;
                                dbCourseTitle = c.course_title || '';
                                dbCredit = c.credit || '';
                                dbContactHrs = c.contact_hrs || '';
                                const hrsInfo = computeWeeklyContactHoursFromCourse(c);
                                dbCalculatedHours = isOrientation
                                    ? hrsInfo.orientationHours
                                    : (Number(week.hours) || hrsInfo.totalWeeklyHours);
                            }
                        }
                        const coIlos = await IntendedLearningOutcome.findAll({
                            where: { co_id: co.co_id, is_orientation: isOrientation },
                            order: [['ilo_id', 'ASC']]
                        });
                        dbCoIlos = coIlos.map(i => (i.description || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
                    }
                }
            } catch (dbErr) {
                console.warn('Could not query full context from DB:', dbErr.message);
            }
        }

        const effectiveCourseDescription = (bodyCourseDescription || dbCourseDescription || '').trim();
        const effectiveCoDescription = (bodyCoDescription || dbCoDescription || '').trim();
        const effectiveWeekNumber = Number(bodyWeekNumber) || 1;
        const effectiveWeeklyHours = Number(bodyWeeklyHours) > 0 ? Number(bodyWeeklyHours) : (dbCalculatedHours > 0 ? dbCalculatedHours : 3);
        const targetWeeklyMinutes = Math.round(effectiveWeeklyHours * 60);

        const selectedIloDescriptions = Array.isArray(selectedIlos) && selectedIlos.length > 0
            ? selectedIlos.map(i => (typeof i === 'string' ? i : (i.description || ''))).map(s => s.trim()).filter(Boolean)
            : dbCoIlos;

        // Format previous weeks' topics passed directly from frontend state (only for Week > 1 of the CO)
        const formattedPrevWeeks = (effectiveWeekNumber > 1 && Array.isArray(previousWeeksTopics))
            ? previousWeeksTopics
                .filter(pw => Number(pw.weekNumber) < effectiveWeekNumber && Array.isArray(pw.topics) && pw.topics.length > 0)
                .sort((a, b) => Number(a.weekNumber) - Number(b.weekNumber))
            : [];

        const contextInfo = {
            courseNo: dbCourseNo,
            courseTitle: dbCourseTitle,
            courseDescription: effectiveCourseDescription,
            coNumber: bodyCoNumber ?? (isOrientation ? 0 : 1),
            coDescription: effectiveCoDescription,
            weekNumber: effectiveWeekNumber,
            weeklyHours: effectiveWeeklyHours,
            targetWeeklyMinutes,
            credit: dbCredit,
            contactHrs: dbContactHrs,
            selectedIlos: selectedIloDescriptions,
            previousWeeksCount: formattedPrevWeeks.length
        };

        const rawApiKey = (process.env.GEMINI_API_KEY || '').trim();
        // Standard Google AI Studio Gemini API keys start with "AIza"
        const hasValidFormatKey = rawApiKey.length > 20 && (rawApiKey.startsWith('AIza') || rawApiKey.startsWith('AQ.'));

        // Build list of topics/subtopics to avoid repeating
        const prevWeekTopicTitles = [];
        const prevWeekSummaryLines = [];
        formattedPrevWeeks.forEach(pw => {
            const topicSummaries = [];
            (pw.topics || []).forEach(t => {
                if (t && t.title) {
                    prevWeekTopicTitles.push(t.title);
                    const subNames = Array.isArray(t.subtopics)
                        ? t.subtopics.map(s => (typeof s === 'string' ? s : s?.title)).filter(Boolean)
                        : [];
                    topicSummaries.push(
                        subNames.length > 0
                            ? `${t.title} (Subtopics: ${subNames.join('; ')})`
                            : t.title
                    );
                }
            });
            if (topicSummaries.length > 0) {
                prevWeekSummaryLines.push(`Week ${pw.weekNumber}: ${topicSummaries.join(' | ')}`);
            }
        });

        const topicsToAvoid = [
            ...currentTopics.map(t => (typeof t === 'string' ? t : t?.title)),
            ...alreadySuggested,
            ...prevWeekTopicTitles
        ].filter(Boolean);

        if (!useSample && hasValidFormatKey) {
            const prompt = `You are an expert university curriculum architect designing sequential weekly topics and subtopics for a course learning plan.

INPUT DATA PROVIDED:
1. Course: ${dbCourseNo || 'N/A'} - ${dbCourseTitle || 'University Course'}
2. Course Description: "${effectiveCourseDescription || 'Tertiary-level computing and professional course.'}"
3. Selected Course Outcome (CO ${contextInfo.coNumber}): "${effectiveCoDescription || 'Core competency and applied mastery.'}"
4. Selected Intended Learning Outcomes (ILOs) expected from these topics:
${selectedIloDescriptions.length > 0 ? selectedIloDescriptions.map((d, i) => `   - ILO ${i + 1}: "${d}"`).join('\n') : '   - General mastery of the Course Outcome.'}
5. Current Week in Course Outcome: Week ${effectiveWeekNumber}
6. Calculated Weekly Teaching Time Budget: ${effectiveWeeklyHours} hours (${targetWeeklyMinutes} minutes total)
${effectiveWeekNumber === 1
    ? '7. First Week Condition: This is Week 1 of this Course Outcome. Introduce foundational concepts aligned with the Course Description, CO Description, and Selected ILOs.'
    : `7. Previous Weeks' Topics & Subtopics (Weeks 1 to ${effectiveWeekNumber - 1}) — Build sequentially upon these without repeating them:\n${prevWeekSummaryLines.length > 0 ? prevWeekSummaryLines.map(l => `   - ${l}`).join('\n') : '   - None recorded yet.'}`
}
${topicsToAvoid.length > 0 ? `\nDO NOT REPEAT THESE EXISTING TOPICS:\n${topicsToAvoid.map(t => `- ${t}`).join('\n')}\n` : ''}
PEDAGOGICAL & TIME-FEASIBILITY INSTRUCTIONS:
- Ask yourself: "Is this number of subtopics realistically teachable within ${effectiveWeeklyHours} hours (${targetWeeklyMinutes} minutes)?"
- Focus on high-quality, teachable subtopics with realistic time weights in minutes (multiples of 5 or 10 minutes, e.g., 20, 25, 30, 35, 40, 45, 60 mins).
- Do NOT force 5 subtopics per topic. Choose the realistic number of subtopics (typically 2 to 4 subtopics per topic) that can genuinely be taught in the allotted time.
- Provide two groups:
  1. "recommendedTopics": 2 primary topics whose subtopics' minutes sum to EXACTLY ${targetWeeklyMinutes} minutes (${effectiveWeeklyHours} hours).
  2. "alternativeTopics": 2 additional alternative topics (each with 2 to 4 realistic subtopics and minute weights) that the instructor can optionally swap in or add.

Return strictly valid JSON matching this schema:
{
  "recommendedTopics": [
    {
      "title": "Topic Title",
      "subtopics": [
        { "title": "Specific Subtopic Title", "minutes": 45 }
      ]
    }
  ],
  "alternativeTopics": [
    {
      "title": "Alternative Topic Title",
      "subtopics": [
        { "title": "Specific Alternative Subtopic Title", "minutes": 40 }
      ]
    }
  ]
}`;

            const models = [
                'gemini-3.5-flash-lite',
                'gemini-3.1-flash-lite',
                'gemini-3.6-flash',
                'gemini-3.5-flash',
                'gemini-3.8-flash'
            ];
            let usedModel = null;
            let data = null;

            for (const model of models) {
                try {
                    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${rawApiKey}`;
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        signal: AbortSignal.timeout(12000),
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }],
                            generationConfig: {
                                responseMimeType: 'application/json',
                                temperature: 0.65
                            }
                        })
                    });

                    if (response.ok) {
                        data = await response.json();
                        usedModel = model;
                        break;
                    } else {
                        console.warn(`[AI Topic Suggest] Model ${model} returned HTTP ${response.status}`);
                    }
                } catch (err) {
                    console.warn(`AI model ${model} attempt failed:`, err.message);
                }
            }

            const parts = data?.candidates?.[0]?.content?.parts || [];
            const textPart = parts.find(p => p.text && !p.thought) || parts.find(p => p.text) || parts[0];
            const rawText = textPart?.text;
            if (rawText) {
                try {
                    const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                    const parsed = JSON.parse(cleaned);
                    const recRaw = Array.isArray(parsed.recommendedTopics)
                        ? parsed.recommendedTopics
                        : (Array.isArray(parsed.topics) ? parsed.topics.slice(0, 2) : []);
                    const altRaw = Array.isArray(parsed.alternativeTopics)
                        ? parsed.alternativeTopics
                        : (Array.isArray(parsed.topics) ? parsed.topics.slice(2, 4) : []);

                    if (recRaw.length > 0) {
                        const { recommendedTopics, alternativeTopics } = normalizeSuggestedTopicsWithWeights(
                            recRaw,
                            altRaw,
                            targetWeeklyMinutes
                        );

                        console.log(`[AI Topic Suggest] Successfully generated fresh topics via ${usedModel}`);
                        return res.json({
                            recommendedTopics,
                            alternativeTopics,
                            topics: [...recommendedTopics, ...alternativeTopics],
                            targetWeeklyMinutes,
                            weeklyHours: effectiveWeeklyHours,
                            context: contextInfo,
                            isSample: false,
                            model: usedModel
                        });
                    }
                } catch (parseErr) {
                    console.warn('Could not parse AI JSON response, falling back to contextual generator:', parseErr.message);
                }
            }
        }

        // Intelligent Contextual Synthesis Engine (used when API key is absent/oauth token or offline)
        const { recommendedTopics, alternativeTopics } = generateContextualWeightedTopics({
            courseNo: dbCourseNo,
            courseTitle: dbCourseTitle,
            courseDescription: effectiveCourseDescription,
            coNumber: contextInfo.coNumber,
            coDescription: effectiveCoDescription,
            selectedIlos: selectedIloDescriptions,
            weekNumber: effectiveWeekNumber,
            weeklyHours: effectiveWeeklyHours,
            targetWeeklyMinutes,
            isOrientation,
            previousWeeksTopics: formattedPrevWeeks,
            topicsToAvoid
        });

        return res.json({
            recommendedTopics,
            alternativeTopics,
            topics: [...recommendedTopics, ...alternativeTopics],
            targetWeeklyMinutes,
            weeklyHours: effectiveWeeklyHours,
            context: contextInfo,
            isSample: false
        });

    } catch (err) {
        console.error('suggestTopicsWithAI error:', err);
        return res.status(500).json({
            error: 'AI_SUGGESTION_FAILED',
            message: err.message || 'Error occurred while generating topic suggestions'
        });
    }
}

/**
 * Generates context-aware, sequential, time-weighted topics and subtopics tailored to:
 * - Course Description
 * - Selected Course Outcome (CO) Description
 * - Selected Intended Learning Outcomes (ILOs)
 * - Week Number & Previous Weeks' Frontend Topics (for sequential progression without repetition)
 * - Calculated Weekly Hours (`targetWeeklyMinutes`), choosing a realistic number of subtopics per topic
 */
function generateContextualWeightedTopics({
    courseTitle = '',
    courseDescription = '',
    coNumber = 1,
    coDescription = '',
    selectedIlos = [],
    weekNumber = 1,
    weeklyHours = 3,
    targetWeeklyMinutes = 180,
    isOrientation = false,
    previousWeeksTopics = [],
    topicsToAvoid = []
}) {
    const avoidSet = new Set(
        topicsToAvoid.map(t => String(t).trim().toLowerCase()).filter(Boolean)
    );
    // Also collect all previous subtopics so we never repeat subtopics from earlier weeks
    const avoidSubtopicSet = new Set();
    (previousWeeksTopics || []).forEach(pw => {
        (pw.topics || []).forEach(t => {
            if (t?.title) avoidSet.add(String(t.title).trim().toLowerCase());
            (t?.subtopics || []).forEach(s => {
                const st = typeof s === 'string' ? s : s?.title;
                if (st) avoidSubtopicSet.add(String(st).trim().toLowerCase());
            });
        });
    });

    const combinedContext = `${courseTitle} ${courseDescription} ${coDescription} ${selectedIlos.join(' ')}`.toLowerCase();
    const isHci = combinedContext.includes('human') || combinedContext.includes('interface') || combinedContext.includes('interaction') || combinedContext.includes('ui') || combinedContext.includes('ux') || combinedContext.includes('usability');
    const isDb = combinedContext.includes('database') || combinedContext.includes('sql') || combinedContext.includes('data model') || combinedContext.includes('normalization');

    // Determine realistic subtopic count based on weekly hours:
    // e.g. 2 hrs (120m) -> 2 topics with 2 subtopics each (4 subtopics total, ~30m each)
    //      3 hrs (180m) -> 2 topics with 3 subtopics each (6 subtopics total, ~30m each)
    //      5 hrs (300m) -> 2 topics with 3-4 subtopics each (7 subtopics total, ~40-45m each)
    const subtopicsPerTopic = weeklyHours <= 2 ? 2 : (weeklyHours <= 3 ? 3 : 4);

    if (isOrientation || Number(coNumber) === 0) {
        const orientPrimary = [
            {
                title: 'University Vision, Mission, and Core Values (VMO) Orientation',
                subtopics: [
                    { title: 'Institutional Vision, Mission, and Program Educational Objectives', minutes: 35 },
                    { title: 'Alignment of College Outcomes with Professional Computing Standards', minutes: 25 },
                    { title: 'Student Responsibilities and Academic Integrity Policies', minutes: 20 }
                ].slice(0, subtopicsPerTopic)
            },
            {
                title: 'Course Framework, Grading System, and Ethical AI Guidelines',
                subtopics: [
                    { title: 'Course Learning Plan Overview, Weekly Milestones, and Deliverables', minutes: 30 },
                    { title: 'Outcome-Based Assessment Rubrics and Grading Breakdown', minutes: 30 },
                    { title: 'Responsible Use of Generative AI and Laboratory Safety Protocols', minutes: 25 }
                ].slice(0, subtopicsPerTopic)
            }
        ];

        const orientAlternatives = [
            {
                title: 'Collaborative Learning Environment & Tooling Setup',
                subtopics: [
                    { title: 'Setting Up Version Control, Design Workspaces, and Communication Channels', minutes: 30 },
                    { title: 'Team Formation and Project Charter Expectations', minutes: 30 }
                ]
            },
            {
                title: 'Academic Success Strategies in Outcome-Based Education (OBE)',
                subtopics: [
                    { title: 'Navigating Portfolio-Based Evidence and Continuous Feedback Cycles', minutes: 30 },
                    { title: 'Peer Review Etiquette and Critique Standards', minutes: 25 }
                ]
            }
        ];

        return normalizeSuggestedTopicsWithWeights(orientPrimary, orientAlternatives, targetWeeklyMinutes);
    }

    // Build ILO-anchored topic banks organized sequentially by week progression (Week 1 -> Week 2 -> Week 3 -> Week 4+)
    let sequentialStages = [];

    if (isHci) {
        sequentialStages = [
            // Stage 1 (Week 1: Foundations & Conceptual Models)
            {
                primary: [
                    {
                        title: 'Foundations of Human-Computer Interaction & Cognitive Models',
                        subtopics: [
                            { title: 'Historical Evolution of Interactive Paradigms and Ubiquitous Computing', minutes: 35 },
                            { title: 'Human Information Processing: Perception, Memory, and Attention Limits', minutes: 35 },
                            { title: 'Norman’s Action Cycle: Gulfs of Execution and Evaluation', minutes: 30 },
                            { title: 'Mapping Mental Models to Digital System Conceptual Models', minutes: 25 }
                        ]
                    },
                    {
                        title: 'Core Interaction Design Principles & Usability Goals',
                        subtopics: [
                            { title: 'Affordances, Signifiers, Constraints, and Conceptual Mapping', minutes: 35 },
                            { title: 'Usability Metrics: Effectiveness, Efficiency, Safety, and Learnability', minutes: 30 },
                            { title: 'Feedback Loops and Visibility of System Status in Modern UIs', minutes: 25 },
                            { title: 'Balancing Aesthetic Minimalism with Functional Discoverability', minutes: 25 }
                        ]
                    }
                ],
                alternatives: [
                    {
                        title: 'Ergonomics, Human Factors, and Multisensory Interaction',
                        subtopics: [
                            { title: 'Fitts’s Law and Hick’s Law in Interactive Target Sizing', minutes: 35 },
                            { title: 'Physical and Cognitive Ergonomics Across Desktop and Mobile Contexts', minutes: 30 },
                            { title: 'Reducing Extraneous Cognitive Load Through Progressive Disclosure', minutes: 25 }
                        ]
                    },
                    {
                        title: 'Interaction Styles & Emerging Interface Modalities',
                        subtopics: [
                            { title: 'Direct Manipulation, Menu Selection, and Command-Based Interfaces', minutes: 30 },
                            { title: 'Conversational UI, Gesture Navigation, and Spatial Computing Trends', minutes: 30 },
                            { title: 'Context-Aware Computing and Adaptive User Experiences', minutes: 25 }
                        ]
                    }
                ]
            },
            // Stage 2 (Week 2: User Research, Task Analysis & Information Architecture)
            {
                primary: [
                    {
                        title: 'User-Centered Research Methodologies & Stakeholder Discovery',
                        subtopics: [
                            { title: 'Planning Contextual Inquiry, Ethnographic Observation, and User Interviews', minutes: 45 },
                            { title: 'Synthesizing Qualitative Insights Using Affinity Diagrams', minutes: 40 },
                            { title: 'Constructing Evidence-Based User Personas and Empathy Maps', minutes: 35 },
                            { title: 'Defining User Problem Statements and Value Propositions', minutes: 30 }
                        ]
                    },
                    {
                        title: 'Hierarchical Task Analysis & Information Architecture',
                        subtopics: [
                            { title: 'Decomposing User Goals with Hierarchical Task Analysis (HTA)', minutes: 40 },
                            { title: 'End-to-End Customer Journey Mapping and Touchpoint Identification', minutes: 40 },
                            { title: 'Card Sorting Techniques, Sitemaps, and Navigation Taxonomies', minutes: 35 },
                            { title: 'Designing Error-Tolerant User Flows and Edge-Case Scenarios', minutes: 35 }
                        ]
                    }
                ],
                alternatives: [
                    {
                        title: 'Quantitative UX Research & Survey Instrument Design',
                        subtopics: [
                            { title: 'Designing Unbiased Questionnaires and Likert-Scale Instruments', minutes: 35 },
                            { title: 'Triangulating Behavioral Analytics with Attitudinal User Data', minutes: 35 },
                            { title: 'Competitive UX Benchmarking and Feature Matrix Evaluation', minutes: 30 }
                        ]
                    },
                    {
                        title: 'Scenario-Based Design & Storyboarding Workflows',
                        subtopics: [
                            { title: 'Writing Context Scenarios and Key-Path Interaction Narratives', minutes: 35 },
                            { title: 'Visual Storyboarding of User Context, Motivation, and Outcome', minutes: 35 },
                            { title: 'Validating Early Assumptions with Stakeholder Walkthroughs', minutes: 25 }
                        ]
                    }
                ]
            },
            // Stage 3 (Week 3: Wireframing, Visual Design Systems & Interactive Prototyping)
            {
                primary: [
                    {
                        title: 'Structural Wireframing & Layout Grid Composition',
                        subtopics: [
                            { title: 'Ideation Sketching and Crazy Eights Rapid Concept Generation', minutes: 40 },
                            { title: 'Low-Fidelity Wireframing: Content Hierarchy and Spatial Grouping', minutes: 40 },
                            { title: 'Responsive Breakpoints, 8-Point Grid Systems, and Fluid Layouts', minutes: 35 },
                            { title: 'Gestalt Principles of Visual Perception in Screen Composition', minutes: 35 }
                        ]
                    },
                    {
                        title: 'Interactive High-Fidelity Prototyping & Design Systems',
                        subtopics: [
                            { title: 'Design Tokens: Typography Scales, Semantic Color Palettes, and Elevation', minutes: 40 },
                            { title: 'Building Reusable Atomic UI Components and Auto-Layout Variants', minutes: 45 },
                            { title: 'Wiring Interactive Screen Transitions, Micro-Interactions, and States', minutes: 35 },
                            { title: 'WCAG 2.1 Accessibility Compliance: Contrast Ratios and Keyboard Focus', minutes: 30 }
                        ]
                    }
                ],
                alternatives: [
                    {
                        title: 'Design System Governance & Developer Handoff Specifications',
                        subtopics: [
                            { title: 'Documenting Component Anatomy, Props, and Usage Guidelines', minutes: 35 },
                            { title: 'Redlining, Asset Export Pipelines, and CSS Token Synchronization', minutes: 35 },
                            { title: 'Cross-Functional Design Critiques and Version Control Workflows', minutes: 30 }
                        ]
                    },
                    {
                        title: 'Inclusive Design & Assistive Technology Compatibility',
                        subtopics: [
                            { title: 'Designing for Screen Readers, ARIA Landmarks, and Semantic Order', minutes: 35 },
                            { title: 'Color-Blindness Simulation and Non-Color Status Indicators', minutes: 30 },
                            { title: 'Motor Accessibility, Touch Target Spacing, and Reduced Motion Modes', minutes: 30 }
                        ]
                    }
                ]
            },
            // Stage 4 (Week 4+: Usability Inspection, Heuristic Evaluation & Empirical Testing)
            {
                primary: [
                    {
                        title: 'Analytical Usability Inspection & Heuristic Evaluation',
                        subtopics: [
                            { title: 'Applying Nielsen’s 10 Usability Heuristics to Interactive Prototypes', minutes: 45 },
                            { title: 'Conducting Structured Cognitive Walkthroughs for Core Tasks', minutes: 40 },
                            { title: 'Assigning Defect Severity Ratings and Prioritizing UX Fixes', minutes: 35 },
                            { title: 'Synthesizing Expert Inspection Findings into Actionable Redesigns', minutes: 30 }
                        ]
                    },
                    {
                        title: 'Empirical Usability Testing & Iterative Refinement',
                        subtopics: [
                            { title: 'Moderated vs. Unmoderated Usability Test Protocol Design', minutes: 40 },
                            { title: 'Facilitating Think-Aloud Sessions and Capturing Behavioral Observations', minutes: 40 },
                            { title: 'Analyzing Task Completion Rates, Time-on-Task, and SUS Scores', minutes: 35 },
                            { title: 'Iterative Prototype Refinement Based on Empirical User Evidence', minutes: 35 }
                        ]
                    }
                ],
                alternatives: [
                    {
                        title: 'Quantitative UX Experimentation & A/B Testing',
                        subtopics: [
                            { title: 'Formulating Conversion and Engagement Hypotheses for UI Variants', minutes: 35 },
                            { title: 'Analyzing Clickstream Heatmaps, Funnel Drop-offs, and Error Rates', minutes: 35 },
                            { title: 'Statistical Confidence and Post-Launch UX Monitoring', minutes: 30 }
                        ]
                    },
                    {
                        title: 'Software Product Pitch & UX Case Study Presentation',
                        subtopics: [
                            { title: 'Structuring an End-to-End UI/UX Design Case Study Portfolio', minutes: 35 },
                            { title: 'Communicating Design Rationale and Usability ROI to Stakeholders', minutes: 35 },
                            { title: 'Post-Implementation Review and Continuous Design Iteration', minutes: 25 }
                        ]
                    }
                ]
            }
        ];
    } else if (isDb) {
        sequentialStages = [
            {
                primary: [
                    {
                        title: 'Relational Database Architecture & Conceptual Modeling',
                        subtopics: [
                            { title: 'Database System Architecture, Schemas, and Data Independence', minutes: 35 },
                            { title: 'Entity-Relationship (ER) Modeling: Entities, Attributes, and Cardinalities', minutes: 40 },
                            { title: 'Enhanced ER (EER) Concepts: Specialization, Generalization, and Aggregation', minutes: 35 },
                            { title: 'Translating Conceptual ER Diagrams into Relational Tables', minutes: 30 }
                        ]
                    },
                    {
                        title: 'Functional Dependencies & Schema Normalization',
                        subtopics: [
                            { title: 'Update Anomalies, Redundancy, and Functional Dependency Rules', minutes: 35 },
                            { title: 'Step-by-Step Normalization: 1NF, 2NF, and 3NF Transformations', minutes: 40 },
                            { title: 'Boyce-Codd Normal Form (BCNF) and Lossless-Join Decomposition', minutes: 35 },
                            { title: 'Strategic Denormalization for Read-Heavy Analytical Workloads', minutes: 30 }
                        ]
                    }
                ],
                alternatives: [
                    {
                        title: 'Relational Algebra & Codd’s Relational Calculus',
                        subtopics: [
                            { title: 'Unary Operations: Selection, Projection, and Rename Semantics', minutes: 30 },
                            { title: 'Set Theory, Relational Joins, and Division Operators', minutes: 35 },
                            { title: 'Equivalence Between Relational Algebra Expressions and SQL Queries', minutes: 30 }
                        ]
                    },
                    {
                        title: 'Data Governance, Integrity Constraints & Domain Modeling',
                        subtopics: [
                            { title: 'Entity Integrity, Referential Integrity, and Cascading Actions', minutes: 30 },
                            { title: 'Check Constraints, Triggers, and Domain Validation Policies', minutes: 30 },
                            { title: 'Enterprise Data Dictionary and Metadata Documentation', minutes: 25 }
                        ]
                    }
                ]
            },
            {
                primary: [
                    {
                        title: 'Structured Query Language (SQL) DDL, DML & Complex Joins',
                        subtopics: [
                            { title: 'Schema Definition (DDL) with Keys, Indexes, and Constraints', minutes: 35 },
                            { title: 'Multi-Table Inner, Outer, Self, and Cross Joins in Practice', minutes: 40 },
                            { title: 'Grouping, Aggregation Functions, and HAVING Clause Filtering', minutes: 35 },
                            { title: 'Correlated Subqueries, Common Table Expressions (CTEs), and Views', minutes: 35 }
                        ]
                    },
                    {
                        title: 'Query Optimization, Indexing & Execution Plans',
                        subtopics: [
                            { title: 'B-Tree, Hash, and Composite Indexing Strategies', minutes: 40 },
                            { title: 'Reading and Interpreting Database Query Execution Plans', minutes: 40 },
                            { title: 'Window Functions and Analytical Ranking Queries', minutes: 35 },
                            { title: 'Stored Procedures, User-Defined Functions, and Triggers', minutes: 30 }
                        ]
                    }
                ],
                alternatives: [
                    {
                        title: 'Transaction Processing & Concurrency Control (ACID)',
                        subtopics: [
                            { title: 'ACID Properties and Transaction State Transitions', minutes: 35 },
                            { title: 'Concurrency Anomalies and SQL Transaction Isolation Levels', minutes: 35 },
                            { title: 'Two-Phase Locking (2PL) and Deadlock Detection/Recovery', minutes: 30 }
                        ]
                    },
                    {
                        title: 'Database Security, Backup & Disaster Recovery',
                        subtopics: [
                            { title: 'Role-Based Access Control (RBAC) and SQL Injection Defense', minutes: 35 },
                            { title: 'Write-Ahead Logging (WAL) and Point-in-Time Recovery', minutes: 30 },
                            { title: 'Data Encryption at Rest and Auditing Compliance', minutes: 30 }
                        ]
                    }
                ]
            }
        ];
    } else {
        sequentialStages = [
            {
                primary: [
                    {
                        title: 'Foundational Concepts & Architectural Principles',
                        subtopics: [
                            { title: 'Core Domain Terminology, Theoretical Models, and System Context', minutes: 35 },
                            { title: 'Modular Decomposition, Separation of Concerns, and Abstraction Layers', minutes: 35 },
                            { title: 'Industry Standards, Quality Attributes, and Design Trade-offs', minutes: 30 },
                            { title: 'Mapping Course Outcome Specifications to Technical Requirements', minutes: 30 }
                        ]
                    },
                    {
                        title: 'Problem Formulation & Structured Analytical Methods',
                        subtopics: [
                            { title: 'Stakeholder Requirement Elicitation and Functional Modeling', minutes: 35 },
                            { title: 'Data Flow Analysis, State Transitions, and Process Specification', minutes: 35 },
                            { title: 'Evaluating Feasibility, Constraints, and Edge-Case Scenarios', minutes: 30 },
                            { title: 'Documenting Technical Specifications and Acceptance Criteria', minutes: 30 }
                        ]
                    }
                ],
                alternatives: [
                    {
                        title: 'Comparative Tooling & Environment Standardization',
                        subtopics: [
                            { title: 'Evaluating Contemporary Frameworks and Toolchain Capabilities', minutes: 30 },
                            { title: 'Configuring Reproducible Development and Testing Environments', minutes: 30 },
                            { title: 'Version Control Branching Strategies and Collaborative Workflows', minutes: 25 }
                        ]
                    },
                    {
                        title: 'Ethics, Professional Standards & Regulatory Compliance',
                        subtopics: [
                            { title: 'Data Privacy, Intellectual Property, and Responsible Engineering', minutes: 30 },
                            { title: 'Accessibility, Sustainability, and Inclusive System Design', minutes: 30 }
                        ]
                    }
                ]
            },
            {
                primary: [
                    {
                        title: 'Applied Design Patterns & Component Implementation',
                        subtopics: [
                            { title: 'Implementing Reusable Modules and Clean Interface Contracts', minutes: 40 },
                            { title: 'State Management, Asynchronous Workflows, and Error Handling', minutes: 40 },
                            { title: 'Integrating Data Persistence and Validation Pipelines', minutes: 35 },
                            { title: 'Refactoring for Readability, Maintainability, and Scalability', minutes: 35 }
                        ]
                    },
                    {
                        title: 'Verification, Quality Assurance & Performance Tuning',
                        subtopics: [
                            { title: 'Unit and Integration Testing Across Critical Execution Paths', minutes: 40 },
                            { title: 'Profiling Bottlenecks, Resource Utilization, and Latency', minutes: 35 },
                            { title: 'Security Hardening, Input Sanitization, and Vulnerability Checks', minutes: 35 },
                            { title: 'Peer Code Review and Continuous Integration Verification', minutes: 30 }
                        ]
                    }
                ],
                alternatives: [
                    {
                        title: 'Deployment Readiness & Observability Practices',
                        subtopics: [
                            { title: 'Structured Logging, Telemetry, and Health Monitoring', minutes: 35 },
                            { title: 'Configuration Management and Release Packaging', minutes: 30 },
                            { title: 'Incident Diagnosis and Post-Mortem Root Cause Analysis', minutes: 30 }
                        ]
                    },
                    {
                        title: 'Technical Documentation & Stakeholder Demonstration',
                        subtopics: [
                            { title: 'Authoring Architecture Decision Records (ADRs) and API Guides', minutes: 35 },
                            { title: 'Demonstrating Working Increments Against Learning Outcomes', minutes: 30 }
                        ]
                    }
                ]
            }
        ];
    }

    // Pick stage corresponding to weekNumber (1-based), cycling or advancing if initial stage topics were already used in previous weeks
    const stageIdx = Math.min(Math.max(0, weekNumber - 1), sequentialStages.length - 1);
    let chosenStage = sequentialStages[stageIdx];

    // Ensure no topic or subtopic duplicates anything from previous weeks
    const allStagesOrdered = [
        chosenStage,
        ...sequentialStages.filter((_, i) => i !== stageIdx)
    ];

    const pickedPrimary = [];
    const pickedAlternatives = [];

    // Tailor topic/subtopic wording subtly with selected ILO focus if specific ILOs were chosen
    const iloFocusKeyword = (() => {
        if (!selectedIlos || selectedIlos.length === 0) return '';
        const joined = selectedIlos.join(' ');
        if (/persona|interview|research|user need/i.test(joined)) return 'User Research & Persona';
        if (/wirefram|prototyp|mockup|layout/i.test(joined)) return 'Wireframing & Prototyping';
        if (/heuristic|usability|evaluat|test/i.test(joined)) return 'Usability & Heuristic';
        if (/concept|theor|principle|model/i.test(joined)) return 'HCI Principles & Conceptual';
        return '';
    })();

    for (const stg of allStagesOrdered) {
        for (const t of stg.primary) {
            if (!avoidSet.has(t.title.toLowerCase()) && pickedPrimary.length < 2) {
                const filteredSubs = t.subtopics
                    .filter(s => !avoidSubtopicSet.has(s.title.toLowerCase()))
                    .slice(0, subtopicsPerTopic);
                if (filteredSubs.length > 0) {
                    pickedPrimary.push({
                        title: t.title,
                        subtopics: filteredSubs
                    });
                    avoidSet.add(t.title.toLowerCase());
                }
            }
        }
        for (const t of stg.alternatives) {
            if (!avoidSet.has(t.title.toLowerCase()) && pickedAlternatives.length < 2) {
                const filteredSubs = t.subtopics
                    .filter(s => !avoidSubtopicSet.has(s.title.toLowerCase()))
                    .slice(0, Math.max(2, subtopicsPerTopic - 1));
                if (filteredSubs.length > 0) {
                    pickedAlternatives.push({
                        title: t.title,
                        subtopics: filteredSubs
                    });
                    avoidSet.add(t.title.toLowerCase());
                }
            }
        }
    }

    // Fallback if all titles were somehow exhausted
    if (pickedPrimary.length === 0) {
        const baseStage = sequentialStages[stageIdx] || sequentialStages[0];
        baseStage.primary.slice(0, 2).forEach((t, idx) => {
            pickedPrimary.push({
                title: `${t.title} (Week ${weekNumber} Deep Dive ${iloFocusKeyword ? `— ${iloFocusKeyword}` : ''})`.trim(),
                subtopics: t.subtopics.slice(0, subtopicsPerTopic)
            });
        });
    }
    if (pickedAlternatives.length === 0) {
        const baseStage = sequentialStages[stageIdx] || sequentialStages[0];
        baseStage.alternatives.slice(0, 2).forEach((t) => {
            pickedAlternatives.push({
                title: `${t.title} (Week ${weekNumber} Option)`,
                subtopics: t.subtopics.slice(0, Math.max(2, subtopicsPerTopic - 1))
            });
        });
    }

    return normalizeSuggestedTopicsWithWeights(pickedPrimary, pickedAlternatives, targetWeeklyMinutes);
}

module.exports = { getWeekContext, getAvailableTopics, getAssignedTopics, assignTopicsToILO, suggestTopicsWithAI };
