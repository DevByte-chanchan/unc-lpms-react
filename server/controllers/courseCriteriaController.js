// controllers/courseCriteriaController.js
const { getCourseCriteria: getStaticCriteria } = require('../utils/staticData');
const {
    Course,
    ProgramCourseOffering,
    CourseOutcome,
    IntendedLearningOutcome,
    ILOTopic,
    Topic,
    TopicTLA,
    TLAAssessment
} = require('../models');

function normalizePeriod(raw) {
    if (!raw) return null;
    const s = String(raw).toLowerCase();
    if (s.startsWith('p') || s === 'prelim') return 'prelim';
    if (s.startsWith('m') || s === 'midterm') return 'midterm';
    if (s.startsWith('s') || s === 'semi') return 'semi';
    if (s.startsWith('f') || s === 'final') return 'final';
    return null;
}

function parseWeight(w) {
    if (w == null) return null;
    const cleaned = String(w).replace('%', '').trim();
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
}

/**
 * Returns gradingSystem array shaped to match the original JSX.
 * Reads grade_period/grade_weight/min_passing from ILO directly
 * when available (exact, no double-counting).
 * Falls back to TLA-graph sum for legacy data without grade columns.
 */
async function getCourseCriteriaByCourseCode(req, res) {
    try {
        const courseCode = req.params.courseCode;
        if (!courseCode) return res.status(400).json({ message: 'courseCode is required' });

        const course = await Course.findOne({
            where: { course_no: courseCode },
            attributes: ['course_id', 'course_no', 'course_title']
        });
        if (!course) {
            const fallback = getStaticCriteria(courseCode);
            if (fallback) return res.json(fallback);
            return res.status(404).json({ message: 'Course not found' });
        }

        const pco = await ProgramCourseOffering.findOne({
            where: { course_id: course.course_id },
            attributes: ['pc_offering_id', 'program_id', 'revision_number'],
            order: [['revision_number', 'DESC']]
        });
        if (!pco) {
            const fallback = getStaticCriteria(courseCode);
            if (fallback) return res.json(fallback);
            const emptyGrading = Array.from({ length: 4 }, (_, i) => ({
                co: `CO${i + 1}`,
                ilos: Array.from({ length: 3 }, (_, j) => ({
                    id: `ILO${j + 1}`,
                    assessments: '',
                    weight: { prelim: '', midterm: '', semi: '', final: '' },
                    minPassing: 60
                }))
            }));
            return res.json({ gradingSystem: emptyGrading });
        }

        const courseOutcomes = await CourseOutcome.findAll({
            where: { pc_offering_id: pco.pc_offering_id },
            attributes: ['co_id', 'co_description'],
            order: [['co_id', 'ASC']]
        });

        const staticFallback = getStaticCriteria(courseCode);
        const staticGradingGroups = staticFallback?.gradingSystem || [];
        const gradingSystem = [];

        for (let coIndex = 0; coIndex < 4; coIndex++) {
            const coLabel = `CO${coIndex + 1}`;
            const coRecord = courseOutcomes[coIndex] || null;

            const ilosForCo = coRecord
                ? await IntendedLearningOutcome.findAll({
                    where: { co_id: coRecord.co_id },
                    attributes: ['ilo_id', 'description', 'hours', 'grade_period', 'grade_weight', 'min_passing'],
                    order: [['ilo_id', 'ASC']]
                })
                : [];

            const staticGroup = staticGradingGroups.find(group => group.co === coLabel) || null;
            const ilos = [];
            for (let iloPos = 0; iloPos < 3; iloPos++) {
                const iloLabel = `ILO${iloPos + 1}`;
                const iloRecord = ilosForCo[iloPos] || null;
                const fallbackIlo = staticGroup?.ilos?.[iloPos] || null;

                if (!iloRecord && !fallbackIlo) {
                    ilos.push({
                        id: iloLabel,
                        assessments: '',
                        weight: { prelim: '', midterm: '', semi: '', final: '' },
                        minPassing: 60
                    });
                    continue;
                }

                const useStaticFallback = !iloRecord && !!fallbackIlo;
                let assessmentNames = [];
                let tlaAssessments = [];

                if (iloRecord) {
                    const iloTopics = await ILOTopic.findAll({
                        where: { ilo_id: iloRecord.ilo_id },
                        attributes: ['ilo_topic_id'],
                        raw: true
                    });
                    const iloTopicIds = iloTopics.map(t => t.ilo_topic_id).filter(Boolean);

                    const topicTlaRows = iloTopicIds.length
                        ? await TopicTLA.findAll({
                            where: { ilo_topic_id: iloTopicIds },
                            attributes: ['tla_id'],
                            raw: true
                        })
                        : [];

                    const tlaIds = topicTlaRows.map(t => t.tla_id).filter(Boolean);

                    tlaAssessments = tlaIds.length
                        ? await TLAAssessment.findAll({
                            where: { tla_id: tlaIds },
                            attributes: ['name', 'period', 'weight', 'min_passing'],
                            raw: true
                        })
                        : [];

                    assessmentNames = tlaAssessments.map(a => a.name).filter(Boolean);
                }

                // Weights from ILO grade fields (exact, no double-count) or TLA graph fallback
                let weightForRender;
                let minPassingValue;

                if (iloRecord?.grade_period) {
                    const periodKey = normalizePeriod(iloRecord.grade_period);
                    const weightVal = parseWeight(iloRecord.grade_weight);
                    weightForRender = { prelim: '', midterm: '', semi: '', final: '' };
                    if (periodKey && weightVal !== null) weightForRender[periodKey] = weightVal;
                    minPassingValue = iloRecord.min_passing != null ? Number(iloRecord.min_passing) : 60;
                } else if (useStaticFallback && fallbackIlo) {
                    weightForRender = { ...fallbackIlo.weight };
                    minPassingValue = fallbackIlo.minPassing != null ? Number(fallbackIlo.minPassing) : 60;
                } else {
                    const weightAcc = { prelim: 0, midterm: 0, semi: 0, final: 0 };
                    minPassingValue = 60;
                    for (const a of tlaAssessments) {
                        const periodKey = normalizePeriod(a.period);
                        const w = parseWeight(a.weight);
                        if (periodKey && w !== null) weightAcc[periodKey] += w;
                        if (a.min_passing != null && minPassingValue == null) minPassingValue = Number(a.min_passing);
                    }
                    weightForRender = {
                        prelim: weightAcc.prelim ? weightAcc.prelim : '',
                        midterm: weightAcc.midterm ? weightAcc.midterm : '',
                        semi: weightAcc.semi ? weightAcc.semi : '',
                        final: weightAcc.final ? weightAcc.final : ''
                    };
                    if (minPassingValue == null) minPassingValue = 60;
                }

                ilos.push({
                    id: iloLabel,
                    assessments: useStaticFallback && fallbackIlo ? (Array.isArray(fallbackIlo.assessments) ? fallbackIlo.assessments : (fallbackIlo.assessments ?? '')) : (assessmentNames.length ? assessmentNames : ''),
                    weight: weightForRender,
                    minPassing: minPassingValue
                });
            }

            gradingSystem.push({
                co: coLabel,
                ilos
            });
        }

        return res.json({ gradingSystem });
    } catch (err) {
        console.error('getCourseCriteriaByCourseCode error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function getCourseCriteriaByPcOffering(req, res) {
    try {
        const { pcId, revNum } = req.params;
        if (!pcId) return res.status(400).json({ message: 'pcId is required' });

        const courseOutcomes = await CourseOutcome.findAll({
            where: { pc_offering_id: pcId },
            attributes: ['co_id', 'co_description'],
            order: [['co_id', 'ASC']]
        });

        const staticFallback = getStaticCriteria(req.params?.courseCode || '');
        const staticGradingGroups = staticFallback?.gradingSystem || [];
        const gradingSystem = [];

        for (let coIndex = 0; coIndex < 4; coIndex++) {
            const coLabel = `CO${coIndex + 1}`;
            const coRecord = courseOutcomes[coIndex] || null;

            const ilosForCo = coRecord
                ? await IntendedLearningOutcome.findAll({
                    where: { co_id: coRecord.co_id },
                    attributes: ['ilo_id', 'description', 'hours', 'grade_period', 'grade_weight', 'min_passing'],
                    order: [['ilo_id', 'ASC']]
                })
                : [];

            const staticGroup = staticGradingGroups.find(group => group.co === coLabel) || null;
            const ilos = [];
            for (let iloPos = 0; iloPos < 3; iloPos++) {
                const iloLabel = `ILO${iloPos + 1}`;
                const iloRecord = ilosForCo[iloPos] || null;
                const fallbackIlo = staticGroup?.ilos?.[iloPos] || null;

                if (!iloRecord && !fallbackIlo) {
                    ilos.push({
                        id: iloLabel,
                        assessments: '',
                        weight: { prelim: '', midterm: '', semi: '', final: '' },
                        minPassing: 60
                    });
                    continue;
                }

                const useStaticFallback = !iloRecord && !!fallbackIlo;
                let assessmentNames = [];
                let tlaAssessments = [];

                if (iloRecord) {
                    const iloTopics = await ILOTopic.findAll({
                        where: { ilo_id: iloRecord.ilo_id },
                        attributes: ['ilo_topic_id'],
                        raw: true
                    });
                    const iloTopicIds = iloTopics.map(t => t.ilo_topic_id).filter(Boolean);

                    const topicTlaRows = iloTopicIds.length
                        ? await TopicTLA.findAll({
                            where: { ilo_topic_id: iloTopicIds },
                            attributes: ['tla_id'],
                            raw: true
                        })
                        : [];

                    const tlaIds = topicTlaRows.map(t => t.tla_id).filter(Boolean);

                    tlaAssessments = tlaIds.length
                        ? await TLAAssessment.findAll({
                            where: { tla_id: tlaIds },
                            attributes: ['name', 'period', 'weight', 'min_passing'],
                            raw: true
                        })
                        : [];

                    assessmentNames = tlaAssessments.map(a => a.name).filter(Boolean);
                }

                let weightForRender;
                let minPassingValue;

                if (iloRecord?.grade_period) {
                    const periodKey = normalizePeriod(iloRecord.grade_period);
                    const weightVal = parseWeight(iloRecord.grade_weight);
                    weightForRender = { prelim: '', midterm: '', semi: '', final: '' };
                    if (periodKey && weightVal !== null) weightForRender[periodKey] = weightVal;
                    minPassingValue = iloRecord.min_passing != null ? Number(iloRecord.min_passing) : 60;
                } else if (useStaticFallback && fallbackIlo) {
                    weightForRender = { ...fallbackIlo.weight };
                    minPassingValue = fallbackIlo.minPassing != null ? Number(fallbackIlo.minPassing) : 60;
                } else {
                    const weightAcc = { prelim: 0, midterm: 0, semi: 0, final: 0 };
                    minPassingValue = 60;
                    for (const a of tlaAssessments) {
                        const periodKey = normalizePeriod(a.period);
                        const w = parseWeight(a.weight);
                        if (periodKey && w !== null) weightAcc[periodKey] += w;
                        if (a.min_passing != null && minPassingValue == null) minPassingValue = Number(a.min_passing);
                    }
                    weightForRender = {
                        prelim: weightAcc.prelim ? weightAcc.prelim : '',
                        midterm: weightAcc.midterm ? weightAcc.midterm : '',
                        semi: weightAcc.semi ? weightAcc.semi : '',
                        final: weightAcc.final ? weightAcc.final : ''
                    };
                    if (minPassingValue == null) minPassingValue = 60;
                }

                ilos.push({
                    id: iloLabel,
                    assessments: useStaticFallback && fallbackIlo ? (Array.isArray(fallbackIlo.assessments) ? fallbackIlo.assessments : (fallbackIlo.assessments ?? '')) : (assessmentNames.length ? assessmentNames : ''),
                    weight: weightForRender,
                    minPassing: minPassingValue
                });
            }

            gradingSystem.push({
                co: coLabel,
                ilos
            });
        }

        return res.json({ gradingSystem });
    } catch (err) {
        console.error('getCourseCriteriaByPcOffering error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = { getCourseCriteriaByCourseCode, getCourseCriteriaByPcOffering };
