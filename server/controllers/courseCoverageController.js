// controllers/courseCoverageController.js
const { getCourseCoverage: getStaticCourseCoverage } = require('../utils/staticData');
const {
    Course,
    ProgramCourseOffering,
    CourseOutcome,
    IntendedLearningOutcome,
    ILOTopic,
    Topic,
    Subtopic,
    TopicTLA,
    TeachingAndLearningActivity,
    TLAAssessment,
    Reference,
    ILOReference
} = require('../models');
const { Op } = require('sequelize');

exports.getCourseCoverage = async (req, res, next) => {
    const courseCode = req.params.code;

    if (!courseCode) {
        return res.status(400).json({
            error: "Missing course identification parameter. Please verify your API endpoint route configurations."
        });
    }

    try {
        // Step 1: Query against 'course_no'
        const courseRecord = await Course.findOne({
            where: { course_no: courseCode }
        });

        if (!courseRecord) {
            const fallback = getStaticCourseCoverage(courseCode);
            if (fallback) return res.status(200).json(fallback);
            return res.status(200).json({ ilos: [], topics: [], assessments: [] });
        }
        const courseId = courseRecord.course_id || courseRecord.id;

        // Step 2: Get pc_offering_id
        const offering = await ProgramCourseOffering.findOne({
            where: { course_id: courseId }
        });

        if (!offering) {
            const fallback = getStaticCourseCoverage(courseCode);
            if (fallback) return res.status(200).json(fallback);
            return res.status(200).json({ ilos: [], topics: [], assessments: [] });
        }
        const pcOfferingId = offering.pc_offering_id || offering.id;

        // Step 3: Retrieve matching co_id records
        const courseOutcomes = await CourseOutcome.findAll({
            where: { pc_offering_id: pcOfferingId }
        });

        const coIds = courseOutcomes.map(co => co.co_id || co.id);
        if (coIds.length === 0) {
            const fallback = getStaticCourseCoverage(courseCode);
            if (fallback) return res.status(200).json(fallback);
            return res.status(200).json({ ilos: [], topics: [], assessments: [] });
        }

        // Map course outcome database IDs to clean sequential row displays (CO1, CO2, CO3)
        const coNumberMap = new Map();
        courseOutcomes.forEach((co, index) => {
            coNumberMap.set(co.co_id || co.id, index + 1);
        });

        // Step 4: Retrieve all IntendedLearningOutcomes
        const ilos = await IntendedLearningOutcome.findAll({
            where: { co_id: coIds },
            order: [['ilo_id', 'ASC']]
        });

        const iloIds = ilos.map(ilo => ilo.ilo_id);
        if (iloIds.length === 0) {
            const fallback = getStaticCourseCoverage(courseCode);
            if (fallback) return res.status(200).json(fallback);
            return res.status(200).json({ ilos: [], topics: [], assessments: [] });
        }

        // Step 5: Fetch assigned topics
        const topicsData = await ILOTopic.findAll({
            where: { ilo_id: iloIds },
            include: Topic ? [{ model: Topic, as: 'topic' }] : [],
            order: [['ilo_topic_id', 'ASC']]
        });

        const iloTopicIds = topicsData.map(t => t.ilo_topic_id);
        const topicIds = topicsData.map(t => t.topic_id).filter(Boolean);

        // Step 6: Fetch Subtopics linked directly to those topic_ids
        let subtopicsData = [];
        if (Subtopic && topicIds.length > 0) {
            subtopicsData = await Subtopic.findAll({
                where: { topic_id: topicIds },
                order: [['sequence_order', 'ASC'], ['subtopic_id', 'ASC']]
            });
        }

        // Step 7: Traverse TopicTLA and account for snake_case relational tables
        let tlasData = [];
        if (TopicTLA && iloTopicIds.length > 0) {
            tlasData = await TopicTLA.findAll({
                where: { ilo_topic_id: iloTopicIds },
                include: TeachingAndLearningActivity ? [{ model: TeachingAndLearningActivity, as: 'tla' }] : [],
                order: [['topic_tla_id', 'ASC']]
            });
        }

        const tlaIds = tlasData.map(t => t.tla_id).filter(Boolean);

        // Create a fast lookup map for relating TLA IDs to their actual descriptive Names
        const tlaIdToNameMap = new Map();
        tlasData.forEach(t => {
            const detail = t.tla || {};
            const name = detail.tla_name || detail.name || detail.tlaName || '';
            if (t.tla_id && name) {
                tlaIdToNameMap.set(t.tla_id, name);
            }
        });

        // Step 8: Get TLAAssessments and map attributes to match UI expectations
        let rawAssessments = [];
        if (TLAAssessment && tlaIds.length > 0) {
            rawAssessments = await TLAAssessment.findAll({
                where: { tla_id: tlaIds },
                order: [['method_id', 'ASC']]
            });
        }

        const compiledAssessments = rawAssessments.map(assess => {
            const assignedTlaName = tlaIdToNameMap.get(assess.tla_id) || '';

            // 1. Get the Assessment Method name (e.g., "Written Quiz", "Case Study Rubric")
            const method = assess.assessment_method || assess.assessmentMethod || assess.method_name || assess.name || '';

            // 2. Safe fallback checks to grab the description column if it exists in your model
            const desc = assess.description || assess.assessment_description || assess.details || assess.method_description || '';

            return {
                id: assess.tla_assessment_id || assess.id,
                tlaId: assess.tla_id,
                tlaName: assignedTlaName,
                assessmentMethod: method, // This will be your bold header
                description: desc          // This will be your descriptive subtext
            };
        });

        // Step 9: Collect references with strict institutional fallback tracking
        let rawReferences = [];
        if (ILOReference && Reference) {
            rawReferences = await ILOReference.findAll({
                where: { ilo_id: iloIds },
                include: [{ model: Reference, required: true }],
                order: [['ilo_reference_id', 'ASC']]
            });
        }

        // --- GLOBAL SEQUENTIAL REFERENCE MAPPING ---
        const referenceGlobalMap = new Map();
        const typeCounters = {};

        const getInstitutionalPrefix = (typeStr) => {
            if (!typeStr) return 'REF';
            const normalized = typeStr.trim().toLowerCase();

            if (normalized.includes('textbook')) return 'TB';
            if (normalized.includes('online')) return 'OR';
            if (normalized.includes('open educational') || normalized.includes('oer')) return 'OER';
            if (normalized.includes('reference book') || normalized.includes('reference_book')) return 'RB';

            return 'REF';
        };

        const formattedReferencesByIlo = {};
        iloIds.forEach(id => { formattedReferencesByIlo[id] = []; });

        rawReferences.forEach(item => {
            const ref = item.Reference || item;
            const refId = ref.reference_id || ref.id;
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
            const targetIloId = item.ilo_id;
            if (formattedReferencesByIlo[targetIloId]) {
                formattedReferencesByIlo[targetIloId].push(completeRefString);
            }
        });

        // Step 10: Structure Topics with DEDUPLICATION tracking constraints built-in
        const compiledTopics = topicsData.map(iloTopic => {
            const currentIloTopicId = iloTopic.ilo_topic_id;
            const currentTopicId = iloTopic.topic_id;
            const actualTopic = iloTopic.topic || {};

            const subtopics = subtopicsData
                .filter(sub => sub.topic_id === currentTopicId)
                .map(sub => ({
                    id: sub.subtopic_id,
                    value: sub.title || ''
                }));

            // Tracks uniquely emitted active keys per specific topic entry execution row context
            const seenTlaKeys = new Set();

            const tlas = tlasData
                .filter(tla => tla.ilo_topic_id === currentIloTopicId)
                .map(tla => {
                    const detail = tla.tla || {};

                    const name = detail.tla_name || detail.name || detail.tlaName || '';
                    const rawPhase = detail.class_phase || detail.classPhase || detail.phase || 'In-class';
                    const description = detail.tla_description || detail.description || detail.tlaDescription || '';

                    let perfBy = detail.performed_by || detail.performedBy || 'Student';
                    if (perfBy === 'T' || perfBy === 'Instructor' || perfBy === 'I') {
                        perfBy = 'Instructor';
                    } else if (perfBy === 'S' || perfBy === 'Student') {
                        perfBy = 'Student';
                    }

                    let normalizedPhase = rawPhase.trim();
                    if (/^pre/i.test(normalizedPhase)) normalizedPhase = 'Pre-class';
                    else if (/^post/i.test(normalizedPhase)) normalizedPhase = 'Post-class';
                    else if (/^in/i.test(normalizedPhase)) normalizedPhase = 'In-class';

                    // Form an absolute layout duplication fingerprint hash token code
                    const duplicationFingerprint = `${tla.tla_id || detail.id}-${normalizedPhase}-${name}`.toLowerCase();

                    if (seenTlaKeys.has(duplicationFingerprint)) {
                        return null; // Return null if it's already recorded for this entity section
                    }
                    seenTlaKeys.add(duplicationFingerprint);

                    return {
                        id: tla.topic_tla_id || tla.id,
                        tlaId: tla.tla_id,
                        tlaName: name,
                        classPhase: normalizedPhase,
                        performedBy: perfBy,
                        tlaDescription: description,
                        laboratory: Boolean(detail.laboratory || detail.is_lab || detail.is_laboratory)
                    };
                })
                .filter(Boolean); // Cleans out all the filtered duplicate `null` array items neatly

            return {
                id: currentTopicId || currentIloTopicId,
                title: actualTopic.title || actualTopic.name || '',
                iloId: iloTopic.ilo_id,
                subtopics,
                tlas
            };
        });

        // Step 11: Format final payload and handle row number index resets per CO grouping
        const coIloCounters = {};

        const compiledIlos = ilos.map(ilo => {
            const currentIloId = ilo.ilo_id;
            const currentCoId = ilo.co_id;
            const coNum = coNumberMap.get(currentCoId) || 1;

            if (!coIloCounters[currentCoId]) {
                coIloCounters[currentCoId] = 0;
            }
            coIloCounters[currentCoId]++;
            const localIloIndexNum = coIloCounters[currentCoId];

            const relatedTopicTitles = compiledTopics
                .filter(t => t.iloId === currentIloId)
                .map(t => t.title);

            return {
                id: `CO${coNum}-ILO${localIloIndexNum}`,
                intendedLearningOutcome: ilo.description || ilo.intendedLearningOutcome || '',
                deliveryWeek: ilo.hours ? `${ilo.hours} hrs allocated` : '',
                allocatedTime: `${ilo.hours || 0} hrs`,
                topics: relatedTopicTitles,
                references: formattedReferencesByIlo[currentIloId] || []
            };
        });

        return res.status(200).json({
            ilos: compiledIlos,
            topics: compiledTopics,
            assessments: compiledAssessments
        });

    } catch (error) {
        next(error);
    }
};