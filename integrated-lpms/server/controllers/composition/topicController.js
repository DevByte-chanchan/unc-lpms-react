const {
    Topic,
    Subtopic,
    Week,
    sequelize,
    IntendedLearningOutcome,
    CourseOutcome,
    ProgramCourseOffering,
    Course
} = require('../../models');
const { Op } = require('sequelize');
const {
    resolveWeekLineageContext,
    markOfferingModified
} = require('../../utils/versionHelper');
const {
    loadCourseReferencesWithCache,
    formatReferenceWithToc,
    resolveCourseReferencesTocs
} = require('../../services/referenceTocService');
const {
    generateJsonWithFallback,
    getProviderCapabilities
} = require('../../services/aiProviderService');

function parseIsOrientation(val) {
    if (typeof val === 'boolean') return val;
    if (val === 1 || val === '1') return true;
    if (typeof val === 'string') {
        const lower = val.trim().toLowerCase();
        return lower === 'true' || lower === 'yes' || lower === 'orientation';
    }
    return false;
}

function getCoPeriodInfo(coNumber, totalCos = 4) {
    const num = Number(coNumber);
    if (!num || num <= 0) {
        return { periodShort: 'Orientation', periodLabel: 'Course Orientation' };
    }
    if (totalCos <= 2) {
        if (num === 1) return { periodShort: 'Midterm', periodLabel: 'Midterm' };
        return { periodShort: 'Final', periodLabel: 'Final' };
    }
    if (totalCos === 3) {
        const map3 = {
            1: { periodShort: 'Prelim', periodLabel: 'Prelim' },
            2: { periodShort: 'Midterm', periodLabel: 'Midterm' },
            3: { periodShort: 'Final', periodLabel: 'Final' }
        };
        return map3[num] || { periodShort: `Period ${num}`, periodLabel: `Period ${num}` };
    }
    const map = {
        1: { periodShort: 'Prelim', periodLabel: 'Prelim' },
        2: { periodShort: 'Midterm', periodLabel: 'Midterm' },
        3: { periodShort: 'Semi-Final', periodLabel: 'Semi-Final' },
        4: { periodShort: 'Final', periodLabel: 'Final' }
    };
    return map[num] || { periodShort: `Period ${num}`, periodLabel: `Period ${num}` };
}

