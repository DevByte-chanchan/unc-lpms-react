// controllers/courseCriteriaController.js
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
 * Returns gradingSystem array shaped to match the original JSX:
 * [
 *   { co: 'CO1', ilos: [ { id: 'ILO1', assessments: [...], weight: {prelim,midterm,semi,final}, minPassing: 60 }, ... ] },
 *   ...
 * ]
 *
 * CO rows and ILO rows are fixed: CO1..CO4 and ILO1..ILO3 (nested).
 * For each CO we attempt to find up to 3 ILO records (ordered by ilo_id) and gather assessments for each.
 */
async function getCourseCriteriaByCourseCode(req, res) {
    try {
        const courseCode = req.params.courseCode;
        if (!courseCode) return res.status(400).json({ message: 'courseCode is required' });

        // 1) find course by course_no
        const course = await Course.findOne({
            where: { course_no: courseCode },
            attributes: ['course_id', 'course_no', 'course_title']
        });
        if (!course) return res.status(404).json({ message: 'Course not found' });

        // 2) find latest program course offering for that course_id
        const pco = await ProgramCourseOffering.findOne({
            where: { course_id: course.course_id },
            attributes: ['pc_offering_id', 'program_id', 'revision_number'],
            order: [['revision_number', 'DESC']]
        });
        if (!pco) {
            // still return fixed structure but empty ilos
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

        // 3) fetch course outcomes for this pc_offering_id (we will map them to CO1..CO4 by order)
        const courseOutcomes = await CourseOutcome.findAll({
            where: { pc_offering_id: pco.pc_offering_id },
            attributes: ['co_id', 'co_description'],
            order: [['co_id', 'ASC']]
        });

        // Build gradingSystem with fixed CO1..CO4 and ILO1..ILO3
        const gradingSystem = [];

        for (let coIndex = 0; coIndex < 4; coIndex++) {
            const coLabel = `CO${coIndex + 1}`;
            // pick the corresponding CourseOutcome record if exists (by order)
            const coRecord = courseOutcomes[coIndex] || null;

            // fetch ILOs for this CourseOutcome (if exists), otherwise empty array
            const ilosForCo = coRecord
                ? await IntendedLearningOutcome.findAll({
                    where: { co_id: coRecord.co_id },
                    attributes: ['ilo_id', 'description', 'hours'],
                    order: [['ilo_id', 'ASC']]
                })
                : [];

            // We must always render 3 ILO rows (ILO1..ILO3). For each position, try to use the corresponding DB ILO (by index).
            const ilos = [];
            for (let iloPos = 0; iloPos < 3; iloPos++) {
                const iloLabel = `ILO${iloPos + 1}`;
                const iloRecord = ilosForCo[iloPos] || null;

                if (!iloRecord) {
                    // no DB ILO for this slot — return empty placeholders but keep fixed id
                    ilos.push({
                        id: iloLabel,
                        assessments: '',
                        weight: { prelim: '', midterm: '', semi: '', final: '' },
                        minPassing: 60
                    });
                    continue;
                }

                // 4) find topics linked to this ILO via ILOTopic
                const iloTopics = await ILOTopic.findAll({
                    where: { ilo_id: iloRecord.ilo_id },
                    attributes: ['topic_id'],
                    raw: true
                });
                const topicIds = iloTopics.map(t => t.topic_id).filter(Boolean);

                // 5) find TopicTLA rows for these topics to get tla_ids
                const topicTlaRows = topicIds.length
                    ? await TopicTLA.findAll({
                        where: { topic_id: topicIds },
                        attributes: ['tla_id'],
                        raw: true
                    })
                    : [];

                const tlaIds = topicTlaRows.map(t => t.tla_id).filter(Boolean);

                // 6) fetch TLAAssessments for these tlaIds
                const assessments = tlaIds.length
                    ? await TLAAssessment.findAll({
                        where: { tla_id: tlaIds },
                        attributes: ['method_id', 'tla_id', 'name', 'period', 'weight', 'min_passing'],
                        raw: true
                    })
                    : [];

                // Aggregate assessment names and weights per period
                const assessmentNames = [];
                const weightAcc = { prelim: 0, midterm: 0, semi: 0, final: 0 };
                let minPassingValue = null;

                for (const a of assessments) {
                    if (a.name) assessmentNames.push(a.name);
                    const periodKey = normalizePeriod(a.period);
                    const w = parseWeight(a.weight);
                    if (periodKey && w !== null) weightAcc[periodKey] += w;
                    // prefer explicit min_passing from assessment if present
                    if (a.min_passing != null && minPassingValue == null) minPassingValue = Number(a.min_passing);
                }

                // If no min_passing found in assessments, default to 60
                if (minPassingValue == null) minPassingValue = 60;

                // Convert zeroes to empty string to match original rendering expectations
                const weightForRender = {
                    prelim: weightAcc.prelim ? weightAcc.prelim : '',
                    midterm: weightAcc.midterm ? weightAcc.midterm : '',
                    semi: weightAcc.semi ? weightAcc.semi : '',
                    final: weightAcc.final ? weightAcc.final : ''
                };

                ilos.push({
                    id: iloLabel,
                    assessments: assessmentNames.length ? assessmentNames : '',
                    weight: weightForRender,
                    minPassing: minPassingValue
                });
            } // end 3 ILOs

            gradingSystem.push({
                co: coLabel,
                ilos
            });
        } // end 4 COs

        return res.json({ gradingSystem });
    } catch (err) {
        console.error('getCourseCriteriaByCourseCode error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = { getCourseCriteriaByCourseCode };
