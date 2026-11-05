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

// GET /api/topics/week-context/:weekId
// Returns the Course Outcome metadata, ILOs, all Course Outcomes for switching, unresolved comment counts per week, and all Weeks
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
                include: [{ model: Course, attributes: ['course_id', 'course_no', 'credit', 'contact_hrs'] }]
            }]
        });
        if (!currentCo) {
            return res.status(404).json({ message: 'Course Outcome not found' });
        }

        // Determine lecture contact hours for Week 1 Orientation session
        let lecContactHours = 2;
        const course = currentCo.ProgramCourseOffering?.Course;
        if (course) {
            if (course.contact_hrs) {
                const lecHrsMatch = course.contact_hrs.match(/(\d+)\s*Hrs?\s*Lec/i);
                if (lecHrsMatch) lecContactHours = parseInt(lecHrsMatch[1], 10);
            } else if (course.credit) {
                const lecMatch = course.credit.match(/(\d+)\s*LEC/i);
                if (lecMatch) lecContactHours = parseInt(lecMatch[1], 10);
            }
        }
        const orientationHours = lecContactHours > 0 ? lecContactHours : 2;

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

        // Build structured weeks and ILOs per Course Outcome
        let globalCounter = 1;
        const weeksByCo = {};
        for (const w of allWeeks) {
            const globalWeekNumber = globalCounter++;
            const cid = Number(w.co_id);
            if (!weeksByCo[cid]) weeksByCo[cid] = [];
            const weekNumberInCo = weeksByCo[cid].length + 1;
            const rawWeekHours = Number(w.hours);
            const cIdx = allCos.findIndex(c => Number(c.co_id) === cid);
            const cNum = cIdx >= 0 ? cIdx + 1 : 1;

            const effectiveHours = (cNum === 1 && weekNumberInCo === 1)
                ? Math.max(0, rawWeekHours - orientationHours)
                : rawWeekHours;

            const weekComments = commentCountsByWeek[Number(w.week_id)] || { topics: 0, tlas: 0, references: 0, total: 0 };

            weeksByCo[cid].push({
                week_id: w.week_id,
                co_id: w.co_id,
                weekNumber: weekNumberInCo,
                globalWeekNumber,
                hours: effectiveHours,
                unresolvedComments: weekComments
            });
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
            coNumber,
            coDescription: isOrientation
                ? 'Introduce students to the University and College Vision, Mission, and Objectives (VMO), course expectations, grading system, and ethical AI guidelines.'
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

// AI-Driven Topic Suggestions using Google Gemini
async function suggestTopicsWithAI(req, res) {
    try {
        const { iloId, weekId, courseCode, currentTopics = [], alreadySuggested = [], count = 6, useSample = false } = req.body;
        const targetId = weekId || iloId;

        // 1. Fetch academic context from DB
        let iloDescription = '';
        let coDescription = '';
        let courseTitle = '';
        let courseDescription = '';
        let courseNo = courseCode || '';

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
                        coDescription = (co.co_description || '').replace(/\s+/g, ' ').trim();
                        if (co.ProgramCourseOffering) {
                            courseDescription = (co.ProgramCourseOffering.description || co.ProgramCourseOffering.course_description || '').replace(/\s+/g, ' ').trim();
                            if (co.ProgramCourseOffering.Course) {
                                courseNo = co.ProgramCourseOffering.Course.course_no || courseNo;
                                courseTitle = co.ProgramCourseOffering.Course.course_title || '';
                            }
                        }
                        const coIlos = await IntendedLearningOutcome.findAll({
                            where: { co_id: co.co_id, is_orientation: false },
                            order: [['ilo_id', 'ASC']]
                        });
                        if (coIlos.length > 0) {
                            iloDescription = coIlos.map(i => (i.description || '').replace(/\s+/g, ' ').trim()).join('; ');
                        }
                    }
                }
            } catch (dbErr) {
                console.warn('Could not query full context from DB:', dbErr.message);
            }
        }

        const contextInfo = {
            courseNo,
            courseTitle,
            courseDescription,
            coDescription,
            iloDescription
        };

        const apiKey = process.env.GEMINI_API_KEY;

        // If sample mode explicitly requested or API key not present
        if (useSample || !apiKey) {
            const fallbackTopics = generateFallbackAcademicTopics({
                courseNo,
                courseTitle,
                coDescription,
                iloDescription,
                alreadySuggested,
                currentTopics,
                count: Number(count) || 6
            });

            return res.json({
                topics: fallbackTopics,
                isSample: !apiKey || useSample,
                error: !apiKey ? 'MISSING_API_KEY' : null,
                message: !apiKey ? 'Gemini API key is not configured in composition/server/.env' : null,
                context: contextInfo
            });
        }

        // 2. Prepare Gemini Prompt
        const topicsToAvoid = [
            ...currentTopics,
            ...alreadySuggested
        ].filter(Boolean);

        const prompt = `You are a distinguished university curriculum designer and syllabus architect.
Generate high-quality, academic lecture topics and subtopics for a university course learning plan.

COURSE CONTEXT:
- Course Number: ${courseNo || 'N/A'}
- Course Title: ${courseTitle || 'N/A'}
- Course Description: ${courseDescription || 'Standard tertiary level academic curriculum.'}
- Relevant Course Outcome (CO): ${coDescription || 'Core competency and applied knowledge.'}

👉 **CRITICAL TARGET FOCUS - TARGET INTENDED LEARNING OUTCOMES (ILOs):**
"${iloDescription || 'Theoretical foundations and practical implementation.'}"

${topicsToAvoid.length > 0 ? `TOPICS TO EXCLUDE (DO NOT duplicate or closely rephrase any of these):
${topicsToAvoid.map(t => `- ${t}`).join('\n')}
` : ''}

CRITICAL REQUIREMENTS:
1. Generate exactly ${Number(count) || 6} distinct, pedagogical lecture topics that TEACH EXACTLY the Target Course Outcome and Intended Learning Outcomes.
2. For EVERY topic, provide a FIXED count of EXACTLY 5 realistic, rigorous, and practical subtopics / lecture bullet points (do not provide 3 or 4, each topic MUST have exactly 5 subtopics).
3. Keep all names concise, professional, and directly suitable for an official academic syllabus.
4. Output MUST be strictly valid JSON without markdown fences or explanation, following this schema:
{
  "topics": [
    {
      "title": "Topic Name",
      "subtopics": [
        "Subtopic Title 1",
        "Subtopic Title 2",
        "Subtopic Title 3",
        "Subtopic Title 4",
        "Subtopic Title 5"
      ]
    }
  ]
}`;

        const models = ['gemini-2.5-flash', 'gemini-2.0-flash'];
        let lastError = null;
        let data = null;

        for (const model of models) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [
                            {
                                parts: [{ text: prompt }]
                            }
                        ],
                        generationConfig: {
                            responseMimeType: 'application/json',
                            temperature: 0.7
                        }
                    })
                });

                if (!response.ok) {
                    const errBody = await response.text();
                    lastError = new Error(`Gemini API HTTP ${response.status}: ${errBody}`);
                    continue;
                }

                data = await response.json();
                break;
            } catch (err) {
                lastError = err;
            }
        }

        if (!data) {
            console.error('All Gemini model calls failed:', lastError);
            const fallbackTopics = generateFallbackAcademicTopics({
                courseNo, courseTitle, coDescription, iloDescription,
                alreadySuggested, currentTopics, count: Number(count) || 6
            });
            return res.json({
                topics: fallbackTopics,
                isSample: true,
                warning: 'Gemini API call failed, loaded fallback topics.',
                context: contextInfo
            });
        }

        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
            throw new Error('No content returned from Gemini model');
        }

        let parsed;
        try {
            parsed = JSON.parse(rawText);
        } catch (e) {
            const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            parsed = JSON.parse(cleaned);
        }

        const rawList = Array.isArray(parsed) ? parsed : (parsed.topics || []);
        const formattedTopics = rawList.map((t, idx) => {
            let subs = Array.isArray(t.subtopics) ? t.subtopics.map(s => (typeof s === 'string' ? s : (s.title || ''))).filter(Boolean) : [];
            if (subs.length > 5) {
                subs = subs.slice(0, 5);
            }
            while (subs.length < 5) {
                subs.push(`Practical Application & Lab Exercise ${subs.length + 1}`);
            }

            return {
                id: `ai-suggest-${Date.now()}-${idx}-${Math.random()}`,
                title: t.title || t.topic || `Suggested Topic ${idx + 1}`,
                subtopics: subs.map((s, sIdx) => ({
                    id: `ai-sub-${Date.now()}-${idx}-${sIdx}`,
                    title: s
                }))
            };
        });

        return res.json({
            topics: formattedTopics,
            context: contextInfo,
            isSample: false
        });

    } catch (err) {
        console.error('suggestTopicsWithAI error:', err);
        return res.status(500).json({
            error: 'AI_SUGGESTION_FAILED',
            message: err.message || 'Error occurred while contacting Gemini AI'
        });
    }
}

