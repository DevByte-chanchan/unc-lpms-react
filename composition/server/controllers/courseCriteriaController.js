// controllers/courseCriteriaController.js
const {
    CourseOutcome,
    IntendedLearningOutcome,
    ILOTopic,
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

async function getCourseCriteriaByPcOffering(req, res) {
    try {
        const { pcId, revNum } = req.params;
        if (!pcId || !revNum) return res.status(400).json({ message: 'pcId and revNum are required' });

        // Direct fetch: Find course outcomes linked explicitly to this pc_offering_id
        const courseOutcomes = await CourseOutcome.findAll({
            where: { pc_offering_id: pcId },
            attributes: ['co_id', 'co_description'],
            order: [['co_id', 'ASC']]
        });

        const gradingSystem = [];

        for (let coIndex = 0; coIndex < 4; coIndex++) {
            const coLabel = `CO${coIndex + 1}`;
            const coRecord = courseOutcomes[coIndex] || null;

            const allIlosForCo = coRecord
                ? await IntendedLearningOutcome.findAll({
                    where: { co_id: coRecord.co_id },
                    attributes: ['ilo_id', 'description'],
                    order: [['ilo_id', 'ASC']]
                })
                : [];

            // Filter out Course Orientation
            // If there are exactly 4 ILOs, the first one is the orientation.
            // We slice it off to keep only the 3 graded ILOs.
            const gradedIlos = allIlosForCo.length === 4 ? allIlosForCo.slice(1) : allIlosForCo;

            const ilos = [];
            for (let iloPos = 0; iloPos < 3; iloPos++) {
                const iloLabel = `ILO${iloPos + 1}`;
                const iloRecord = gradedIlos[iloPos] || null;

                if (!iloRecord) {
                    ilos.push({
                        id: iloLabel,
                    dbId: iloRecord ? iloRecord.ilo_id : null,
                        assessments: '',
                        weight: { prelim: '', midterm: '', semi: '', final: '' },
                        minPassing: 60
                    });
                    continue;
                }

                // Find the ilo_topic_id linked to this ILO
                const iloTopics = await ILOTopic.findAll({
                    where: { ilo_id: iloRecord.ilo_id },
                    attributes: ['ilo_topic_id'],
                    raw: true
                });
                const iloTopicIds = iloTopics.map(t => t.ilo_topic_id).filter(Boolean);

                // Find TopicTLA rows for these ilo_topic_ids to get tla_ids
                const topicTlaRows = iloTopicIds.length
                    ? await TopicTLA.findAll({
                        where: { ilo_topic_id: iloTopicIds },
                        attributes: ['tla_id'],
                        raw: true
                    })
                    : [];

                const tlaIds = topicTlaRows.map(t => t.tla_id).filter(Boolean);

                // Fetch TLAAssessments for these tlaIds
                const assessments = tlaIds.length
                    ? await TLAAssessment.findAll({
                        where: { tla_id: tlaIds },
                        attributes: ['method_id', 'tla_id', 'name', 'period', 'weight', 'min_passing'],
                        raw: true
                    })
                    : [];

                const assessmentNames = [];
                const weightAcc = { prelim: 0, midterm: 0, semi: 0, final: 0 };
                let minPassingValue = null;

                for (const a of assessments) {
                    if (a.name) assessmentNames.push(a.name);
                    const periodKey = normalizePeriod(a.period);
                    const w = parseWeight(a.weight);
                    if (periodKey && w !== null) weightAcc[periodKey] += w;
                    if (a.min_passing != null && minPassingValue == null) minPassingValue = Number(a.min_passing);
                }

                if (minPassingValue == null) minPassingValue = 60;

                const weightForRender = {
                    prelim: weightAcc.prelim ? weightAcc.prelim : '',
                    midterm: weightAcc.midterm ? weightAcc.midterm : '',
                    semi: weightAcc.semi ? weightAcc.semi : '',
                    final: weightAcc.final ? weightAcc.final : ''
                };

                ilos.push({
                    id: iloLabel,
                    dbId: iloRecord ? iloRecord.ilo_id : null,
                    assessments: assessmentNames.length ? assessmentNames : '',
                    weight: weightForRender,
                    minPassing: minPassingValue
                });
            }

            gradingSystem.push({ co: coLabel, ilos });
        }

        return res.json({ gradingSystem });
    } catch (err) {
        console.error('getCourseCriteriaByPcOffering error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = { getCourseCriteriaByPcOffering, updateCourseCriteriaByPcOffering };
async function updateCourseCriteriaByPcOffering(req, res) {
    try {
        const { pcId, revNum } = req.params;
        const { gradingSystem } = req.body;

        if (!pcId || !revNum || !gradingSystem) return res.status(400).json({ message: 'Missing parameters' });

        // Iterate through gradingSystem updates sent from frontend
        for (const group of gradingSystem) {
            for (let iloPos = 0; iloPos < group.ilos.length; iloPos++) {
                const iloData = group.ilos[iloPos];
                if (!iloData.dbId) continue; // Note: We need UI to pass the actual ilo_id!

                // Find TLA ids for this ILO
                const iloTopics = await ILOTopic.findAll({ where: { ilo_id: iloData.dbId }, raw: true });
                const iloTopicIds = iloTopics.map(t => t.ilo_topic_id);
                
                const topicTlaRows = await TopicTLA.findAll({ where: { ilo_topic_id: iloTopicIds }, raw: true });
                const tlaIds = topicTlaRows.map(t => t.tla_id);
                
                if (tlaIds.length === 0) continue; // No TLA to attach assessment to

                // Delete old assessments for these TLAs
                await TLAAssessment.destroy({ where: { tla_id: tlaIds } });

                // Create new assessments based on the edited weights
                const periods = ['prelim', 'midterm', 'semi', 'final'];
                for (const p of periods) {
                    if (iloData.weight && iloData.weight[p]) {
                        await TLAAssessment.create({
                            tla_id: tlaIds[0], // attach to first TLA
                            name: Array.isArray(iloData.assessments) ? iloData.assessments.join(', ') : iloData.assessments,
                            period: p,
                            weight: parseFloat(iloData.weight[p]) || 0,
                            min_passing: parseFloat(iloData.minPassing) || 60
                        });
                    }
                }
            }
        }

        return res.json({ message: 'Grading criteria updated' });
    } catch (err) {
        console.error('updateCourseCriteria error', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}