function parseEstimatedMinutes(raw) {
    if (raw === null || raw === undefined || raw === '') return null;
    const parsed = parseInt(String(raw).replace(/\D/g, '').slice(0, 3), 10);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return Math.min(999, parsed);
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
                as: 'ProgramCourseOffering',
                include: [{
                    model: Course,
                    as: 'Course',
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
            periodShort: 'Orientation',
            periodLabel: 'Course Orientation',
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
            const periodInfo = getCoPeriodInfo(idx + 1, allCos.length);
            return {
                co_id: cid,
                coNumber: idx + 1,
                isOrientation: false,
                periodShort: periodInfo.periodShort,
                periodLabel: periodInfo.periodLabel,
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

        const activePeriodInfo = getCoPeriodInfo(coNumber, allCos.length);

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
            periodShort: activePeriodInfo.periodShort,
            periodLabel: activePeriodInfo.periodLabel,
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

// Fetch topics that are EITHER unassigned in the CURRENT offering OR assigned to the current (weekId, isOrientation) context,
// scoped to the current course and deduplicated by normalized title across revisions/terms.
async function getAvailableTopics(req, res) {
    try {
        const rawId = req.query.weekId || req.query.week_id || req.query.iloId || req.query.ilo_id;
        const isOrientation = parseIsOrientation(req.query.isOrientation ?? req.query.orientation);
        const week = await resolveWeekRecord(rawId);
        if (!week) return res.status(400).json({ message: 'Valid weekId is required' });
        const weekId = Number(week.week_id);

        const lineage = await resolveWeekLineageContext(weekId);
        if (!lineage) {
            return res.json([]);
        }

        const courseId = lineage.courseId ? Number(lineage.courseId) : null;
        const currentOfferingWeekIdSet = new Set(
            Array.isArray(lineage.allCurrentOfferingWeekIds)
                ? lineage.allCurrentOfferingWeekIds.map(Number)
                : [weekId]
        );

        // Identify the matching week of the latest previous revision for this course
        const latestPriorOffering =
            Array.isArray(lineage.priorOfferings) && lineage.priorOfferings.length > 0
                ? lineage.priorOfferings[0]
                : null;
        const matchingPriorWeek = latestPriorOffering
            ? (latestPriorOffering.weeks || []).find(
                  (w) => Number(w.week_number) === Number(lineage.weekNumber)
              ) || null
            : null;
        const matchingPriorWeekId = matchingPriorWeek ? Number(matchingPriorWeek.week_id) : null;

        // Collect all week_ids belonging to ALL offerings of this course_id
        const allCourseWeekIds = new Set(currentOfferingWeekIdSet);
        if (Array.isArray(lineage.priorOfferings)) {
            lineage.priorOfferings.forEach((po) => {
                (po.weeks || []).forEach((w) => allCourseWeekIds.add(Number(w.week_id)));
            });
        }

        // Fetch subtopics strictly for weeks belonging to THIS course
        const courseSubtopics =
            allCourseWeekIds.size > 0
                ? await Subtopic.findAll({
                      where: { week_id: { [Op.in]: [...allCourseWeekIds] } },
                      attributes: ['subtopic_id', 'week_id', 'topic_id', 'title', 'sequence_order', 'is_orientation', 'estimated_minutes'],
                      order: [
                          ['week_id', 'DESC'],
                          ['sequence_order', 'ASC'],
                          ['subtopic_id', 'ASC']
                      ],
                      raw: true
                  })
                : [];

        const topicsInCurrentContext = new Set();
        const topicsInOtherWeeksOfCurrentOffering = new Set();
        const subtopicsByTopicForCurrentContext = {};
        const latestWeekPerTopic = {};
        const subtopicsByTopicLatestWeek = {};
        const courseTopicIdSet = new Set();
        const orientationTopicIdSet = new Set();
        const regularTopicIdSet = new Set();

        // Track matching-week topics & subtopics from the latest previous revision in original display order
        const matchingPriorRawSubs = [];

        for (const sub of courseSubtopics) {
            const tid = Number(sub.topic_id);
            const wid = Number(sub.week_id);
            const subIsOrientation = Boolean(sub.is_orientation);

            if (subIsOrientation) {
                orientationTopicIdSet.add(tid);
            } else {
                regularTopicIdSet.add(tid);
            }

            if (subIsOrientation !== isOrientation) {
                continue;
            }

            courseTopicIdSet.add(tid);

            if (matchingPriorWeekId && wid === matchingPriorWeekId) {
                matchingPriorRawSubs.push(sub);
            }

            if (wid === weekId) {
                topicsInCurrentContext.add(tid);
                if (!subtopicsByTopicForCurrentContext[tid]) {
                    subtopicsByTopicForCurrentContext[tid] = [];
                }
                subtopicsByTopicForCurrentContext[tid].push({
                    subtopic_id: sub.subtopic_id,
                    title: sub.title,
                    sequence_order: sub.sequence_order,
                    estimated_minutes: sub.estimated_minutes != null ? Number(sub.estimated_minutes) : null
                });
            } else if (currentOfferingWeekIdSet.has(wid)) {
                // Only exclude topics used in OTHER weeks of the CURRENT learning plan offering,
                // NOT topics used in previous revisions/terms
                topicsInOtherWeeksOfCurrentOffering.add(tid);
            }

            // Track subtopics from the most recent week_id where this topic appeared
            if (latestWeekPerTopic[tid] === undefined) {
                latestWeekPerTopic[tid] = wid;
                subtopicsByTopicLatestWeek[tid] = [];
            }
            if (latestWeekPerTopic[tid] === wid) {
                subtopicsByTopicLatestWeek[tid].push({
                    subtopic_id: sub.subtopic_id,
                    title: sub.title,
                    sequence_order: sub.sequence_order,
                    estimated_minutes: sub.estimated_minutes != null ? Number(sub.estimated_minutes) : null
                });
            }
        }

        // Preserve original topic & subtopic order from the latest previous revision's matching week
        matchingPriorRawSubs.sort(
            (a, b) => Number(a.subtopic_id) - Number(b.subtopic_id) || (Number(a.sequence_order) || 0) - (Number(b.sequence_order) || 0)
        );
        const matchingPriorOrderByTopicId = new Map();
        const matchingPriorSubtopicsByTopic = {};
        let prevOrderCounter = 0;
        for (const sub of matchingPriorRawSubs) {
            const tid = Number(sub.topic_id);
            if (!matchingPriorOrderByTopicId.has(tid)) {
                matchingPriorOrderByTopicId.set(tid, prevOrderCounter++);
                matchingPriorSubtopicsByTopic[tid] = [];
            }
            matchingPriorSubtopicsByTopic[tid].push({
                subtopic_id: sub.subtopic_id,
                title: sub.title,
                sequence_order: sub.sequence_order,
                estimated_minutes: sub.estimated_minutes != null ? Number(sub.estimated_minutes) : null
            });
        }

        // Build topic query STRICTLY scoped to this course (never fall back to an unfiltered `{}` query!)
        const topicOrFilters = [];
        if (isOrientation) {
            // For Orientation, only show topics that belong to this course's orientation subtopics
            if (courseTopicIdSet.size > 0) {
                topicOrFilters.push({ topic_id: { [Op.in]: [...courseTopicIdSet] } });
            }
        } else {
            if (courseId) {
                topicOrFilters.push({ course_id: courseId });
            }
            if (courseTopicIdSet.size > 0) {
                topicOrFilters.push({ topic_id: { [Op.in]: [...courseTopicIdSet] } });
            }
        }

        if (topicOrFilters.length === 0) {
            return res.json([]);
        }

        const topics = await Topic.findAll({
            where: { [Op.or]: topicOrFilters },
            order: [['topic_id', 'DESC']],
            raw: true
        });

        // Map matching-week topic titles so title-based deduplication preserves the emphasized matching-week flag
        const matchingPriorOrderByTitle = new Map();
        for (const t of topics) {
            const tid = Number(t.topic_id);
            if (matchingPriorOrderByTopicId.has(tid)) {
                const normTitle = String(t.title || '').trim().toLowerCase();
                if (normTitle && !matchingPriorOrderByTitle.has(normTitle)) {
                    matchingPriorOrderByTitle.set(normTitle, {
                        orderIndex: matchingPriorOrderByTopicId.get(tid),
                        subtopics: matchingPriorSubtopicsByTopic[tid] || []
                    });
                }
            }
        }

        // Exclude topics whose title or topic_id is already assigned in another week of the CURRENT offering
        const blockedTopicIds = new Set(
            [...topicsInOtherWeeksOfCurrentOffering].filter((tid) => !topicsInCurrentContext.has(tid))
        );
        const blockedTitleSet = new Set();
        for (const t of topics) {
            if (blockedTopicIds.has(Number(t.topic_id))) {
                blockedTitleSet.add(String(t.title || '').trim().toLowerCase());
            }
        }

        const dedupeSubtopics = (rawSubs) => {
            const seenSubTitles = new Set();
            const cleanSubs = [];
            const sortedRawSubs = [...(rawSubs || [])].sort(
                (a, b) => (Number(a.sequence_order) || 0) - (Number(b.sequence_order) || 0)
            );
            for (const s of sortedRawSubs) {
                const normSub = String(s.title || '').trim().toLowerCase();
                if (!normSub || seenSubTitles.has(normSub)) continue;
                seenSubTitles.add(normSub);
                cleanSubs.push({
                    subtopic_id: s.subtopic_id,
                    title: s.title,
                    sequence_order: cleanSubs.length + 1,
                    estimated_minutes: s.estimated_minutes != null ? Number(s.estimated_minutes) : null
                });
            }
            return cleanSubs;
        };

        // Deduplicate topics by normalized title so reused topics across revisions/terms never show duplicate titles
        const deduplicatedByTitle = new Map();
        for (const t of topics) {
            const tid = Number(t.topic_id);
            const normTitle = String(t.title || '').trim().toLowerCase();
            if (!normTitle) continue;

            // Skip orientation-only topics when browsing regular weeks
            if (!isOrientation && orientationTopicIdSet.has(tid) && !regularTopicIdSet.has(tid)) {
                continue;
            }

            const isInCurrent = topicsInCurrentContext.has(tid);
            if (!isInCurrent && (blockedTopicIds.has(tid) || blockedTitleSet.has(normTitle))) {
                continue;
            }

            const prevMatchInfo = matchingPriorOrderByTitle.get(normTitle) || null;
            const isPrevMatchingWeek = Boolean(prevMatchInfo);

            const rawSubs =
                subtopicsByTopicForCurrentContext[tid] ||
                (isPrevMatchingWeek && prevMatchInfo.subtopics.length > 0 ? prevMatchInfo.subtopics : null) ||
                subtopicsByTopicLatestWeek[tid] ||
                [];
            const cleanSubs = dedupeSubtopics(rawSubs);

            const candidateEntry = {
                topic_id: tid,
                title: t.title,
                subtopics: cleanSubs,
                isPrevMatchingWeek,
                prevRevisionNumber: isPrevMatchingWeek && latestPriorOffering ? Number(latestPriorOffering.revision_number) : null,
                prevTermLabel: isPrevMatchingWeek && latestPriorOffering ? latestPriorOffering.termLabel : null,
                _isInCurrent: isInCurrent,
                _prevOrderIndex: isPrevMatchingWeek ? prevMatchInfo.orderIndex : Number.MAX_SAFE_INTEGER
            };

            if (!deduplicatedByTitle.has(normTitle)) {
                deduplicatedByTitle.set(normTitle, candidateEntry);
            } else {
                const existingEntry = deduplicatedByTitle.get(normTitle);
                if (
                    (isInCurrent && !existingEntry._isInCurrent) ||
                    (isPrevMatchingWeek && !existingEntry.isPrevMatchingWeek) ||
                    (cleanSubs.length > 0 && existingEntry.subtopics.length === 0)
                ) {
                    deduplicatedByTitle.set(normTitle, {
                        ...candidateEntry,
                        subtopics: cleanSubs.length > 0 ? cleanSubs : existingEntry.subtopics
                    });
                }
            }
        }

        const result = Array.from(deduplicatedByTitle.values())
            .sort((a, b) => {
                if (a.isPrevMatchingWeek && !b.isPrevMatchingWeek) return -1;
                if (!a.isPrevMatchingWeek && b.isPrevMatchingWeek) return 1;
                if (a.isPrevMatchingWeek && b.isPrevMatchingWeek) {
                    return a._prevOrderIndex - b._prevOrderIndex;
                }
                return String(a.title || '').localeCompare(String(b.title || ''));
            })
            .map(({ _isInCurrent, _prevOrderIndex, ...item }) => item);

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
        const weekId = Number(week.week_id);

        const lineage = await resolveWeekLineageContext(weekId);
        // Topics can only be continued within the SAME Course Outcome of the current offering
        const earlierWeekIdsInCurrentCo = lineage
            ? (lineage.orderedCurrentWeeks || [])
                .filter((w) => Number(w.co_id) === Number(lineage.coId) && Number(w.week_id) < weekId)
                .map((w) => Number(w.week_id))
            : [];

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

        // Check if any of these topics also appeared in an earlier week OF THE SAME COURSE OUTCOME & OFFERING (making it a continued topic)
        let continuedTopicIds = new Set();
        if (topicIds.length > 0 && !isOrientation && earlierWeekIdsInCurrentCo.length > 0) {
            const earlierSubtopics = await Subtopic.findAll({
                where: {
                    topic_id: { [Op.in]: topicIds },
                    week_id: { [Op.in]: earlierWeekIdsInCurrentCo },
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
                is_orientation: Boolean(s.is_orientation),
                estimated_minutes: s.estimated_minutes != null ? Number(s.estimated_minutes) : null
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

/**
 * COMP-006: Fetch topics & subtopics from prior approved/historical revisions of the same course.
 * Returns both:
 * - matchingWeekTopics: topics assigned to the matching week_number in the previous revision(s)
 * - allPreviousCourseTopics: deduplicated topics across all weeks/revisions of the same course
 */
async function getPreviousTopics(req, res) {
    try {
        const rawWeekId = req.params.weekId || req.query.weekId || req.params.iloId;
        const isOrientation = parseIsOrientation(req.query.isOrientation ?? req.query.orientation);
        const requestedPcOfferingId = req.query.sourcePcOfferingId
            ? Number(req.query.sourcePcOfferingId)
            : null;

        const week = await resolveWeekRecord(rawWeekId);
        if (!week) {
            return res.status(400).json({ message: 'Valid weekId is required' });
        }

        const lineage = await resolveWeekLineageContext(week.week_id);
        if (!lineage) {
            return res.status(404).json({ message: 'Week lineage context not found' });
        }

        const priorOfferings = lineage.priorOfferings || [];
        if (priorOfferings.length === 0) {
            return res.json({
                hasPreviousRevision: false,
                weekNumber: lineage.weekNumber,
                isOrientation: lineage.isOrientation,
                revisions: [],
                matchingWeekTopics: [],
                allPreviousCourseTopics: []
            });
        }

        // Determine topics already used in OTHER weeks of the current offering so we can flag or filter them
        const otherCurrentWeekIds = lineage.allCurrentOfferingWeekIds.filter(
            (wid) => Number(wid) !== Number(lineage.weekId)
        );
        const currentOfferingOtherSubtopics =
            otherCurrentWeekIds.length > 0
                ? await Subtopic.findAll({
                      where: { week_id: { [Op.in]: otherCurrentWeekIds } },
                      include: [{ model: Topic, as: 'topic', attributes: ['topic_id', 'title'] }],
                      raw: true,
                      nest: true
                  })
                : [];
        const usedInCurrentOtherWeeksTitles = new Set(
            currentOfferingOtherSubtopics
                .map((s) => String(s.topic?.title || '').trim().toLowerCase())
                .filter(Boolean)
        );

        // Select source prior offering (defaults to the highest-priority approved prior offering)
        const targetPriorOffering =
            (requestedPcOfferingId &&
                priorOfferings.find((po) => Number(po.pc_offering_id) === requestedPcOfferingId)) ||
            priorOfferings[0];

        // 1. Fetch matching week topics from targetPriorOffering
        const matchingPriorWeek = (targetPriorOffering.weeks || []).find(
            (w) => Number(w.week_number) === Number(lineage.weekNumber)
        );

        const matchingWeekTopics = [];
        if (matchingPriorWeek) {
            const priorWeekSubs = await Subtopic.findAll({
                where: {
                    week_id: matchingPriorWeek.week_id,
                    is_orientation: isOrientation
                },
                include: [{ model: Topic, as: 'topic', attributes: ['topic_id', 'title'] }],
                order: [
                    ['subtopic_id', 'ASC'],
                    ['sequence_order', 'ASC']
                ]
            });

            const byTopicTitle = new Map();
            for (const s of priorWeekSubs) {
                if (!s.topic) continue;
                const normTitle = String(s.topic.title || '').trim().toLowerCase();
                if (!normTitle) continue;

                if (!byTopicTitle.has(normTitle)) {
                    byTopicTitle.set(normTitle, {
                        topic_id: Number(s.topic.topic_id),
                        title: s.topic.title,
                        sourceWeekNumber: Number(matchingPriorWeek.week_number),
                        sourceRevisionNumber: Number(targetPriorOffering.revision_number),
                        sourceTermLabel: targetPriorOffering.termLabel,
                        sourcePcOfferingId: Number(targetPriorOffering.pc_offering_id),
                        alreadyUsedInCurrentOffering: usedInCurrentOtherWeeksTitles.has(normTitle),
                        subtopics: []
                    });
                }
                const entry = byTopicTitle.get(normTitle);
                const normSub = String(s.title || '').trim().toLowerCase();
                if (!entry.subtopics.some((es) => String(es.title || '').trim().toLowerCase() === normSub)) {
                    entry.subtopics.push({
                        subtopic_id: Number(s.subtopic_id),
                        title: s.title,
                        sequence_order: entry.subtopics.length + 1,
                        estimated_minutes: s.estimated_minutes != null ? Number(s.estimated_minutes) : null
                    });
                }
            }
            matchingWeekTopics.push(...byTopicTitle.values());
        }

        // 2. Fetch all previous course topics across all prior revisions (deduplicated by normalized topic title)
        const allPriorWeekMeta = new Map();
        const allPriorWeekIds = [];
        priorOfferings.forEach((po) => {
            (po.weeks || []).forEach((w) => {
                allPriorWeekIds.push(Number(w.week_id));
                allPriorWeekMeta.set(Number(w.week_id), {
                    weekNumber: Number(w.week_number),
                    revisionNumber: Number(po.revision_number),
                    termLabel: po.termLabel,
                    pcOfferingId: Number(po.pc_offering_id),
                    status: po.status
                });
            });
        });

        const allPreviousCourseTopics = [];
        if (allPriorWeekIds.length > 0) {
            const allPriorSubs = await Subtopic.findAll({
                where: {
                    week_id: { [Op.in]: allPriorWeekIds },
                    is_orientation: isOrientation
                },
                include: [{ model: Topic, as: 'topic', attributes: ['topic_id', 'title'] }],
                order: [
                    ['week_id', 'DESC'],
                    ['sequence_order', 'ASC'],
                    ['subtopic_id', 'ASC']
                ]
            });

            // Group by normalized topic title, keeping subtopics from the most recent revision/week where the topic appeared
            const canonicalMap = new Map();
            for (const s of allPriorSubs) {
                if (!s.topic) continue;
                const normTitle = String(s.topic.title || '').trim().toLowerCase();
                if (!normTitle) continue;
                const wid = Number(s.week_id);
                const meta = allPriorWeekMeta.get(wid) || {};

                if (!canonicalMap.has(normTitle)) {
                    canonicalMap.set(normTitle, {
                        topic_id: Number(s.topic.topic_id),
                        title: s.topic.title,
                        _sourceWeekId: wid,
                        sourceWeekNumber: meta.weekNumber || 1,
                        sourceRevisionNumber: meta.revisionNumber || 1,
                        sourceTermLabel: meta.termLabel || 'Previous Term',
                        sourcePcOfferingId: meta.pcOfferingId || null,
                        alreadyUsedInCurrentOffering: usedInCurrentOtherWeeksTitles.has(normTitle),
                        subtopics: []
                    });
                }

                const entry = canonicalMap.get(normTitle);
                // Only merge subtopics from the same canonical (most recent) week occurrence so subtopics don't multiply across revisions
                if (entry._sourceWeekId === wid) {
                    const normSub = String(s.title || '').trim().toLowerCase();
                    if (!entry.subtopics.some((es) => String(es.title || '').trim().toLowerCase() === normSub)) {
                        entry.subtopics.push({
                            subtopic_id: Number(s.subtopic_id),
                            title: s.title,
                            sequence_order: entry.subtopics.length + 1,
                            estimated_minutes: s.estimated_minutes != null ? Number(s.estimated_minutes) : null
                        });
                    }
                }
            }

            allPreviousCourseTopics.push(
                ...Array.from(canonicalMap.values())
                    .map(({ _sourceWeekId, ...rest }) => rest)
                    .sort((a, b) => (a.sourceWeekNumber || 0) - (b.sourceWeekNumber || 0))
            );
        }

        return res.json({
            hasPreviousRevision: true,
            weekNumber: lineage.weekNumber,
            isOrientation: lineage.isOrientation,
            selectedRevision: {
                pc_offering_id: targetPriorOffering.pc_offering_id,
                revision_number: targetPriorOffering.revision_number,
                termLabel: targetPriorOffering.termLabel,
                status: targetPriorOffering.status
            },
            revisions: priorOfferings.map((po) => ({
                pc_offering_id: po.pc_offering_id,
                revision_number: po.revision_number,
                termLabel: po.termLabel,
                status: po.status
            })),
            matchingWeekTopics,
            allPreviousCourseTopics
        });
    } catch (err) {
        console.error('getPreviousTopics error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Master sync function: Creates custom topics, applies Copy-on-Write (CoW) when an imported/shared topic title is edited,
// reuses canonical Topic IDs when titles match (preventing duplicate Topic rows across revisions),
// and manages weekly Subtopic assignments while preserving subtopic_id values for CommentTargets.
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
        const week_id = Number(week.week_id);

        const lineage = await resolveWeekLineageContext(week_id);
        const courseId = lineage ? Number(lineage.courseId) : null;
        const pcOfferingId = lineage ? Number(lineage.pcOfferingId) : null;

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

        // Helper: find an existing canonical Topic by title for this course
        const findCanonicalTopicByTitle = async (cleanTitle) => {
            const candidates = await Topic.findAll({
                where: sequelize.where(
                    sequelize.fn('LOWER', sequelize.fn('TRIM', sequelize.col('title'))),
                    cleanTitle.toLowerCase()
                ),
                order: [['topic_id', 'ASC']],
                transaction: t
            });
            if (candidates.length === 0) return null;
            if (courseId) {
                const exactCourseMatch = candidates.find((c) => Number(c.course_id) === courseId);
                if (exactCourseMatch) return exactCourseMatch;
                const unscopedMatch = candidates.find((c) => c.course_id == null);
                if (unscopedMatch) {
                    await unscopedMatch.update({ course_id: courseId }, { transaction: t });
                    return unscopedMatch;
                }
            }
            return candidates[0];
        };

        // 2. Process each topic with Copy-on-Write (CoW) and canonical deduplication
        for (const topicData of topics) {
            let currentTopicId = topicData.topic_id ? Number(topicData.topic_id) : null;
            const cleanTitle = (topicData.title || 'Untitled Topic').trim();

            if (currentTopicId) {
                const existingTopic = await Topic.findByPk(currentTopicId, { transaction: t });
                if (!existingTopic) {
                    currentTopicId = null;
                } else {
                    const oldTitle = (existingTopic.title || '').trim();
                    if (courseId && !existingTopic.course_id) {
                        await existingTopic.update({ course_id: courseId }, { transaction: t });
                    }

                    if (oldTitle !== cleanTitle && !topicData.isContinuation) {
                        // Title was changed! Check if this topic_id is referenced by ANY other week (e.g. a previous approved learning plan)
                        const externalUsageCount = await Subtopic.count({
                            where: {
                                topic_id: currentTopicId,
                                week_id: { [Op.ne]: week_id }
                            },
                            transaction: t
                        });

                        if (externalUsageCount > 0) {
                            // COPY-ON-WRITE: Do NOT mutate the historical Topic row!
                            // Reuse an existing Topic with cleanTitle if one already exists, otherwise fork a new Topic row.
                            const matchByNewTitle = await findCanonicalTopicByTitle(cleanTitle);
                            if (matchByNewTitle) {
                                currentTopicId = Number(matchByNewTitle.topic_id);
                            } else {
                                const forkedTopic = await Topic.create(
                                    {
                                        title: cleanTitle,
                                        course_id: courseId,
                                        parent_topic_id: currentTopicId
                                    },
                                    { transaction: t }
                                );
                                currentTopicId = Number(forkedTopic.topic_id);
                            }
                        } else {
                            // Not referenced by any other week/learning plan: check if another Topic already has cleanTitle
                            const matchByNewTitle = await findCanonicalTopicByTitle(cleanTitle);
                            if (matchByNewTitle && Number(matchByNewTitle.topic_id) !== currentTopicId) {
                                currentTopicId = Number(matchByNewTitle.topic_id);
                            } else {
                                await Topic.update(
                                    { title: cleanTitle, ...(courseId ? { course_id: courseId } : {}) },
                                    { where: { topic_id: currentTopicId }, transaction: t }
                                );
                            }
                        }
                    }
                }
            }

            if (!currentTopicId) {
                // New, manual, AI-suggested, or continuation topic without ID: check canonical topic by title first to avoid duplicates
                const existingByTitle = await findCanonicalTopicByTitle(cleanTitle);
                if (existingByTitle) {
                    currentTopicId = Number(existingByTitle.topic_id);
                } else {
                    const newTopic = await Topic.create(
                        {
                            title: cleanTitle,
                            course_id: courseId
                        },
                        { transaction: t }
                    );
                    currentTopicId = Number(newTopic.topic_id);
                }
            }

            finalTopicIds.push(currentTopicId);

            const rawSubtopics = Array.isArray(topicData.subtopics) && topicData.subtopics.length > 0
                ? topicData.subtopics
                : [{ title: '', sequence_order: 0 }];

            rawSubtopics.forEach((s, idx) => {
                const incomingSubId = s.subtopic_id ? Number(s.subtopic_id) : null;
                const isOwnExistingSubtopic = incomingSubId && existingById.has(incomingSubId);
                const parentSubId = s.parent_subtopic_id
                    ? Number(s.parent_subtopic_id)
                    : (!isOwnExistingSubtopic && incomingSubId ? incomingSubId : null);

                desiredSubtopics.push({
                    incoming_subtopic_id: isOwnExistingSubtopic ? incomingSubId : null,
                    parent_subtopic_id: parentSubId,
                    week_id: week_id,
                    topic_id: currentTopicId,
                    title: s.title != null ? String(s.title) : '',
                    sequence_order: s.sequence_order ?? (idx + 1),
                    is_orientation: isOrientation,
                    estimated_minutes: parseEstimatedMinutes(s.duration_mins ?? s.estimated_minutes ?? s.minutes)
                });
            });
        }

        // Pass 1: Match by explicit incoming_subtopic_id belonging to THIS week
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
                    is_orientation: item.is_orientation,
                    estimated_minutes: item.estimated_minutes,
                    ...(item.parent_subtopic_id ? { parent_subtopic_id: item.parent_subtopic_id } : {})
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
                    is_orientation: item.is_orientation,
                    estimated_minutes: item.estimated_minutes,
                    parent_subtopic_id: item.parent_subtopic_id || null
                }, { transaction: t });
                keptSubtopicIds.push(Number(created.subtopic_id));
            }
        }

        // Delete any surplus existing subtopics that were removed from THIS week
        const idsToDelete = existingSubtopics
            .map(es => Number(es.subtopic_id))
            .filter(id => !usedExistingIds.has(id));

        if (idsToDelete.length > 0) {
            await Subtopic.destroy({
                where: { subtopic_id: { [Op.in]: idsToDelete } },
                transaction: t
            });
        }

        // Mark offering as modified (without incrementing revision_number while unapproved)
        if (pcOfferingId) {
            await markOfferingModified(pcOfferingId, t);
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
 * Deterministic helper: formats a textbook TOC entry into a readable chapter/section citation string.
 */
function formatTocCitation(entry) {
    if (!entry) return '';
    const chap = String(entry.chapter || '').trim();
    const title = String(entry.title || '').trim();
    if (chap && title && !title.toLowerCase().startsWith(chap.toLowerCase())) {
        return `${chap}: ${title}`;
    }
    return title || chap;
}

/**
 * Extracts normalized lowercase words (>2 chars) for lightweight lexical overlap matching
 * between topics/ILOs and verified TOC entries.
 */
function extractKeywords(text) {
    const stop = new Set(['the', 'and', 'for', 'with', 'from', 'into', 'that', 'this', 'using', 'based', 'course', 'week', 'introduction', 'overview']);
    return String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stop.has(w));
}

function scoreKeywordOverlap(textA, textB) {
    const kwA = new Set(extractKeywords(textA));
    const kwB = extractKeywords(textB);
    if (kwA.size === 0 || kwB.length === 0) return 0;
    let hits = 0;
    for (const w of kwB) {
        if (kwA.has(w)) hits += 1;
    }
    return hits;
}

/**
 * Resolves and validates `primary_textbook` strictly against the course's verified/manual Textbooks.
 * Returns null if no verified textbook exists.
 */
function resolveValidatedPrimaryTextbook(rawPrimaryRef, topicTitle, subtopicTitles, verifiedTextbooks, verifiedTextbookMap) {
    if (!Array.isArray(verifiedTextbooks) || verifiedTextbooks.length === 0) return null;

    const rawId = Number(rawPrimaryRef?.reference_id ?? rawPrimaryRef?.id ?? 0);
    let matchedBook = rawId && verifiedTextbookMap.has(rawId) ? verifiedTextbookMap.get(rawId) : null;

    // Fallback: match by exact/partial title against verified textbooks only
    if (!matchedBook && rawPrimaryRef?.title) {
        const needle = String(rawPrimaryRef.title).trim().toLowerCase();
        matchedBook = verifiedTextbooks.find((b) => {
            const bt = String(b.title || '').trim().toLowerCase();
            return bt === needle || bt.includes(needle) || needle.includes(bt);
        }) || null;
    }

    // Fallback: pick verified textbook whose real TOC has highest overlap with topic + subtopics
    const topicText = `${topicTitle} ${(subtopicTitles || []).join(' ')} ${rawPrimaryRef?.chapter_or_section || ''}`;
    if (!matchedBook) {
        let bestBook = verifiedTextbooks[0];
        let bestScore = -1;
        for (const book of verifiedTextbooks) {
            const tocText = (book.toc_entries || [])
                .map((e) => `${e.chapter} ${e.title} ${(e.sections || []).join(' ')}`)
                .join(' ');
            const score = scoreKeywordOverlap(topicText, `${book.title} ${tocText}`);
            if (score > bestScore) {
                bestScore = score;
                bestBook = book;
            }
        }
        matchedBook = bestBook;
    }

    // Pick or validate chapter_or_section from this textbook's real TOC entries
    let chapterOrSection = String(rawPrimaryRef?.chapter_or_section || rawPrimaryRef?.chapter || rawPrimaryRef?.section || '').trim();
    const bookEntries = Array.isArray(matchedBook.toc_entries) ? matchedBook.toc_entries : [];

    if (!chapterOrSection && bookEntries.length > 0) {
        let bestEntry = bookEntries[0];
        let bestEntryScore = -1;
        for (const entry of bookEntries) {
            const entryText = `${entry.chapter} ${entry.title} ${(entry.sections || []).join(' ')}`;
            const sc = scoreKeywordOverlap(topicText, entryText);
            if (sc > bestEntryScore) {
                bestEntryScore = sc;
                bestEntry = entry;
            }
        }
        chapterOrSection = formatTocCitation(bestEntry);
    }

    return {
        reference_id: Number(matchedBook.reference_id),
        title: matchedBook.title,
        chapter_or_section: chapterOrSection || (bookEntries[0] ? formatTocCitation(bookEntries[0]) : 'Verified Textbook Chapter')
    };
}

/**
 * Validates optional `supporting_references` strictly against verified/manual OER/OR/Subscription refs.
 * Strips any reference_id not present in the verified supporting set.
 */
function resolveValidatedSupportingRefs(rawSupporting, verifiedSupportingMap) {
    if (!Array.isArray(rawSupporting) || !verifiedSupportingMap || verifiedSupportingMap.size === 0) {
        return [];
    }
    const seenIds = new Set();
    const valid = [];

    for (const item of rawSupporting) {
        if (!item) continue;
        const refId = Number(item.reference_id ?? item.id ?? 0);
        if (!refId || seenIds.has(refId) || !verifiedSupportingMap.has(refId)) continue;
        const dbRef = verifiedSupportingMap.get(refId);
        seenIds.add(refId);

        const defaultSec = Array.isArray(dbRef.toc_entries) && dbRef.toc_entries[0]
            ? formatTocCitation(dbRef.toc_entries[0])
            : '';

        valid.push({
            reference_id: Number(dbRef.reference_id),
            type: dbRef.type,
            title: dbRef.title,
            section: String(item.section || item.chapter_or_section || defaultSec || '').trim()
        });
    }

    return valid.slice(0, 3);
}

/**
 * Deterministic time rebalancer: ensures the sum of subtopic `duration_mins` across
 * `primaryTopics` equals `targetMins` EXACTLY (preferring clean 5-minute increments,
 * with exact integer adjustment if `targetMins % 5 !== 0` or `targetMins` is very small).
 */
function rebalancePrimaryTopicsToExactBudget(primaryTopics, targetMins) {
    const exactTarget = Math.max(0, Math.round(Number(targetMins) || 0));
    if (!Array.isArray(primaryTopics) || primaryTopics.length === 0 || exactTarget <= 0) {
        return primaryTopics;
    }

    const minPerSub = exactTarget < 15 ? 1 : (exactTarget < 30 ? 5 : 10);

    // Flatten subtopics while keeping references to their parent topic
    let allSubs = [];
    primaryTopics.forEach((t) => {
        t.subtopics.forEach((s) => allSubs.push({ topic: t, sub: s }));
    });

    // If remaining budget is too small to give every subtopic `minPerSub`, trim excess subtopics cleanly
    const maxAllowedSubs = Math.max(1, Math.floor(exactTarget / minPerSub));
    if (allSubs.length > maxAllowedSubs) {
        // Keep at least 1 subtopic from the first topic, trim from the end
        const keptSet = new Set(allSubs.slice(0, maxAllowedSubs).map((x) => x.sub));
        for (const t of primaryTopics) {
            t.subtopics = t.subtopics.filter((s) => keptSet.has(s));
        }
        // Remove any emptied topics
        for (let i = primaryTopics.length - 1; i >= 0; i--) {
            if (primaryTopics[i].subtopics.length === 0) {
                primaryTopics.splice(i, 1);
            }
        }
        allSubs = [];
        primaryTopics.forEach((t) => {
            t.subtopics.forEach((s) => allSubs.push({ topic: t, sub: s }));
        });
    }

    if (allSubs.length === 0) return primaryTopics;

    const subs = allSubs.map((x) => x.sub);
    const useFiveStep = exactTarget >= 15 && minPerSub >= 5;
    const stepBase = useFiveStep ? 5 : 1;
    const roundedTarget = useFiveStep ? Math.floor(exactTarget / 5) * 5 : exactTarget;
    const exactRemainder = exactTarget - roundedTarget; // 0..4 when exactTarget % 5 !== 0

    const currentSum = subs.reduce((acc, s) => acc + (Number(s.duration_mins) || 0), 0);

    if (currentSum !== roundedTarget) {
        if (currentSum > 0) {
            const scale = roundedTarget / currentSum;
            subs.forEach((s) => {
                const scaled = s.duration_mins * scale;
                const snapped = useFiveStep
                    ? Math.max(minPerSub, Math.round(scaled / 5) * 5)
                    : Math.max(1, Math.round(scaled));
                s.duration_mins = snapped;
            });
        } else {
            const evenShare = useFiveStep
                ? Math.max(minPerSub, Math.floor(roundedTarget / subs.length / 5) * 5)
                : Math.max(1, Math.floor(roundedTarget / subs.length));
            subs.forEach((s) => {
                s.duration_mins = evenShare;
            });
        }

        let diff = roundedTarget - subs.reduce((acc, s) => acc + s.duration_mins, 0);
        let safety = 0;
        while (diff !== 0 && safety < 400) {
            let changedInPass = false;
            for (let i = 0; i < subs.length && diff !== 0; i++) {
                const delta = diff > 0 ? Math.min(stepBase, diff) : -Math.min(stepBase, Math.abs(diff));
                if (delta < 0 && subs[i].duration_mins + delta < minPerSub) continue;
                subs[i].duration_mins += delta;
                diff -= delta;
                changedInPass = true;
            }
            if (!changedInPass) {
                // Relax minimum down to 1 min if needed so exact sum is mathematically guaranteed
                for (let i = 0; i < subs.length && diff !== 0; i++) {
                    const delta = diff > 0 ? 1 : -1;
                    if (delta < 0 && subs[i].duration_mins <= 1) continue;
                    subs[i].duration_mins += delta;
                    diff -= delta;
                }
            }
            safety++;
        }
    }

    // Apply exact remainder (1..4 mins) if remainingBudgetMins was not a multiple of 5
    if (exactRemainder !== 0 && subs.length > 0) {
        subs[subs.length - 1].duration_mins += exactRemainder;
    }

    // Mirror `minutes` = `duration_mins` on every subtopic
    subs.forEach((s) => {
        s.duration_mins = Math.max(1, Math.round(Number(s.duration_mins) || 1));
        s.minutes = s.duration_mins;
    });

    return primaryTopics;
}

/**
 * Validates and normalizes AI-generated or fallback topics so that:
 * 1. Every topic's `primary_textbook` is guaranteed to reference a verified/manual Textbook from the course.
 * 2. Every `supporting_references` entry is guaranteed to reference a verified/manual supporting resource.
 * 3. No topic duplicates `topicsToAvoid` (existing manual/AI topics in this week, earlier weeks, or alreadySuggested).
 * 4. Primary (`recommendedTopics`) subtopic `duration_mins` sum EXACTLY to `targetRemainingMins`.
 */
function validateAndCalibrateGroundedTopics({
    rawPrimary = [],
    rawAlternatives = [],
    targetRemainingMins = 180,
    verifiedTextbooks = [],
    verifiedSupporting = [],
    topicsToAvoid = []
}) {
    const verifiedTextbookMap = new Map(verifiedTextbooks.map((b) => [Number(b.reference_id), b]));
    const verifiedSupportingMap = new Map(verifiedSupporting.map((r) => [Number(r.reference_id), r]));
    const avoidTitleSet = new Set(
        (topicsToAvoid || []).map((t) => String(t || '').trim().toLowerCase()).filter(Boolean)
    );
    const seenOutputTitles = new Set();

    const cleanTopicList = (list, isAlt) => {
        return (Array.isArray(list) ? list : [])
            .filter((t) => t && (t.title || t.topic))
            .map((t, idx) => {
                const cleanTitle = String(t.title || t.topic || `Topic ${idx + 1}`).trim();
                const normTitle = cleanTitle.toLowerCase();
                if (!cleanTitle || avoidTitleSet.has(normTitle) || seenOutputTitles.has(normTitle)) {
                    return null;
                }
                seenOutputTitles.add(normTitle);

                const rawSubs = Array.isArray(t.subtopics) ? t.subtopics : [];
                const subs = rawSubs
                    .map((s, sIdx) => {
                        if (typeof s === 'string') {
                            return {
                                id: `ai-sub-${Date.now()}-${isAlt ? 'alt' : 'rec'}-${idx}-${sIdx}-${Math.random().toString(36).slice(2, 6)}`,
                                title: s.trim(),
                                duration_mins: 30,
                                minutes: 30,
                                checked: !isAlt
                            };
                        }
                        const rawMin = Number(s.duration_mins ?? s.minutes ?? s.weight ?? s.duration ?? 30);
                        const roundedMin = Math.max(5, Math.round(rawMin / 5) * 5);
                        return {
                            id: s.id || `ai-sub-${Date.now()}-${isAlt ? 'alt' : 'rec'}-${idx}-${sIdx}-${Math.random().toString(36).slice(2, 6)}`,
                            title: String(s.title || s.name || '').trim(),
                            duration_mins: roundedMin,
                            minutes: roundedMin,
                            checked: !isAlt
                        };
                    })
                    .filter((s) => Boolean(s.title));

                if (subs.length === 0) return null;

                const primaryTextbook = resolveValidatedPrimaryTextbook(
                    t.primary_textbook || t.primaryTextbook,
                    cleanTitle,
                    subs.map((s) => s.title),
                    verifiedTextbooks,
                    verifiedTextbookMap
                );
                if (!primaryTextbook) return null;

                const supportingReferences = resolveValidatedSupportingRefs(
                    t.supporting_references || t.supportingReferences,
                    verifiedSupportingMap
                );

                return {
                    id: t.id || `ai-topic-${Date.now()}-${isAlt ? 'alt' : 'rec'}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
                    title: cleanTitle,
                    isAlternative: Boolean(isAlt),
                    checked: !isAlt,
                    primary_textbook: primaryTextbook,
                    supporting_references: supportingReferences,
                    subtopics: subs
                };
            })
            .filter(Boolean);
    };

    const primaryTopics = cleanTopicList(rawPrimary, false);
    const alternativeTopics = cleanTopicList(rawAlternatives, true);

    if (targetRemainingMins > 0 && primaryTopics.length > 0) {
        rebalancePrimaryTopicsToExactBudget(primaryTopics, targetRemainingMins);
    }

    const withTotals = (t) => {
        const total = t.subtopics.reduce((acc, s) => acc + (Number(s.duration_mins) || 0), 0);
        return {
            ...t,
            duration_mins: total,
            totalMinutes: total
        };
    };

    return {
        recommendedTopics: primaryTopics.map(withTotals),
        alternativeTopics: alternativeTopics.map(withTotals)
    };
}

/**
 * Builds a concise verified TOC digest for the Gemini prompt, strictly containing
 * ONLY verified/manual Textbooks and Supporting References.
 */
function buildVerifiedTocPromptSection(verifiedTextbooks, verifiedSupporting) {
    const lines = [];

    lines.push('=== VERIFIED COURSE TEXTBOOKS (MANDATORY PRIMARY BASIS — EVERY TOPIC MUST CITE ONE) ===');
    for (const book of verifiedTextbooks) {
        lines.push(`[TEXTBOOK reference_id=${book.reference_id}] "${book.title}"${book.author ? ` by ${book.author}` : ''}${book.publication_year ? ` (${book.publication_year})` : ''} [TOC: ${book.toc_status}]`);
        const entries = (book.toc_entries || []).slice(0, 30);
        for (const entry of entries) {
            const chapLabel = formatTocCitation(entry);
            const secPreview = Array.isArray(entry.sections) && entry.sections.length > 0
                ? ` — Sections: ${entry.sections.slice(0, 8).join('; ')}`
                : '';
            lines.push(`   * ${chapLabel}${secPreview}`);
        }
    }

    if (verifiedSupporting.length > 0) {
        lines.push('');
        lines.push('=== VERIFIED SUPPORTING REFERENCES (OER / ONLINE RESOURCES — OPTIONAL SUPPLEMENT ONLY, NEVER SOLE BASIS) ===');
        for (const sup of verifiedSupporting) {
            lines.push(`[${sup.type.toUpperCase()} reference_id=${sup.reference_id}] "${sup.title}"${sup.author ? ` by ${sup.author}` : ''}`);
            const entries = (sup.toc_entries || []).slice(0, 15);
            for (const entry of entries) {
                lines.push(`   * ${formatTocCitation(entry)}`);
            }
        }
    } else {
        lines.push('');
        lines.push('=== VERIFIED SUPPORTING REFERENCES: None available (omit or leave supporting_references as []) ===');
    }

    return lines.join('\n');
}

/**
 * Deterministic, strictly TOC-grounded fallback synthesizer used when GEMINI_API_KEY
 * is not configured or Gemini is unreachable.
 * NEVER hallucinates chapters: constructs topics & subtopics strictly from the real
 * verified/manual Textbook `toc_entries` and attaches matching verified OER/OR supporting citations.
 */
function generateTocGroundedFallbackTopics({
    verifiedTextbooks = [],
    verifiedSupporting = [],
    selectedIlos = [],
    coDescription = '',
    weekNumber = 1,
    targetRemainingMins = 180,
    topicsToAvoid = [],
    avoidSubtopics = []
}) {
    const avoidTopicSet = new Set(
        (topicsToAvoid || []).map((t) => String(t || '').trim().toLowerCase()).filter(Boolean)
    );
    const avoidSubSet = new Set(
        (avoidSubtopics || []).map((s) => String(s || '').trim().toLowerCase()).filter(Boolean)
    );

    const iloContext = `${coDescription} ${(selectedIlos || []).join(' ')}`;

    // Collect candidate chapter entries across all verified textbooks
    const chapterCandidates = [];
    verifiedTextbooks.forEach((book, bIdx) => {
        const entries = Array.isArray(book.toc_entries) ? book.toc_entries : [];
        entries.forEach((entry, eIdx) => {
            const title = String(entry.title || '').trim();
            if (!title) return;
            const norm = title.toLowerCase();
            if (avoidTopicSet.has(norm)) return;

            const citation = formatTocCitation(entry);
            const rawSections = (Array.isArray(entry.sections) ? entry.sections : [])
                .map((s) => String(s || '').trim())
                .filter((s) => Boolean(s) && !avoidSubSet.has(s.toLowerCase()));

            // Relevance score combines ILO keyword match + gentle sequential progression by weekNumber
            const overlap = scoreKeywordOverlap(iloContext, `${title} ${rawSections.join(' ')}`);
            const idealIdx = Math.max(0, (Number(weekNumber) - 1) * 2);
            const seqDistance = Math.abs(eIdx - idealIdx);
            const score = overlap * 3 - seqDistance * 0.25 - bIdx * 0.1;

            chapterCandidates.push({
                book,
                entry,
                citation,
                title,
                rawSections,
                score,
                eIdx
            });
        });
    });

    // Sort by relevance + sequential fit
    chapterCandidates.sort((a, b) => b.score - a.score || a.eIdx - b.eIdx);

    const desiredPrimaryCount = targetRemainingMins <= 90 ? 1 : (targetRemainingMins <= 240 ? 2 : 2);
    const desiredSubCountPerTopic = targetRemainingMins <= 60 ? 2 : (targetRemainingMins <= 180 ? 3 : 4);

    const buildTopicFromCandidate = (cand) => {
        let subTitles = cand.rawSections.slice(0, desiredSubCountPerTopic);
        if (subTitles.length === 0) {
            // If the verified TOC only listed chapter titles without subsections, derive transparent chapter study components
            subTitles = [
                `Core Concepts & Principles: ${cand.title}`,
                `Applied Analysis & Guided Examples (${cand.entry.chapter || 'Chapter Focus'})`,
                `Synthesis & Outcome Practice: ${cand.title}`
            ].slice(0, Math.min(desiredSubCountPerTopic, 3));
        }

        // Find up to 1 relevant verified supporting OER/OR reference
        const supportingRefs = [];
        if (verifiedSupporting.length > 0) {
            let bestSup = null;
            let bestSupScore = 0;
            let bestSupSec = '';
            for (const sup of verifiedSupporting) {
                for (const sEntry of (sup.toc_entries || [])) {
                    const sc = scoreKeywordOverlap(`${cand.title} ${subTitles.join(' ')}`, `${sup.title} ${sEntry.title} ${(sEntry.sections || []).join(' ')}`);
                    if (sc > bestSupScore) {
                        bestSupScore = sc;
                        bestSup = sup;
                        bestSupSec = formatTocCitation(sEntry);
                    }
                }
            }
            if (bestSup && bestSupScore > 0) {
                supportingRefs.push({
                    reference_id: Number(bestSup.reference_id),
                    type: bestSup.type,
                    title: bestSup.title,
                    section: bestSupSec
                });
            }
        }

        const baseMin = Math.max(10, Math.round((targetRemainingMins / Math.max(1, desiredPrimaryCount * subTitles.length)) / 5) * 5);

        return {
            title: cand.title,
            primary_textbook: {
                reference_id: Number(cand.book.reference_id),
                title: cand.book.title,
                chapter_or_section: cand.citation
            },
            supporting_references: supportingRefs,
            subtopics: subTitles.map((st) => ({
                title: st,
                duration_mins: baseMin
            }))
        };
    };

    const rawPrimary = [];
    const rawAlternatives = [];
    const usedTitles = new Set(avoidTopicSet);

    for (const cand of chapterCandidates) {
        const key = cand.title.toLowerCase();
        if (usedTitles.has(key)) continue;
        usedTitles.add(key);

        const built = buildTopicFromCandidate(cand);
        if (rawPrimary.length < desiredPrimaryCount) {
            rawPrimary.push(built);
        } else if (rawAlternatives.length < 2) {
            rawAlternatives.push(built);
        }
        if (rawPrimary.length >= desiredPrimaryCount && rawAlternatives.length >= 2) break;
    }

    // If all chapter titles were already used in this/previous weeks, allow a deeper chapter focus suffix
    if (rawPrimary.length === 0 && verifiedTextbooks.length > 0) {
        const firstBook = verifiedTextbooks[0];
        const firstEntry = (firstBook.toc_entries || [])[0];
        if (firstEntry) {
            rawPrimary.push({
                title: `${firstEntry.title} — Applied Extension (Week ${weekNumber})`,
                primary_textbook: {
                    reference_id: Number(firstBook.reference_id),
                    title: firstBook.title,
                    chapter_or_section: formatTocCitation(firstEntry)
                },
                supporting_references: [],
                subtopics: [
                    { title: `Deep Dive & Problem Solving: ${firstEntry.title}`, duration_mins: Math.max(10, Math.round(targetRemainingMins / 2)) },
                    { title: `Case Application & Review: ${firstEntry.title}`, duration_mins: Math.max(10, Math.round(targetRemainingMins / 2)) }
                ]
            });
        }
    }

    return validateAndCalibrateGroundedTopics({
        rawPrimary,
        rawAlternatives,
        targetRemainingMins,
        verifiedTextbooks,
        verifiedSupporting,
        topicsToAvoid
    });
}

// AI-Driven Topic & Subtopic Suggestions with Dynamic Remaining-Time Equalizer & Verified Textbook-TOC Grounding
async function suggestTopicsWithAI(req, res) {
    try {
        const {
            iloId,
            weekId,
            courseId: bodyCourseId,
            pcOfferingId: bodyPcOfferingId,
            courseCode,
            courseDescription: bodyCourseDescription,
            coNumber: bodyCoNumber,
            coDescription: bodyCoDescription,
            weekNumber: bodyWeekNumber,
            weeklyHours: bodyWeeklyHours,
            weeklyBudgetMins: bodyWeeklyBudgetMins,
            alreadyAllocatedMins: bodyAlreadyAllocatedMins,
            remainingBudgetMins: bodyRemainingBudgetMins,
            isOrientation: bodyIsOrientation,
            selectedIlos = [],
            previousWeeksTopics = [],
            existingWeekTopics = [],
            currentTopics = [],
            alreadySuggested = [],
            isLoadMore = false,
            replacementMode = false,
            useSample = false
        } = req.body || {};

        const targetId = weekId || iloId;
        const isOrientation = parseIsOrientation(bodyIsOrientation);

        // 1. Fetch academic context & effective weekly hours from DB (Refinement #3)
        let dbCourseId = bodyCourseId ? Number(bodyCourseId) : null;
        let dbPcOfferingId = bodyPcOfferingId ? Number(bodyPcOfferingId) : null;
        let dbCourseDescription = '';
        let dbCoDescription = '';
        let dbCourseTitle = '';
        let dbCourseNo = courseCode || '';
        let dbCredit = '';
        let dbContactHrs = '';
        let dbEffectiveWeeklyHours = isOrientation ? 2 : 5;
        let dbCoIlos = [];

        if (targetId) {
            try {
                const week = await resolveWeekRecord(targetId);
                if (week && week.co_id) {
                    const co = await CourseOutcome.findByPk(week.co_id, {
                        include: [{
                            model: ProgramCourseOffering,
                            as: 'ProgramCourseOffering',
                            include: [{ model: Course, as: 'Course' }]
                        }]
                    });
                    if (co) {
                        dbPcOfferingId = co.pc_offering_id || dbPcOfferingId;
                        dbCoDescription = (co.co_description || '').replace(/\s+/g, ' ').trim();
                        const pco = co.ProgramCourseOffering;
                        if (pco) {
                            dbCourseId = pco.course_id || dbCourseId;
                            dbCourseDescription = (pco.course_description || pco.description || '').replace(/\s+/g, ' ').trim();
                            if (pco.Course) {
                                const c = pco.Course;
                                dbCourseNo = c.course_no || dbCourseNo;
                                dbCourseTitle = c.course_title || '';
                                dbCredit = c.credit || '';
                                dbContactHrs = c.contact_hrs || '';
                                const hrsInfo = computeWeeklyContactHoursFromCourse(c);

                                // Respect effective weekly hours (Week 1 CO 1 splits with Course Orientation)
                                const [allCos, coWeeks] = await Promise.all([
                                    CourseOutcome.findAll({
                                        where: { pc_offering_id: co.pc_offering_id },
                                        attributes: ['co_id'],
                                        order: [['co_id', 'ASC']],
                                        raw: true
                                    }),
                                    Week.findAll({
                                        where: { co_id: co.co_id },
                                        attributes: ['week_id', 'hours'],
                                        order: [['week_id', 'ASC']],
                                        raw: true
                                    })
                                ]);
                                const isFirstCo = allCos.length > 0 && Number(allCos[0].co_id) === Number(co.co_id);
                                const isFirstWeekOfCo = coWeeks.length > 0 && Number(coWeeks[0].week_id) === Number(week.week_id);
                                const rawWeekHours = Number(week.hours) || hrsInfo.totalWeeklyHours;

                                if (isOrientation) {
                                    dbEffectiveWeeklyHours = hrsInfo.orientationHours;
                                } else if (isFirstCo && isFirstWeekOfCo) {
                                    dbEffectiveWeeklyHours = Math.max(1, rawWeekHours - hrsInfo.orientationHours);
                                } else {
                                    dbEffectiveWeeklyHours = rawWeekHours;
                                }
                            }
                        }
                        const coIlos = await IntendedLearningOutcome.findAll({
                            where: { co_id: co.co_id, is_orientation: isOrientation },
                            order: [['ilo_id', 'ASC']]
                        });
                        dbCoIlos = coIlos.map((i) => (i.description || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
                    }
                }
            } catch (dbErr) {
                console.warn('Could not query full context from DB:', dbErr.message);
            }
        }

        // 2. Dynamic Remaining-Time Budget Math (Refinements #1 & #3)
        const effectiveWeeklyHours = Number(bodyWeeklyHours) > 0
            ? Number(bodyWeeklyHours)
            : (dbEffectiveWeeklyHours > 0 ? dbEffectiveWeeklyHours : (isOrientation ? 2 : 3));

        const weeklyBudgetMins = Number.isFinite(Number(bodyWeeklyBudgetMins)) && Number(bodyWeeklyBudgetMins) > 0
            ? Math.round(Number(bodyWeeklyBudgetMins))
            : Math.round(effectiveWeeklyHours * 60);

        // Normalize existingWeekTopics (includes ALL existing topics in this week: manual, continued, & previously imported AI)
        const normalizedExistingTopics = (Array.isArray(existingWeekTopics) && existingWeekTopics.length > 0
            ? existingWeekTopics
            : (Array.isArray(currentTopics) ? currentTopics : [])
        ).map((t) => {
            if (typeof t === 'string') {
                return { title: t.trim(), subtopics: [], totalMinutes: 0 };
            }
            const subs = Array.isArray(t?.subtopics) ? t.subtopics : [];
            const subTitles = subs.map((s) => (typeof s === 'string' ? s : s?.title)).map((x) => String(x || '').trim()).filter(Boolean);
            const computedMins = subs.reduce(
                (acc, s) => acc + (Number(s?.duration_mins ?? s?.estimated_minutes ?? s?.minutes) > 0 ? Math.round(Number(s?.duration_mins ?? s?.estimated_minutes ?? s?.minutes)) : 0),
                0
            );
            return {
                title: String(t?.title || '').trim(),
                subtopics: subTitles,
                totalMinutes: Number(t?.totalMinutes) > 0 ? Math.round(Number(t.totalMinutes)) : computedMins
            };
        }).filter((t) => Boolean(t.title) || t.totalMinutes > 0);

        const inferredAllocatedMins = normalizedExistingTopics.reduce((sum, t) => sum + (t.totalMinutes || 0), 0);
        const alreadyAllocatedMins = Number.isFinite(Number(bodyAlreadyAllocatedMins)) && Number(bodyAlreadyAllocatedMins) >= 0
            ? Math.round(Number(bodyAlreadyAllocatedMins))
            : inferredAllocatedMins;

        const computedRemainingMins = Math.max(0, weeklyBudgetMins - alreadyAllocatedMins);
        const remainingBudgetMins = Number.isFinite(Number(bodyRemainingBudgetMins)) && Number(bodyRemainingBudgetMins) >= 0
            ? Math.min(weeklyBudgetMins, Math.round(Number(bodyRemainingBudgetMins)))
            : computedRemainingMins;
        const overflowMins = Math.max(0, alreadyAllocatedMins - weeklyBudgetMins);

        // Edge-case guards (unless loading more alternatives or explicitly requesting replacement alternatives)
        if (!isLoadMore && !replacementMode) {
            if (overflowMins > 0) {
                return res.status(400).json({
                    error: 'WEEK_OVER_BUDGET',
                    message: `This week is currently over budget by ${overflowMins} mins (${alreadyAllocatedMins} / ${weeklyBudgetMins} mins). Reduce existing subtopic durations before requesting AI suggestions.`,
                    weeklyBudgetMins,
                    alreadyAllocatedMins,
                    remainingBudgetMins: 0,
                    overflowMins
                });
            }
            if (remainingBudgetMins <= 0) {
                return res.status(400).json({
                    error: 'WEEK_BUDGET_FULL',
                    message: `Weekly time budget is already fully allocated (${alreadyAllocatedMins} / ${weeklyBudgetMins} mins). Remove or shorten existing subtopics to request additional AI suggestions.`,
                    weeklyBudgetMins,
                    alreadyAllocatedMins,
                    remainingBudgetMins: 0,
                    overflowMins: 0
                });
            }
        }

        const calibrationTargetMins = remainingBudgetMins > 0 ? remainingBudgetMins : weeklyBudgetMins;

        // 3. Authoritative Backend Load of Course References & Verified TOCs
        let loadedRefs = await loadCourseReferencesWithCache({
            weekId: targetId,
            courseId: dbCourseId,
            pcOfferingId: dbPcOfferingId,
            courseNo: dbCourseNo
        });

        // Auto-populate TOC cache once if any course reference has never been checked yet
        const hasUncachedRefs = loadedRefs.references.some((r) => !r.tocCache);
        if (hasUncachedRefs && loadedRefs.references.length > 0) {
            await resolveCourseReferencesTocs({
                weekId: targetId,
                courseId: loadedRefs.courseId || dbCourseId,
                pcOfferingId: dbPcOfferingId,
                courseNo: loadedRefs.courseNo || dbCourseNo,
                forceRefresh: false
            });
            loadedRefs = await loadCourseReferencesWithCache({
                weekId: targetId,
                courseId: loadedRefs.courseId || dbCourseId,
                pcOfferingId: dbPcOfferingId,
                courseNo: loadedRefs.courseNo || dbCourseNo
            });
        }

        const allFormattedRefs = loadedRefs.references.map((r) => formatReferenceWithToc(r, r.tocCache));
        const verifiedTextbooks = allFormattedRefs.filter((r) => r.is_textbook && r.is_verified);
        const verifiedSupporting = allFormattedRefs.filter((r) => !r.is_textbook && r.is_verified);
        const excludedReferences = allFormattedRefs
            .filter((r) => !r.is_verified)
            .map((r) => ({
                reference_id: r.reference_id,
                title: r.title,
                type: r.type,
                is_textbook: r.is_textbook,
                toc_status: r.toc_status,
                reason: 'toc_not_found'
            }));

        // Mandatory Textbook Enforcement Rule
        if (verifiedTextbooks.length === 0) {
            return res.status(400).json({
                error: 'NO_VERIFIED_TEXTBOOK_TOC',
                message: 'At least one course Textbook with a verified Table of Contents is required before generating AI topic suggestions (OER and Online Resources are supporting references only).',
                excludedReferences,
                weeklyBudgetMins,
                alreadyAllocatedMins,
                remainingBudgetMins
            });
        }

        // 4. Assemble Academic, Sequential & Duplication-Prevention Context
        const effectiveCourseDescription = (bodyCourseDescription || dbCourseDescription || '').trim();
        const effectiveCoDescription = (bodyCoDescription || dbCoDescription || '').trim();
        const effectiveWeekNumber = Number(bodyWeekNumber) || 1;

        const selectedIloDescriptions = Array.isArray(selectedIlos) && selectedIlos.length > 0
            ? selectedIlos.map((i) => (typeof i === 'string' ? i : (i.description || ''))).map((s) => s.trim()).filter(Boolean)
            : dbCoIlos;

        const formattedPrevWeeks = (effectiveWeekNumber > 1 && Array.isArray(previousWeeksTopics))
            ? previousWeeksTopics
                .filter((pw) => Number(pw.weekNumber) < effectiveWeekNumber && Array.isArray(pw.topics) && pw.topics.length > 0)
                .sort((a, b) => Number(a.weekNumber) - Number(b.weekNumber))
            : [];

        const prevWeekTopicTitles = [];
        const prevWeekSubtopicTitles = [];
        const prevWeekSummaryLines = [];
        formattedPrevWeeks.forEach((pw) => {
            const topicSummaries = [];
            (pw.topics || []).forEach((t) => {
                if (t && t.title) {
                    prevWeekTopicTitles.push(t.title);
                    const subNames = Array.isArray(t.subtopics)
                        ? t.subtopics.map((s) => (typeof s === 'string' ? s : s?.title)).filter(Boolean)
                        : [];
                    prevWeekSubtopicTitles.push(...subNames);
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

        const existingThisWeekSummaryLines = normalizedExistingTopics
            .filter((t) => Boolean(t.title))
            .map((t) =>
                t.subtopics.length > 0
                    ? `${t.title} (${t.totalMinutes} mins; Subtopics: ${t.subtopics.join('; ')})`
                    : `${t.title} (${t.totalMinutes} mins)`
            );

        const existingThisWeekSubtopics = normalizedExistingTopics.flatMap((t) => t.subtopics);

        const topicsToAvoid = [
            ...normalizedExistingTopics.map((t) => t.title),
            ...(Array.isArray(alreadySuggested) ? alreadySuggested : []),
            ...prevWeekTopicTitles
        ].filter(Boolean);

        const avoidSubtopics = [...existingThisWeekSubtopics, ...prevWeekSubtopicTitles].filter(Boolean);

        const contextInfo = {
            courseId: loadedRefs.courseId || dbCourseId,
            courseNo: dbCourseNo,
            courseTitle: dbCourseTitle,
            courseDescription: effectiveCourseDescription,
            coNumber: bodyCoNumber ?? (isOrientation ? 0 : 1),
            coDescription: effectiveCoDescription,
            weekNumber: effectiveWeekNumber,
            weeklyHours: effectiveWeeklyHours,
            weeklyBudgetMins,
            alreadyAllocatedMins,
            remainingBudgetMins,
            overflowMins,
            targetWeeklyMinutes: calibrationTargetMins,
            credit: dbCredit,
            contactHrs: dbContactHrs,
            selectedIlos: selectedIloDescriptions,
            previousWeeksCount: formattedPrevWeeks.length,
            existingWeekTopicsCount: normalizedExistingTopics.length,
            verifiedTextbooksCount: verifiedTextbooks.length,
            verifiedSupportingCount: verifiedSupporting.length,
            excludedReferencesCount: excludedReferences.length
        };

        const verifiedReferencesSummary = {
            verifiedTextbooks: verifiedTextbooks.map((b) => ({
                reference_id: b.reference_id,
                title: b.title,
                toc_status: b.toc_status,
                chapterCount: b.chapterCount
            })),
            verifiedSupporting: verifiedSupporting.map((s) => ({
                reference_id: s.reference_id,
                type: s.type,
                title: s.title,
                toc_status: s.toc_status,
                chapterCount: s.chapterCount
            })),
            excludedCount: excludedReferences.length
        };

        // 5. Call Multi-Provider AI Fallback Chain (Gemini -> Groq -> Mistral) with strict TOC-grounded & remaining-budget prompt
        const aiCaps = !useSample ? getProviderCapabilities() : { hasAnyGenerationProvider: false };
        if (aiCaps.hasAnyGenerationProvider) {
            const tocContextBlock = buildVerifiedTocPromptSection(verifiedTextbooks, verifiedSupporting);
            const recommendedCountHint = calibrationTargetMins <= 90 ? '1' : '1 to 2';

            const prompt = `You are an expert university curriculum architect designing textbook-grounded, time-calibrated weekly topics and subtopics for a syllabus learning plan.

COURSE & WEEK CONTEXT:
1. Course: ${dbCourseNo || 'N/A'} - ${dbCourseTitle || 'University Course'}
2. Course Description: "${effectiveCourseDescription || 'Tertiary-level academic course.'}"
3. Course Outcome (CO ${contextInfo.coNumber}): "${effectiveCoDescription || 'Core competency and applied mastery.'}"
4. Selected Intended Learning Outcomes (ILOs):
${selectedIloDescriptions.length > 0 ? selectedIloDescriptions.map((d, i) => `   - ILO ${i + 1}: "${d}"`).join('\n') : '   - General mastery of the Course Outcome.'}
5. Current Week: Week ${effectiveWeekNumber}${isOrientation ? ' (Course Orientation)' : ''}
6. LIVE REMAINING TIME BUDGET TO FILL:
   - Total Weekly Budget: ${weeklyBudgetMins} minutes (${effectiveWeeklyHours} hrs)
   - Already Allocated in This Week: ${alreadyAllocatedMins} minutes
   - EXACT REMAINING TARGET FOR RECOMMENDED TOPICS: ${calibrationTargetMins} minutes
${existingThisWeekSummaryLines.length > 0
    ? `\n7. TOPICS ALREADY IN THIS WEEK (DO NOT DUPLICATE — suggest complementary topics that fill the remaining ${calibrationTargetMins} mins):\n${existingThisWeekSummaryLines.map((l) => `   - ${l}`).join('\n')}`
    : '\n7. Topics Already in This Week: None yet.'}
${effectiveWeekNumber > 1 && prevWeekSummaryLines.length > 0
    ? `\n8. PREVIOUS WEEKS' TOPICS (Weeks 1 to ${effectiveWeekNumber - 1} — build sequentially without repeating):\n${prevWeekSummaryLines.map((l) => `   - ${l}`).join('\n')}`
    : ''}
${Array.isArray(alreadySuggested) && alreadySuggested.length > 0
    ? `\nDO NOT REPEAT PREVIOUSLY SUGGESTED TITLES:\n${alreadySuggested.map((t) => `- ${t}`).join('\n')}`
    : ''}

${tocContextBlock}

STRICT PEDAGOGICAL, ANTI-HALLUCINATION & TIME RULES:
1. MANDATORY TEXTBOOK GROUNDING: Every suggested topic in both "recommendedTopics" and "alternativeTopics" MUST be grounded in an actual chapter/section listed above from one of the VERIFIED COURSE TEXTBOOKS. Set "primary_textbook" to that exact textbook's integer "reference_id", "title", and real "chapter_or_section" from its TOC above.
2. OPTIONAL SUPPORTING REFERENCES: You may optionally attach 0 to 2 VERIFIED SUPPORTING REFERENCES (OER / Online Resources) listed above in "supporting_references" alongside the primary textbook, NEVER as the sole reference. Never invent or reference IDs not listed above.
3. EXACT TIME CALIBRATION: Assign each subtopic a realistic integer "duration_mins" in clean 5-minute increments (e.g., 15, 20, 25, 30, 35, 40, 45, 60). The sum of ALL subtopic "duration_mins" across "recommendedTopics" MUST equal EXACTLY ${calibrationTargetMins} minutes!
4. Generate:
   - "recommendedTopics": ${recommendedCountHint} complementary primary topic(s) (2 to 4 subtopics each) whose subtopic "duration_mins" sum to EXACTLY ${calibrationTargetMins} minutes.
   - "alternativeTopics": 2 optional alternative topics grounded in other chapters of the verified textbooks above.

Return strictly valid JSON matching this schema:
{
  "recommendedTopics": [
    {
      "title": "Topic Title Grounded in Verified Textbook Chapter",
      "duration_mins": ${calibrationTargetMins},
      "primary_textbook": {
        "reference_id": ${verifiedTextbooks[0].reference_id},
        "title": "${verifiedTextbooks[0].title.replace(/"/g, '\\"')}",
        "chapter_or_section": "Exact Chapter & Title from Verified TOC"
      },
      "supporting_references": [
        {
          "reference_id": 12,
          "type": "Open Educational Resources",
          "title": "Supporting Resource Title",
          "section": "Exact Verified Section"
        }
      ],
      "subtopics": [
        { "title": "Specific Subtopic Title", "duration_mins": 30 }
      ]
    }
  ],
  "alternativeTopics": []
}`;

            const aiRes = await generateJsonWithFallback({
                prompt,
                systemPrompt: 'You are an expert university curriculum architect. Return strictly valid JSON with no extra text or markdown.',
                temperature: 0.5,
                maxTokens: 4096,
                taskLabel: `topic-suggest-w${effectiveWeekNumber}`
            });

            if (aiRes.ok && aiRes.data) {
                const parsed = aiRes.data;
                const recRaw = Array.isArray(parsed.recommendedTopics)
                    ? parsed.recommendedTopics
                    : (Array.isArray(parsed.topics) ? parsed.topics.slice(0, 2) : []);
                const altRaw = Array.isArray(parsed.alternativeTopics)
                    ? parsed.alternativeTopics
                    : (Array.isArray(parsed.topics) ? parsed.topics.slice(2, 4) : []);

                const validated = validateAndCalibrateGroundedTopics({
                    rawPrimary: recRaw,
                    rawAlternatives: altRaw,
                    targetRemainingMins: calibrationTargetMins,
                    verifiedTextbooks,
                    verifiedSupporting,
                    topicsToAvoid
                });

                if (validated.recommendedTopics.length > 0 || (isLoadMore && validated.alternativeTopics.length > 0)) {
                    console.log(`[AI Topic Suggest] Generated textbook-grounded topics via ${aiRes.provider}/${aiRes.model} (target=${calibrationTargetMins}m)`);
                    return res.json({
                        recommendedTopics: validated.recommendedTopics,
                        alternativeTopics: validated.alternativeTopics,
                        topics: [...validated.recommendedTopics, ...validated.alternativeTopics],
                        weeklyBudgetMins,
                        alreadyAllocatedMins,
                        remainingBudgetMins,
                        overflowMins,
                        targetWeeklyMinutes: calibrationTargetMins,
                        weeklyHours: effectiveWeeklyHours,
                        verifiedReferencesSummary,
                        excludedReferences,
                        context: contextInfo,
                        usedFallback: false,
                        isSample: false,
                        provider: aiRes.provider,
                        model: aiRes.model
                    });
                }
            }
        }

        // 6. Strictly Verified-TOC-Grounded Deterministic Fallback (zero hallucinated chapters!)
        const fallback = generateTocGroundedFallbackTopics({
            verifiedTextbooks,
            verifiedSupporting,
            selectedIlos: selectedIloDescriptions,
            coDescription: effectiveCoDescription,
            weekNumber: effectiveWeekNumber,
            targetRemainingMins: calibrationTargetMins,
            topicsToAvoid,
            avoidSubtopics
        });

        return res.json({
            recommendedTopics: fallback.recommendedTopics,
            alternativeTopics: fallback.alternativeTopics,
            topics: [...fallback.recommendedTopics, ...fallback.alternativeTopics],
            weeklyBudgetMins,
            alreadyAllocatedMins,
            remainingBudgetMins,
            overflowMins,
            targetWeeklyMinutes: calibrationTargetMins,
            weeklyHours: effectiveWeeklyHours,
            verifiedReferencesSummary,
            excludedReferences,
            context: contextInfo,
            usedFallback: true,
            isSample: false,
            provider: 'deterministic-fallback',
            model: 'toc-grounded-synthesizer'
        });

    } catch (err) {
        console.error('suggestTopicsWithAI error:', err);
        return res.status(500).json({
            error: 'AI_SUGGESTION_FAILED',
            message: err.message || 'Error occurred while generating topic suggestions'
        });
    }
}

module.exports = {
    getWeekContext,
    getAvailableTopics,
    getAssignedTopics,
    getPreviousTopics,
    assignTopicsToILO,
    suggestTopicsWithAI,
    validateAndCalibrateGroundedTopics,
    rebalancePrimaryTopicsToExactBudget
};