function generateFallbackAcademicTopics({ courseTitle, iloDescription, alreadySuggested = [], currentTopics = [], count = 6 }) {
    const isHci = (courseTitle || '').toLowerCase().includes('human') || (iloDescription || '').toLowerCase().includes('interface') || (iloDescription || '').toLowerCase().includes('ui');
    const isDb = (courseTitle || '').toLowerCase().includes('database') || (iloDescription || '').toLowerCase().includes('data');

    let bank = [];

    if (isHci) {
        bank = [
            {
                title: "Fundamentals of User-Centered Design (UCD)",
                subtopics: [
                    "Principles of Human-Centered Development",
                    "Affordances, Signifiers, and Feedback Loops",
                    "Mapping Conceptual Models to Mental Models",
                    "User Goal Analysis & Task Breakdown",
                    "Iterative Design Life Cycle Implementation"
                ]
            },
            {
                title: "Heuristic Evaluation & Usability Inspection",
                subtopics: [
                    "Nielsen's 10 Usability Heuristics",
                    "Conducting Cognitive Walkthroughs",
                    "Severity Rating & Usability Reporting",
                    "Expert Review Methodologies",
                    "Defect Categorization & Action Planning"
                ]
            },
            {
                title: "Wireframing & Interactive Prototyping",
                subtopics: [
                    "Low-Fidelity vs High-Fidelity Mockups",
                    "Information Architecture & Task Flows",
                    "Prototyping with Modern Design Tools",
                    "Interactive Component Linking & Transitions",
                    "Design System Integration & Token Mapping"
                ]
            },
            {
                title: "Visual Design Systems & Accessibility (a11y)",
                subtopics: [
                    "WCAG 2.1 Color Contrast and Typography",
                    "Micro-Interactions and Animation Physics",
                    "Design Tokens and Component Libraries",
                    "Screen Reader Compatibility & Assistive Tech",
                    "Dark Mode & Responsive Visual Adaptation"
                ]
            },
            {
                title: "User Research & Persona Development",
                subtopics: [
                    "Qualitative & Quantitative User Interviews",
                    "Empathy Maps and Journey Mapping",
                    "Formulating Actionable Problem Statements",
                    "User Persona Archetypes & Synthesis",
                    "Surveys, Questionnaires, and Data Triangulation"
                ]
            },
            {
                title: "Usability Testing & Empirical Evaluation",
                subtopics: [
                    "Planning Lab vs Remote Usability Tests",
                    "Measuring Task Completion Rates & SUS Scores",
                    "A/B Testing & Iterative Design Refinement",
                    "Think-Aloud Protocols & Observer Notes",
                    "Translating Usability Findings into Roadmaps"
                ]
            },
            {
                title: "Cognitive Psychology & Human Factors",
                subtopics: [
                    "Hick's Law and Fitts's Law in UI Layouts",
                    "Working Memory Limitations and Chunking",
                    "Visual Hierarchy and Gestalt Principles",
                    "Cognitive Load Theory in Interface Design",
                    "Attention Economics and Perceptual Processing"
                ]
            },
            {
                title: "Emerging Interaction Paradigms",
                subtopics: [
                    "Voice User Interfaces (VUI) & Conversational UI",
                    "Gesture Control and Spatial Computing",
                    "Accessible Multi-Modal Interfaces",
                    "Haptic Feedback and Tactile Interactions",
                    "Future Trends in Ambient Intelligence"
                ]
            }
        ];
    } else if (isDb) {
        bank = [
            {
                title: "Relational Database Design & Normalization",
                subtopics: [
                    "Entity-Relationship Modeling (ERD)",
                    "First through Third Normal Forms (1NF-3NF)",
                    "Boyce-Codd Normal Form (BCNF) Application",
                    "Denormalization Trade-offs for Performance",
                    "Conceptual to Physical Schema Mapping"
                ]
            },
            {
                title: "Advanced SQL Query Optimization",
                subtopics: [
                    "Index Creation (B-Tree and Hash)",
                    "Analyzing Query Execution Plans",
                    "Joins, Subqueries, and CTEs Performance",
                    "Cost-Based Query Optimizer Mechanics",
                    "Query Rewriting & Hint Utilization"
                ]
            },
            {
                title: "Transaction Management & ACID Properties",
                subtopics: [
                    "Concurrency Control and Deadlock Prevention",
                    "Isolation Levels and Dirty Reads",
                    "Write-Ahead Logging (WAL) and Recovery",
                    "Two-Phase Locking (2PL) Mechanisms",
                    "Distributed Transactions and 2PC Protocols"
                ]
            },
            {
                title: "Database Security & Role-Based Access",
                subtopics: [
                    "SQL Injection Prevention Techniques",
                    "Privilege Delegation and Views",
                    "Data Encryption at Rest and in Transit",
                    "Auditing and Access Monitoring",
                    "Backup Strategy and Disaster Recovery"
                ]
            },
            {
                title: "NoSQL Paradigms & Document Stores",
                subtopics: [
                    "Document vs Key-Value vs Graph Databases",
                    "CAP Theorem and Eventual Consistency",
                    "Schema Design for MongoDB",
                    "Sharding and Horizontal Partitioning",
                    "Replication Sets and High Availability"
                ]
            },
            {
                title: "Data Warehousing & ETL Pipelines",
                subtopics: [
                    "Star and Snowflake Schemas",
                    "Extract, Transform, and Load Workflows",
                    "Analytical Query Processing (OLAP)",
                    "Columnar Storage Architectures",
                    "Data Lakehouse Foundations"
                ]
            }
        ];
    } else {
        bank = [
            {
                title: "Core Architectural Patterns & Principles",
                subtopics: [
                    "Separation of Concerns (SoC)",
                    "Domain-Driven Design Fundamentals",
                    "Modular Component Structuring",
                    "Dependency Injection & Inversion of Control",
                    "Layered and Hexagonal Architecture"
                ]
            },
            {
                title: "State Management & Asynchronous Data Flow",
                subtopics: [
                    "Unidirectional Data Architectures",
                    "Optimistic UI Updates and Side Effects",
                    "Error Boundaries and Fallback States",
                    "Global vs Local State Co-location",
                    "Event-Driven Message Pipelines"
                ]
            },
            {
                title: "Component Reusability & Design Systems",
                subtopics: [
                    "Atomic Design Methodology",
                    "Encapsulated Theming and Tokens",
                    "Accessibility Compliance Guidelines",
                    "Component Reusability Guidelines",
                    "Documentation with Storybook"
                ]
            },
            {
                title: "Performance Optimization & Profiling",
                subtopics: [
                    "Virtual DOM Reconciliation Mechanics",
                    "Lazy Loading and Code Splitting",
                    "Memory Leak Diagnosis and Cleanup",
                    "Bundle Size Auditing & Tree-Shaking",
                    "Web Vitals & Rendering Milestones"
                ]
            },
            {
                title: "Security Best Practices & Data Validation",
                subtopics: [
                    "Input Sanitization and Cross-Site Scripting (XSS)",
                    "Cross-Origin Resource Sharing (CORS)",
                    "Authentication Flow and JWT Security",
                    "CSRF Protection Strategies",
                    "Rate Limiting and API Gateway Policies"
                ]
            },
            {
                title: "Automated Testing & Continuous Verification",
                subtopics: [
                    "Unit Testing Core Business Logic",
                    "Integration Testing for User Flows",
                    "End-to-End Regression Automation",
                    "Mocking External APIs and Test Doubles",
                    "Code Coverage Analysis & Quality Gates"
                ]
            }
        ];
    }

    const avoidTitles = new Set([...alreadySuggested, ...currentTopics].map(t => String(t).trim().toLowerCase()));
    const filtered = bank.filter(b => !avoidTitles.has(b.title.toLowerCase()));
    const selected = (filtered.length >= count ? filtered : bank).slice(0, count);

    return selected.map((t, idx) => ({
        id: `sample-topic-${Date.now()}-${idx}-${Math.random()}`,
        title: t.title,
        subtopics: t.subtopics.slice(0, 5).map((s, sIdx) => ({
            id: `sample-sub-${Date.now()}-${idx}-${sIdx}`,
            title: s
        }))
    }));
}

module.exports = { getWeekContext, getAvailableTopics, getAssignedTopics, assignTopicsToILO, suggestTopicsWithAI };
