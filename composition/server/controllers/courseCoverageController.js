// controllers/courseCoverageController.js
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

exports.getCourseCoverage = async (req, res, next) => {
    const { pcId, revNum } = req.params;

    if (!pcId || !revNum) {
        return res.status(400).json({
            error: "Missing version identification parameters. Please verify your API endpoint route configurations."
        });
    }

    try {
        // Direct Query: Get course outcome database records linked directly to this pc_offering_id version
        const courseOutcomes = await CourseOutcome.findAll({
            where: { pc_offering_id: pcId }
        });

        const coIds = courseOutcomes.map(co => co.co_id || co.id);
        if (coIds.length === 0) {
            return res.status(200).json({ ilos: [], topics: [], assessments: [] });
        }

        // Map course outcome database IDs to clean sequential displays (CO1, CO2, CO3)
        const coNumberMap = new Map();
        courseOutcomes.forEach((co, index) => {
            coNumberMap.set(co.co_id || co.id, index + 1);
        });

        // Retrieve all IntendedLearningOutcomes
        const ilos = await IntendedLearningOutcome.findAll({
            where: { co_id: coIds },
            order: [['ilo_id', 'ASC']]
        });

        const iloIds = ilos.map(ilo => ilo.ilo_id);
        if (iloIds.length === 0) {
            return res.status(200).json({ ilos: [], topics: [], assessments: [] });
        }

        // Fetch assigned topics via Junction Table
        const topicsData = await ILOTopic.findAll({
            where: { ilo_id: iloIds },
            include: Topic ? [
                {
                    model: Topic,
                    as: ILOTopic.associations && ILOTopic.associations.Topic ? 'Topic' :
                        (ILOTopic.associations && ILOTopic.associations.topic ? 'topic' : undefined)
                }
            ] : [],
            order: [['ilo_topic_id', 'ASC']]
        });

        const iloTopicIds = topicsData.map(t => t.ilo_topic_id || t.id);
        const topicIds = topicsData.map(t => t.topic_id).filter(Boolean);

        // Fetch Subtopics linked directly to those topic_ids
        let subtopicsData = [];
        if (Subtopic && topicIds.length > 0) {
            subtopicsData = await Subtopic.findAll({
                where: { topic_id: topicIds },
                order: [['sequence_order', 'ASC'], ['subtopic_id', 'ASC']]
            });
        }

        // Traverse TopicTLA junction safely handling explicit aliases
        let tlasData = [];
        if (TopicTLA && iloTopicIds.length > 0) {
            tlasData = await TopicTLA.findAll({
                where: { ilo_topic_id: iloTopicIds },
                include: TeachingAndLearningActivity ? [
                    {
                        model: TeachingAndLearningActivity,
                        as: TopicTLA.associations && TopicTLA.associations.TeachingAndLearningActivity ? 'TeachingAndLearningActivity' :
                            (TopicTLA.associations && TopicTLA.associations.teachingAndLearningActivity ? 'teachingAndLearningActivity' :
                                (TopicTLA.associations && TopicTLA.associations.tla ? 'tla' : undefined))
                    }
                ] : [],
                order: [[TopicTLA.primaryKeyAttribute || 'id', 'ASC']]
            });
        }

        const tlaIds = tlasData.map(t => t.tla_id).filter(Boolean);

        // Create a fast lookup map for relating TLA IDs to their actual descriptive Names
        const tlaIdToNameMap = new Map();
        tlasData.forEach(t => {
            const detail = t.tla || t.TeachingAndLearningActivity || t.teachingAndLearningActivity || {};
            const name = detail.tla_name || detail.name || detail.tlaName || '';
            if (t.tla_id && name) {
                tlaIdToNameMap.set(t.tla_id, name);
            }
        });

        // Get TLAAssessments and map attributes safely
        let rawAssessments = [];
        if (TLAAssessment && tlaIds.length > 0) {
            rawAssessments = await TLAAssessment.findAll({
                where: { tla_id: tlaIds },
                order: [['tla_id', 'ASC']]
            });
        }

        const compiledAssessments = rawAssessments.map(assess => {
            const assignedTlaName = tlaIdToNameMap.get(assess.tla_id) || '';
            const method = assess.name || assess.assessment_method || assess.assessmentMethod || assess.method_name || '';
            const desc = assess.description || assess.assessment_description || assess.details || '';

            return {
                id: assess.tla_assessment_id || assess.id,
                tlaId: assess.tla_id,
                tlaName: assignedTlaName,
                assessmentMethod: method,
                description: desc,
                period: assess.period || '',
                weight: assess.weight || 0,
                minPassing: assess.min_passing || assess.minPassing || 60
            };
        });

        // Collect references with alias checks supporting manual mappings
        let rawReferences = [];
        if (ILOReference && Reference) {
            rawReferences = await ILOReference.findAll({
                where: { ilo_id: iloIds },
                include: [
                    {
                        model: Reference,
                        required: true,
                        as: ILOReference.associations && ILOReference.associations.Reference ? 'Reference' :
                            (ILOReference.associations && ILOReference.associations.reference ? 'reference' : undefined)
                    }
                ],
                order: [['ilo_reference_id', 'ASC']]
            });
        }

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
            const ref = item.Reference || item.reference || item;
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

        // Structure Topics with DEDUPLICATION tracking constraints built-in
        const compiledTopics = topicsData.map(iloTopic => {
            const currentIloTopicId = iloTopic.ilo_topic_id;
            const currentTopicId = iloTopic.topic_id;
            const actualTopic = iloTopic.topic || iloTopic.Topic || {};

            const subtopics = subtopicsData
                .filter(sub => sub.topic_id === currentTopicId)
                .map(sub => ({ id: sub.subtopic_id, value: sub.title || '' }));

            const seenTlaKeys = new Set();
            const tlas = tlasData
                .filter(tla => tla.ilo_topic_id === currentIloTopicId)
                .map(tla => {
                    const detail = tla.tla || tla.TeachingAndLearningActivity || tla.teachingAndLearningActivity || {};
                    const name = detail.tla_name || detail.name || detail.tlaName || '';
                    const rawPhase = detail.class_phase || detail.classPhase || detail.phase || 'In-class';
                    const description = detail.tla_description || detail.description || detail.tlaDescription || '';

                    let perfBy = detail.performed_by || detail.performedBy || 'Student';
                    if (perfBy === 'T' || perfBy === 'Instructor' || perfBy === 'I') perfBy = 'Instructor';
                    else if (perfBy === 'S' || perfBy === 'Student') perfBy = 'Student';

                    let normalizedPhase = rawPhase.trim();
                    if (/^pre/i.test(normalizedPhase)) normalizedPhase = 'Pre-class';
                    else if (/^post/i.test(normalizedPhase)) normalizedPhase = 'Post-class';
                    else if (/^in/i.test(normalizedPhase)) normalizedPhase = 'In-class';

                    const duplicationFingerprint = `${tla.tla_id || detail.id}-${normalizedPhase}-${name}`.toLowerCase();
                    if (seenTlaKeys.has(duplicationFingerprint)) return null;
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
                .filter(Boolean);

            return {
                id: currentTopicId || currentIloTopicId,
                title: actualTopic.title || actualTopic.name || '',
                iloId: iloTopic.ilo_id,
                subtopics,
                tlas
            };
        });

        // Format final payload and handle row number index resets per CO grouping
        const coIloCounters = {};

        // Track the running week sequence
        let currentWeekStart = 1;

        const compiledIlos = ilos.map(ilo => {
            const currentIloId = ilo.ilo_id;
            const currentCoId = ilo.co_id;
            const coNum = coNumberMap.get(currentCoId) || 1;

            if (!coIloCounters[currentCoId]) coIloCounters[currentCoId] = 0;
            coIloCounters[currentCoId]++;
            const localIloIndexNum = coIloCounters[currentCoId];

            const relatedTopicTitles = compiledTopics
                .filter(t => t.iloId === currentIloId)
                .map(t => t.title);

            // Calculate the sequential Delivery Week
            const duration = Math.trunc(ilo.weeks) || 0;
            let deliveryWeekString = '';

            if (duration === 1) {
                deliveryWeekString = `Week ${currentWeekStart}`;
                currentWeekStart += 1;
            } else if (duration > 1) {
                const endWeek = currentWeekStart + duration - 1;
                deliveryWeekString = `Week ${currentWeekStart} - ${endWeek}`;
                currentWeekStart += duration;
            }

            return {
                id: `CO${coNum}-ILO${localIloIndexNum}`,
                intendedLearningOutcome: ilo.description || ilo.intendedLearningOutcome || '',
                deliveryWeek: deliveryWeekString,
                allocatedTime: `(${ilo.hours || 0} hrs)`,
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