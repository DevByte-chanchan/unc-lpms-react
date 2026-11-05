// controllers/courseCoverageController.js
const {
    Course,
    ProgramCourseOffering,
    CourseOutcome,
    IntendedLearningOutcome,
    Week,
    Topic,
    Subtopic,
    TeachingAndLearningActivity,
    TLAAssessment,
    Reference,
    WeeklyReference
} = require('../models');

exports.getCourseCoverage = async (req, res, next) => {
    const { pcId, revNum } = req.params;

    if (!pcId || !revNum) {
        return res.status(400).json({
            error: "Missing version identification parameters. Please verify your API endpoint route configurations."
        });
    }

    try {
        // 1. Fetch ProgramCourseOffering + Course to compute lecture/lab contact hours
        let pco = await ProgramCourseOffering.findOne({
            where: { pc_offering_id: pcId, revision_number: revNum },
            include: Course ? [{ model: Course, attributes: ['course_id', 'course_no', 'credit', 'contact_hrs'] }] : []
        });
        if (!pco) {
            pco = await ProgramCourseOffering.findOne({
                where: { pc_offering_id: pcId },
                include: Course ? [{ model: Course, attributes: ['course_id', 'course_no', 'credit', 'contact_hrs'] }] : []
            });
        }

        const course = pco && pco.Course ? pco.Course : {};
        let lecCredits = 0;
        let labCredits = 0;
        if (course.credit) {
            const lecMatch = course.credit.match(/(\d+)\s*LEC/i);
            const labMatch = course.credit.match(/(\d+)\s*LAB/i);
            if (lecMatch) lecCredits = parseInt(lecMatch[1], 10);
            if (labMatch) labCredits = parseInt(labMatch[1], 10);
        }
        if (lecCredits === 0 && labCredits === 0) {
            lecCredits = 2;
            labCredits = 1;
        }

        let lecContactHours = lecCredits * 1;
        let labContactHours = labCredits * 3;
        if (course.contact_hrs) {
            const lecHrsMatch = course.contact_hrs.match(/(\d+)\s*Hrs?\s*Lec/i);
            const labHrsMatch = course.contact_hrs.match(/(\d+)\s*Hrs?\s*Lab/i);
            if (lecHrsMatch) lecContactHours = parseInt(lecHrsMatch[1], 10);
            if (labHrsMatch) labContactHours = parseInt(labHrsMatch[1], 10);
        }

        const totalWeeklyContactHours = (lecContactHours + labContactHours) || 5;
        const defaultOrientationHours = (lecContactHours > 0 && lecContactHours < totalWeeklyContactHours)
            ? lecContactHours
            : Math.min(2, Math.max(1, totalWeeklyContactHours - 1));

        // 2. Get CourseOutcome records linked to this pc_offering_id
        const courseOutcomes = await CourseOutcome.findAll({
            where: { pc_offering_id: pcId },
            order: [['co_id', 'ASC']]
        });

        const coIds = courseOutcomes.map(co => co.co_id || co.id);
        if (coIds.length === 0) {
            return res.status(200).json({
                orientation: null,
                courseOutcomes: [],
                ilos: [],
                topics: [],
                assessments: []
            });
        }

        // 3. Retrieve all IntendedLearningOutcomes and Weeks for these COs
        const [ilos, weeks] = await Promise.all([
            IntendedLearningOutcome.findAll({
                where: { co_id: coIds },
                attributes: ['ilo_id', 'co_id', 'description', 'is_orientation', 'hours', 'weeks'],
                order: [['co_id', 'ASC'], ['ilo_id', 'ASC']]
            }),
            Week.findAll({
                where: { co_id: coIds },
                attributes: ['week_id', 'co_id', 'hours'],
                order: [['co_id', 'ASC'], ['week_id', 'ASC']]
            })
        ]);

        const weekIds = weeks.map(w => w.week_id);

        // 4. Fetch Subtopics (with parent Topic), TLAs, Assessments, and WeeklyReferences (with Reference)
        const [subtopicsData, tlasData, rawReferences] = await Promise.all([
            weekIds.length > 0 && Subtopic
                ? Subtopic.findAll({
                      where: { week_id: weekIds },
                      include: Topic ? [{
                          model: Topic,
                          as: Subtopic.associations && Subtopic.associations.topic ? 'topic' :
                              (Subtopic.associations && Subtopic.associations.Topic ? 'Topic' : undefined),
                          attributes: ['topic_id', 'title']
                      }] : [],
                      order: [['week_id', 'ASC'], ['is_orientation', 'DESC'], ['subtopic_id', 'ASC'], ['sequence_order', 'ASC']]
                  })
                : [],
            weekIds.length > 0 && TeachingAndLearningActivity
                ? TeachingAndLearningActivity.findAll({
                      where: { week_id: weekIds },
                      order: [['week_id', 'ASC'], ['is_orientation', 'DESC'], ['tla_id', 'ASC']]
                  })
                : [],
            weekIds.length > 0 && WeeklyReference && Reference
                ? WeeklyReference.findAll({
                      where: { week_id: weekIds },
                      include: [{
                          model: Reference,
                          required: true,
                          as: WeeklyReference.associations && WeeklyReference.associations.Reference ? 'Reference' :
                              (WeeklyReference.associations && WeeklyReference.associations.reference ? 'reference' : 'Reference')
                      }],
                      order: [['week_id', 'ASC'], ['is_orientation', 'DESC'], ['weekly_reference_id', 'ASC']]
                  })
                : []
        ]);

        const tlaIds = tlasData.map(t => t.tla_id).filter(Boolean);
        const tlaIdToNameMap = new Map();
        tlasData.forEach(t => {
            if (t.tla_id && t.tla_name) {
                tlaIdToNameMap.set(t.tla_id, t.tla_name);
            }
        });

        let rawAssessments = [];
        if (TLAAssessment && tlaIds.length > 0) {
            rawAssessments = await TLAAssessment.findAll({
                where: { tla_id: tlaIds },
                order: [['tla_id', 'ASC'], ['method_id', 'ASC']]
            });
        }

        const compiledAssessments = rawAssessments.map(assess => {
            const assignedTlaName = tlaIdToNameMap.get(assess.tla_id) || '';
            const method = assess.name || assess.assessment_method || assess.assessmentMethod || assess.method_name || '';
            const desc = assess.description || assess.assessment_description || assess.details || '';

            return {
                id: assess.method_id || assess.tla_assessment_id || assess.id,
                tlaId: assess.tla_id,
                iloId: assess.ilo_id || null,
                tlaName: assignedTlaName,
                assessmentMethod: method,
                description: desc,
                period: assess.period || '',
                weight: assess.weight || 0,
                minPassing: assess.min_passing || assess.minPassing || 60
            };
        });

        // 5. Build academic reference prefixes (TB1, OER1, OR1) starting from 1 per category
        const referenceGlobalMap = new Map();
        const typeCounters = {};

        const getInstitutionalPrefix = (typeStr) => {
            if (!typeStr) return 'TB';
            const normalized = typeStr.trim().toLowerCase();
            if (normalized.includes('open') || normalized.includes('oer')) return 'OER';
            if (normalized.includes('online')) return 'OR';
            if (normalized.includes('textbook')) return 'TB';
            if (normalized.includes('reference book') || normalized.includes('reference_book')) return 'RB';
            return 'TB';
        };

        const formattedReferencesBySlice = {};
        rawReferences.forEach(item => {
            const ref = item.Reference || item.reference || item;
            const refId = ref.reference_id || ref.id;
            if (!refId) return;

            const mapKey = `${refId}`;
            let shortTag = '';
            if (referenceGlobalMap.has(mapKey)) {
                shortTag = referenceGlobalMap.get(mapKey);
            } else {
                const prefix = getInstitutionalPrefix(ref.type);
                typeCounters[prefix] = (typeCounters[prefix] || 0) + 1;
                shortTag = `${prefix}${typeCounters[prefix]}`;
                referenceGlobalMap.set(mapKey, shortTag);
            }

            const completeRefString = `${shortTag} - ${ref.title || ref.name || ''}`;
            const sliceKey = `${item.week_id}_${Boolean(item.is_orientation)}`;
            if (!formattedReferencesBySlice[sliceKey]) {
                formattedReferencesBySlice[sliceKey] = [];
            }
            if (!formattedReferencesBySlice[sliceKey].includes(completeRefString)) {
                formattedReferencesBySlice[sliceKey].push(completeRefString);
            }
        });

        // Helper: Build topics + subtopics, TLAs, assessments, and references for a specific (week_id, isOrientation)
        const allCompiledTopics = [];
        const buildWeekSliceContent = (weekId, isOrientation) => {
            const sliceSubtopics = subtopicsData.filter(
                sub => Number(sub.week_id) === Number(weekId) && Boolean(sub.is_orientation) === Boolean(isOrientation)
            );

            // Group subtopics by parent topic_id for this specific week slice
            // (so shared parent topics across multiple weeks retain only this week's subtopics)
            const topicMap = new Map();
            sliceSubtopics.forEach(sub => {
                const tId = sub.topic_id;
                const actualTopic = sub.topic || sub.Topic || {};
                const title = actualTopic.title || actualTopic.name || 'Untitled Topic';

                if (!topicMap.has(tId)) {
                    topicMap.set(tId, {
                        id: `week-${weekId}-${isOrientation ? 'orient' : 'reg'}-topic-${tId}`,
                        topicId: tId,
                        weekId: weekId,
                        isOrientation: Boolean(isOrientation),
                        title: title,
                        subtopics: []
                    });
                }

                topicMap.get(tId).subtopics.push({
                    id: sub.subtopic_id,
                    value: sub.title || '',
                    sequence_order: sub.sequence_order ?? 0
                });
            });

            const sliceTopics = Array.from(topicMap.values());
            sliceTopics.forEach(t => {
                t.subtopics.sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0));
            });

            // Filter TLAs for this (weekId, isOrientation)
            const seenTlaKeys = new Set();
            const sliceTlas = tlasData
                .filter(tla => Number(tla.week_id) === Number(weekId) && Boolean(tla.is_orientation) === Boolean(isOrientation))
                .map(tla => {
                    const name = tla.tla_name || tla.name || tla.tlaName || '';
                    const rawPhase = tla.class_phase || tla.classPhase || tla.phase || 'In-class';
                    const description = tla.tla_description || tla.description || tla.tlaDescription || '';

                    let perfBy = tla.performed_by || tla.performedBy || 'Student';
                    if (perfBy === 'T' || perfBy === 'Instructor' || perfBy === 'I') perfBy = 'Instructor';
                    else if (perfBy === 'S' || perfBy === 'Student') perfBy = 'Student';

                    let normalizedPhase = rawPhase.trim();
                    if (/^pre/i.test(normalizedPhase)) normalizedPhase = 'Pre-class';
                    else if (/^post/i.test(normalizedPhase)) normalizedPhase = 'Post-class';
                    else if (/^in/i.test(normalizedPhase)) normalizedPhase = 'In-class';

                    const duplicationFingerprint = `${tla.tla_id}-${normalizedPhase}-${name}`.toLowerCase();
                    if (seenTlaKeys.has(duplicationFingerprint)) return null;
                    seenTlaKeys.add(duplicationFingerprint);

                    return {
                        id: tla.tla_id,
                        tlaId: tla.tla_id,
                        weekId: tla.week_id,
                        tlaName: name,
                        classPhase: normalizedPhase,
                        performedBy: perfBy,
                        tlaDescription: description,
                        laboratory: Boolean(tla.laboratory || tla.is_lab || tla.is_laboratory)
                    };
                })
                .filter(Boolean);

            // Attach slice TLAs to first topic for legacy consumers if needed
            sliceTopics.forEach((t, idx) => {
                t.tlas = idx === 0 ? sliceTlas : [];
                allCompiledTopics.push(t);
            });

            // Collect assessments linked to this slice's TLAs
            const sliceTlaIds = new Set(sliceTlas.map(t => t.tlaId));
            const seenAssessKeys = new Set();
            const sliceAssessments = [];
            compiledAssessments.forEach(assess => {
                if (sliceTlaIds.has(assess.tlaId)) {
                    const key = `${assess.id}-${assess.assessmentMethod}`.toLowerCase();
                    if (!seenAssessKeys.has(key)) {
                        seenAssessKeys.add(key);
                        sliceAssessments.push(assess);
                    }
                }
            });

            const sliceReferences = formattedReferencesBySlice[`${weekId}_${Boolean(isOrientation)}`] || [];

            return {
                topics: sliceTopics,
                tlas: sliceTlas,
                assessments: sliceAssessments,
                references: sliceReferences
            };
        };

        // 6. Build Course Orientation row (from CO1's orientation ILO and Week 1's orientation content)
        const orientationIlo = ilos.find(i => Boolean(i.is_orientation));
        const firstCoId = courseOutcomes[0]?.co_id;
        const firstCoWeeks = weeks.filter(w => w.co_id === firstCoId);
        const firstWeek = firstCoWeeks[0] || weeks[0] || null;

        let orientationRow = null;
        let orientationHoursDeduction = 0;

        if (orientationIlo && firstWeek) {
            const orientHours = orientationIlo.hours
                ? Number(orientationIlo.hours)
                : defaultOrientationHours;
            orientationHoursDeduction = orientHours;

            const orientSlice = buildWeekSliceContent(firstWeek.week_id, true);
            orientationRow = {
                id: 'Course-Orientation',
                iloId: orientationIlo.ilo_id,
                weekId: firstWeek.week_id,
                label: 'Course Orientation',
                intendedLearningOutcome: (orientationIlo.description || '').trim(),
                deliveryWeek: 'Week 1',
                hours: orientHours,
                allocatedTime: `(${orientHours} hrs)`,
                topics: orientSlice.topics,
                tlas: orientSlice.tlas,
                assessments: orientSlice.assessments,
                references: orientSlice.references
            };
        }

        // 7. Build the 4 Course Outcome blocks (each with its 3 ILOs, weekly sub-rows, and Period Divider row)
        let runningWeekNumber = 1;
        const structuredCourseOutcomes = [];

        courseOutcomes.forEach((co, coIdx) => {
            const coNum = coIdx + 1;
            const coNonOrientIlos = ilos
                .filter(i => i.co_id === co.co_id && !i.is_orientation)
                .map((iloItem, idx) => ({
                    id: iloItem.ilo_id,
                    iloNumber: idx + 1,
                    label: `ILO${idx + 1}`,
                    description: (iloItem.description || '').trim()
                }));

            const coWeeks = weeks.filter(w => w.co_id === co.co_id);
            const structuredWeeks = coWeeks.map((w, wIdx) => {
                const computedWeekNum = runningWeekNumber++;
                const rawWeekHours = w.hours ? Number(w.hours) : totalWeeklyContactHours;
                const effectiveHours = (coIdx === 0 && wIdx === 0 && orientationHoursDeduction > 0)
                    ? Math.max(0, rawWeekHours - orientationHoursDeduction)
                    : rawWeekHours;

                const weekSlice = buildWeekSliceContent(w.week_id, false);

                return {
                    week_id: w.week_id,
                    co_id: co.co_id,
                    weekNumberInCo: wIdx + 1,
                    computedWeekNumber: computedWeekNum,
                    deliveryWeek: `Week ${computedWeekNum}`,
                    hours: effectiveHours,
                    allocatedTime: `(${effectiveHours} hrs)`,
                    topics: weekSlice.topics,
                    tlas: weekSlice.tlas,
                    assessments: weekSlice.assessments,
                    references: weekSlice.references
                };
            });

            // Build Examination Period Divider row placed right after this CO
            let examDivider = null;
            if (coNum === 1) {
                examDivider = {
                    id: 'PRELIM',
                    label: 'PRELIM',
                    deliveryWeek: '',
                    allocatedTime: ''
                };
            } else if (coNum === 2) {
                const midtermWeek = runningWeekNumber++;
                examDivider = {
                    id: 'MIDTERM',
                    label: 'MIDTERM',
                    deliveryWeek: `Week ${midtermWeek}`,
                    allocatedTime: `(${totalWeeklyContactHours} hrs)`
                };
            } else if (coNum === 3) {
                examDivider = {
                    id: 'SEMIFINAL',
                    label: 'SEMIFINAL',
                    deliveryWeek: '',
                    allocatedTime: ''
                };
            } else if (coNum === 4) {
                const finalWeek = runningWeekNumber++;
                examDivider = {
                    id: 'FINAL',
                    label: 'FINAL',
                    deliveryWeek: `Week ${finalWeek}`,
                    allocatedTime: `(${totalWeeklyContactHours} hrs)`
                };
            }

            structuredCourseOutcomes.push({
                co_id: co.co_id,
                coNumber: coNum,
                coLabel: `CO${coNum}`,
                coDescription: (co.co_description || '').replace(/^CO\s*\d+\s*:\s*/i, '').trim(),
                ilos: coNonOrientIlos,
                weeks: structuredWeeks,
                examDivider: examDivider
            });
        });

        return res.status(200).json({
            orientation: orientationRow,
            courseOutcomes: structuredCourseOutcomes,
            topics: allCompiledTopics,
            assessments: compiledAssessments
        });
    } catch (error) {
        next(error);
    }
};
