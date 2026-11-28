// controllers/courseCriteriaController.js
const {
    ProgramCourseOffering,
    CourseOutcome,
    IntendedLearningOutcome,
    Week,
    TeachingAndLearningActivity,
    TLAAssessment
} = require('../../models');
const {
    findOfferingByPcIdAndRev,
    markOfferingModified
} = require('../../utils/versionHelper');

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
    if (w == null || w === '') return null;
    const cleaned = String(w).replace('%', '').trim();
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
}

async function getCourseCriteriaByPcOffering(req, res) {
    try {
        const { pcId, revNum } = req.params;
        if (!pcId || !revNum) return res.status(400).json({ message: 'pcId and revNum are required' });

        const offering = await findOfferingByPcIdAndRev(pcId, revNum);
        const targetPcId = offering ? offering.pc_offering_id : pcId;

        // Direct fetch: Find course outcomes linked explicitly to this pc_offering_id
        const courseOutcomes = await CourseOutcome.findAll({
            where: { pc_offering_id: targetPcId },
            attributes: ['co_id', 'co_description'],
            order: [['co_id', 'ASC']]
        });

        // Also check if there is a base offering in case we need fallback weights
        let baseCourseOutcomes = [];
        if (offering && offering.base_pc_offering_id) {
            baseCourseOutcomes = await CourseOutcome.findAll({
                where: { pc_offering_id: offering.base_pc_offering_id },
                attributes: ['co_id', 'co_description'],
                order: [['co_id', 'ASC']]
            });
        }

        const defaultPeriodByCoIndex = ['prelim', 'midterm', 'semi', 'final'];
        const defaultWeightsByIloPos = [30, 30, 40];
        const gradingSystem = [];

        for (let coIndex = 0; coIndex < 4; coIndex++) {
            const coRecord = courseOutcomes[coIndex] || null;
            const baseCoRecord = baseCourseOutcomes[coIndex] || null;

            const allIlosForCo = coRecord
                ? await IntendedLearningOutcome.findAll({
                    where: { co_id: coRecord.co_id },
                    attributes: [
                        'ilo_id',
                        'description',
                        'is_orientation',
                        'assessment_tool',
                        'prelim_weight',
                        'midterm_weight',
                        'semi_weight',
                        'final_weight',
                        'target'
                    ],
                    order: [['ilo_id', 'ASC']]
                })
                : [];

            const baseIlosForCo = baseCoRecord
                ? await IntendedLearningOutcome.findAll({
                    where: { co_id: baseCoRecord.co_id },
                    attributes: [
                        'ilo_id',
                        'description',
                        'is_orientation',
                        'assessment_tool',
                        'prelim_weight',
                        'midterm_weight',
                        'semi_weight',
                        'final_weight',
                        'target'
                    ],
                    order: [['ilo_id', 'ASC']]
                })
                : [];

            // Filter out Course Orientation ILOs so only the 3 graded ILOs remain
            const gradedIlos = allIlosForCo.some(ilo => ilo.is_orientation)
                ? allIlosForCo.filter(ilo => !ilo.is_orientation)
                : (allIlosForCo.length === 4 ? allIlosForCo.slice(1) : allIlosForCo);

            const baseGradedIlos = baseIlosForCo.some(ilo => ilo.is_orientation)
                ? baseIlosForCo.filter(ilo => !ilo.is_orientation)
                : (baseIlosForCo.length === 4 ? baseIlosForCo.slice(1) : baseIlosForCo);

            const ilos = [];
            for (let iloPos = 0; iloPos < 3; iloPos++) {
                const iloLabel = `ILO${iloPos + 1}`;
                const iloRecord = gradedIlos[iloPos] || null;
                const baseIloRecord = baseGradedIlos[iloPos] || null;

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

                // 1) Fetch TLAAssessments linked to this specific graded ILO via ilo_id
                let assessments = await TLAAssessment.findAll({
                    where: { ilo_id: iloRecord.ilo_id },
                    attributes: ['method_id', 'tla_id', 'ilo_id', 'name', 'period', 'weight', 'min_passing'],
                    order: [['method_id', 'ASC']],
                    raw: true
                });

                const assessmentNames = [];
                const weightAcc = { prelim: 0, midterm: 0, semi: 0, final: 0 };
                let hasAnyWeight = false;
                let minPassingValue = null;

                // Check COAEP weights stored directly on IntendedLearningOutcomes first if present
                const iloPrelim = parseWeight(iloRecord.prelim_weight);
                const iloMidterm = parseWeight(iloRecord.midterm_weight);
                const iloSemi = parseWeight(iloRecord.semi_weight);
                const iloFinal = parseWeight(iloRecord.final_weight);
                const hasIloDirectWeights =
                    iloPrelim !== null || iloMidterm !== null || iloSemi !== null || iloFinal !== null;

                if (hasIloDirectWeights) {
                    if (iloRecord.assessment_tool) {
                        assessmentNames.push(
                            ...String(iloRecord.assessment_tool)
                                .split(',')
                                .map(s => s.trim())
                                .filter(Boolean)
                        );
                    }
                    if (iloPrelim) { weightAcc.prelim = iloPrelim; hasAnyWeight = true; }
                    if (iloMidterm) { weightAcc.midterm = iloMidterm; hasAnyWeight = true; }
                    if (iloSemi) { weightAcc.semi = iloSemi; hasAnyWeight = true; }
                    if (iloFinal) { weightAcc.final = iloFinal; hasAnyWeight = true; }
                    if (iloRecord.target != null && String(iloRecord.target).trim() !== '') {
                        const parsedTarget = parseInt(String(iloRecord.target).trim(), 10);
                        if (!isNaN(parsedTarget)) minPassingValue = parsedTarget;
                    }
                }

                if (!hasAnyWeight && assessments.length > 0) {
                    for (const a of assessments) {
                        if (a.name && !assessmentNames.includes(a.name)) assessmentNames.push(a.name);
                        const periodKey = normalizePeriod(a.period);
                        const w = parseWeight(a.weight);
                        if (periodKey && w !== null) {
                            weightAcc[periodKey] += w;
                            hasAnyWeight = true;
                        }
                        if (a.min_passing != null && minPassingValue == null) {
                            minPassingValue = Number(a.min_passing);
                        }
                    }
                }

                // 2) If weekly TLAs are blank on this new draft assignment, fall back to base offering's TLAAssessments or COAEP assessment_tool defaults
                if (!hasAnyWeight && baseIloRecord) {
                    const baseAssessments = await TLAAssessment.findAll({
                        where: { ilo_id: baseIloRecord.ilo_id },
                        attributes: ['method_id', 'tla_id', 'ilo_id', 'name', 'period', 'weight', 'min_passing'],
                        order: [['method_id', 'ASC']],
                        raw: true
                    });
                    for (const a of baseAssessments) {
                        if (a.name && !assessmentNames.includes(a.name)) assessmentNames.push(a.name);
                        const periodKey = normalizePeriod(a.period);
                        const w = parseWeight(a.weight);
                        if (periodKey && w !== null) {
                            weightAcc[periodKey] += w;
                            hasAnyWeight = true;
                        }
                        if (a.min_passing != null && minPassingValue == null) {
                            minPassingValue = Number(a.min_passing);
                        }
                    }
                }

                // 3) Final COAEP fallback from iloRecord.assessment_tool
                if (assessmentNames.length === 0 && iloRecord.assessment_tool) {
                    assessmentNames.push(iloRecord.assessment_tool);
                }
                if (!hasAnyWeight && iloRecord.assessment_tool) {
                    const defaultPeriodKey = defaultPeriodByCoIndex[coIndex] || 'prelim';
                    weightAcc[defaultPeriodKey] = defaultWeightsByIloPos[iloPos] || 30;
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

        if (!pcId || !revNum || !gradingSystem) return res.status(400).json({ message: 'Missing parameters' });

        const offering = await findOfferingByPcIdAndRev(pcId, revNum);
        const targetPcId = offering ? offering.pc_offering_id : Number(pcId);

        // Iterate through gradingSystem updates sent from frontend
        for (const group of gradingSystem) {
            for (let iloPos = 0; iloPos < group.ilos.length; iloPos++) {
                const iloData = group.ilos[iloPos];
                if (!iloData || !iloData.dbId) continue;

                const rawAssess = iloData.assessments;
                const assessText = Array.isArray(rawAssess)
                    ? rawAssess.filter(Boolean).join(', ')
                    : (typeof rawAssess === 'string' ? rawAssess.trim() : '');

                const prelimW = parseWeight(iloData.weight?.prelim);
                const midtermW = parseWeight(iloData.weight?.midterm);
                const semiW = parseWeight(iloData.weight?.semi);
                const finalW = parseWeight(iloData.weight?.final);
                const minPass = parseInt(iloData.minPassing, 10) || 60;

                // Always persist COAEP criteria on IntendedLearningOutcome so it works even when weekly TLAs are blank
                await IntendedLearningOutcome.update(
                    {
                        ...(assessText ? { assessment_tool: assessText.slice(0, 200) } : {}),
                        prelim_weight: prelimW,
                        midterm_weight: midtermW,
                        semi_weight: semiW,
                        final_weight: finalW,
                        target: String(minPass)
                    },
                    { where: { ilo_id: iloData.dbId } }
                );

                // Also sync with TLAAssessments if any weekly TLAs exist for this CO/ILO
                const existingAssessments = await TLAAssessment.findAll({
                    where: { ilo_id: iloData.dbId },
                    order: [['method_id', 'ASC']],
                    raw: true
                });

                let targetTlaId = existingAssessments.length > 0 ? existingAssessments[0].tla_id : null;
                const existingDesc = existingAssessments.length > 0 ? existingAssessments[0].description : null;

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

                await TLAAssessment.destroy({ where: { ilo_id: iloData.dbId } });

                const periods = ['prelim', 'midterm', 'semi', 'final'];
                for (const p of periods) {
                    const rawWeight = iloData.weight && iloData.weight[p];
                    if (rawWeight !== undefined && rawWeight !== null && String(rawWeight).trim() !== '') {
                        const parsedWeight = parseFloat(rawWeight);
                        if (!isNaN(parsedWeight) && parsedWeight > 0) {
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
                                min_passing: minPass
                            });
                        }
                    }
                }
            }
        }

        if (targetPcId) {
            await markOfferingModified(targetPcId);
        }

        return res.json({ message: 'Grading criteria updated' });
    } catch (err) {
        console.error('updateCourseCriteria error', err);
        return res.status(500).json({ message: 'Internal server error', error: err.message });
    }
}

module.exports = { getCourseCriteriaByPcOffering, updateCourseCriteriaByPcOffering };

