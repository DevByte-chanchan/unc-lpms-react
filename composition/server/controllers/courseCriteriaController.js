// controllers/courseCriteriaController.js
const {
    CourseOutcome,
    IntendedLearningOutcome,
    Week,
    TeachingAndLearningActivity,
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

function getPeriodChar(raw) {
    const s = String(raw).toLowerCase();
    if (s.startsWith('p')) return 'p';
    if (s.startsWith('m')) return 'm';
    if (s.startsWith('s')) return 's';
    if (s.startsWith('f')) return 'f';
    return 'p';
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
        if (!pcId) return res.status(400).json({ message: 'pcId is required' });

        // Direct fetch: Find course outcomes linked explicitly to this pc_offering_id
        const courseOutcomes = await CourseOutcome.findAll({
            where: { pc_offering_id: pcId },
            attributes: ['co_id', 'co_description'],
            order: [['co_id', 'ASC']]
        });

        const gradingSystem = [];

        for (let coIndex = 0; coIndex < 4; coIndex++) {
            const coRecord = courseOutcomes[coIndex] || null;

            const allIlosForCo = coRecord
                ? await IntendedLearningOutcome.findAll({
                    where: { co_id: coRecord.co_id },
                    attributes: ['ilo_id', 'description', 'is_orientation', 'assessment_tool'],
                    order: [['ilo_id', 'ASC']]
                })
                : [];

            // Filter out Course Orientation ILOs so only the 3 graded ILOs remain
            const gradedIlos = allIlosForCo.some(ilo => ilo.is_orientation)
                ? allIlosForCo.filter(ilo => !ilo.is_orientation)
                : (allIlosForCo.length === 4 ? allIlosForCo.slice(1) : allIlosForCo);

            const ilos = [];
            for (let iloPos = 0; iloPos < 3; iloPos++) {
                const iloLabel = `ILO${iloPos + 1}`;
                const iloRecord = gradedIlos[iloPos] || null;

                if (!iloRecord) {
                    ilos.push({
                        id: iloLabel,
                        dbId: null,
                        assessments: '',
                        weight: { prelim: '', midterm: '', semi: '', final: '' },
                        minPassing: 60
                    });
                    continue;
                }

                // Fetch TLAAssessments linked to this specific graded ILO via ilo_id
                const assessments = await TLAAssessment.findAll({
                    where: { ilo_id: iloRecord.ilo_id },
                    attributes: ['method_id', 'tla_id', 'ilo_id', 'name', 'period', 'weight', 'min_passing'],
                    order: [['method_id', 'ASC']],
                    raw: true
                });

                const assessmentNames = [];
                const weightAcc = { prelim: 0, midterm: 0, semi: 0, final: 0 };
                let minPassingValue = null;

                for (const a of assessments) {
                    if (a.name && !assessmentNames.includes(a.name)) assessmentNames.push(a.name);
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
                    dbId: iloRecord.ilo_id,
                    assessments: assessmentNames.length ? assessmentNames : '',
                    weight: weightForRender,
                    minPassing: minPassingValue
                });
            }

            gradingSystem.push({ co: `CO${coIndex + 1}`, ilos });
        }

        return res.json({ gradingSystem });
    } catch (err) {
        console.error('getCourseCriteriaByPcOffering error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function updateCourseCriteriaByPcOffering(req, res) {
    try {
        const { pcId, revNum } = req.params;
        const { gradingSystem } = req.body;

        if (!pcId || !Array.isArray(gradingSystem)) return res.status(400).json({ message: 'Missing parameters' });
        void revNum;

        // Only this plan's ILOs may be written (the ids come from the request body).
        const coIds = (await CourseOutcome.findAll({ where: { pc_offering_id: pcId }, attributes: ['co_id'], raw: true })).map(co => co.co_id);
        const ownIloIds = new Set((coIds.length
            ? await IntendedLearningOutcome.findAll({ where: { co_id: coIds }, attributes: ['ilo_id'], raw: true })
            : []).map(ilo => Number(ilo.ilo_id)));
        const sentIloIds = gradingSystem.flatMap(group => (group?.ilos || []).map(ilo => ilo?.dbId).filter(id => id != null));
        if (sentIloIds.some(id => !ownIloIds.has(Number(id)))) {
            return res.status(403).json({ message: 'An ILO in this request is not part of this learning plan.' });
        }

        // Iterate through gradingSystem updates sent from frontend
        for (const group of gradingSystem) {
            for (let iloPos = 0; iloPos < group.ilos.length; iloPos++) {
                const iloData = group.ilos[iloPos];
                if (!iloData || !iloData.dbId) continue;

                // 1) Check existing TLAAssessments linked to this ILO to preserve tla_id and description
                const existingAssessments = await TLAAssessment.findAll({
                    where: { ilo_id: iloData.dbId },
                    order: [['method_id', 'ASC']],
                    raw: true
                });

                let targetTlaId = existingAssessments.length > 0 ? existingAssessments[0].tla_id : null;
                const existingDesc = existingAssessments.length > 0 ? existingAssessments[0].description : null;

                // 2) Fallback: if no assessment was previously linked to this ILO, find a TLA from the CO's Weeks
                if (!targetTlaId) {
                    const iloRecord = await IntendedLearningOutcome.findByPk(iloData.dbId, { raw: true });
                    if (iloRecord) {
                        const weeks = await Week.findAll({
                            where: { co_id: iloRecord.co_id },
                            attributes: ['week_id'],
                            order: [['week_id', 'ASC']],
                            raw: true
                        });
                        const weekIds = weeks.map(w => w.week_id);
                        if (weekIds.length > 0) {
                            const tlas = await TeachingAndLearningActivity.findAll({
                                where: { week_id: weekIds },
                                attributes: ['tla_id', 'class_phase'],
                                order: [['tla_id', 'ASC']],
                                raw: true
                            });
                            const inClassTla = tlas.find(t => t.class_phase === 'inclass');
                            targetTlaId = inClassTla ? inClassTla.tla_id : (tlas[0] ? tlas[0].tla_id : null);
                        }
                    }
                }

                if (!targetTlaId) continue;

                // 3) Remove old ILO-specific assessments (preserving formative assessments where ilo_id is null)
                await TLAAssessment.destroy({ where: { ilo_id: iloData.dbId } });

                // 4) Create updated ILO assessment(s) based on the edited weights
                const periods = ['prelim', 'midterm', 'semi', 'final'];
                for (const p of periods) {
                    const rawWeight = iloData.weight && iloData.weight[p];
                    if (rawWeight !== undefined && rawWeight !== null && String(rawWeight).trim() !== '') {
                        const parsedWeight = parseFloat(rawWeight);
                        if (!isNaN(parsedWeight) && parsedWeight > 0) {
                            const rawAssess = iloData.assessments;
                            const assessText = Array.isArray(rawAssess)
                                ? rawAssess.filter(Boolean).join(', ')
                                : (typeof rawAssess === 'string' ? rawAssess.trim() : '');
                            const finalName = (assessText || 'Assessment').slice(0, 70);
                            const finalDesc = existingDesc || assessText || 'Assessment';
                            const periodChar = getPeriodChar(p);

                            await TLAAssessment.create({
                                tla_id: targetTlaId,
                                ilo_id: iloData.dbId,
                                name: finalName,
                                description: finalDesc,
                                period: periodChar,
                                weight: String(parsedWeight),
                                min_passing: parseInt(iloData.minPassing, 10) || 60
                            });
                        }
                    }
                }
            }
        }

        return res.json({ message: 'Grading criteria updated' });
    } catch (err) {
        console.error('updateCourseCriteria error', err);
        return res.status(500).json({ message: 'Internal server error', error: err.message });
    }
}

module.exports = { getCourseCriteriaByPcOffering, updateCourseCriteriaByPcOffering };
