const db = require('../models');
const { Week, CourseOutcome, IntendedLearningOutcome, sequelize } = db;
const { Op } = require('sequelize');
const { PERIOD_LABELS, periodForWeek, parseWeight, formatWeight } = require('../utils/assessmentWeights');
const { IED_WEIGHTS } = require('../utils/iedRule');
const { loadOfferingAssessments } = require('../utils/offeringAssessments');

// A weight of 0 is an ungraded (practice) assessment; otherwise 0 < weight <= 100. null = not a weight.
const weightOf = (value) => (/^\s*0+(\.0+)?\s*%?\s*$/.test(String(value ?? '')) ? 0 : parseWeight(value));

const TLA = db.TeachingAndLearningActivity;
const TLAAssessment = db.TLAAssessment;

function parseIsOrientation(val) {
    if (typeof val === 'boolean') return val;
    if (val === 1 || val === '1') return true;
    if (typeof val === 'string') {
        const lower = val.trim().toLowerCase();
        return lower === 'true' || lower === 'yes' || lower === 'orientation';
    }
    return false;
}

async function resolveWeekRecord(rawId) {
    const id = Number(rawId);
    if (!id) return null;

    let week = await Week.findByPk(id);
    if (week) return week;

    const ilo = await IntendedLearningOutcome.findByPk(id);
    if (ilo) {
        week = await Week.findOne({
            where: { co_id: ilo.co_id },
            order: [['week_id', 'ASC']]
        });
        if (week) return week;
    }

    week = await Week.findOne({
        where: { co_id: id },
        order: [['week_id', 'ASC']]
    });
    return week;
}

function normalizePhaseForDb(val) {
    if (!val) return 'inclass';
    const v = String(val).toLowerCase().replace(/[\s-]/g, '');
    if (v.includes('pre')) return 'preclass';
    if (v.includes('in')) return 'inclass';
    if (v.includes('post')) return 'postclass';
    if (v.includes('async')) return 'asynchronous';
    if (v.includes('sync')) return 'synchronous';
    return String(val).slice(0, 30);
}

// The week's position in the offering (1-based, weeks in course-outcome order), its
// course outcome's ILOs (an assessment names the ILO it assesses), and the offering.
async function loadWeekContext(week) {
    const currentCo = await CourseOutcome.findByPk(week.co_id);
    if (!currentCo) return { weekNumber: null, ilos: [], offeringId: null };
    const cos = await CourseOutcome.findAll({
        where: { pc_offering_id: currentCo.pc_offering_id }, attributes: ['co_id'], order: [['co_id', 'ASC']], raw: true
    });
    const weeks = await Week.findAll({
        where: { co_id: cos.map(co => co.co_id) }, attributes: ['week_id', 'co_id'], raw: true
    });
    const coOrder = new Map(cos.map((co, index) => [co.co_id, index]));
    weeks.sort((a, b) => (coOrder.get(a.co_id) - coOrder.get(b.co_id)) || (a.week_id - b.week_id));
    const position = weeks.findIndex(w => Number(w.week_id) === Number(week.week_id));
    const ilos = await IntendedLearningOutcome.findAll({
        where: { co_id: week.co_id },
        attributes: ['ilo_id', 'description', 'ied_level', 'is_orientation'],
        order: [['ilo_id', 'ASC']],
        raw: true
    });
    return { weekNumber: position >= 0 ? position + 1 : null, ilos, offeringId: currentCo.pc_offering_id };
}

// Fetch initialization data for the form by weekId and orientation flag
async function getTlasForIlo(req, res) {
    try {
        const rawId = req.params.weekId || req.params.iloId;
        const isOrientation = parseIsOrientation(req.query.isOrientation ?? req.query.orientation);
        const week = await resolveWeekRecord(rawId);
        if (!week) return res.status(400).json({ message: 'Valid weekId is required' });
        const weekId = week.week_id;

        const tlaRecords = await TLA.findAll({
            where: { week_id: weekId, is_orientation: isOrientation },
            order: [['tla_id', 'ASC']]
        });
        const tlaIds = tlaRecords.map(t => t.tla_id);

        const assessmentRecords = tlaIds.length > 0
            ? await TLAAssessment.findAll({
                  where: { tla_id: tlaIds },
                  order: [['method_id', 'ASC']]
              })
            : [];

        const tlas = tlaRecords.map(tlaObj => {
            const tlaId = tlaObj.tla_id;
            const matchingAss = assessmentRecords.find(a => a.tla_id === tlaId);

            const assessmentType = matchingAss ? (matchingAss.name || '') : '';
            const assessmentDetail = matchingAss ? (matchingAss.description || '') : '';

            return {
                id: tlaId,
                week_id: tlaObj.week_id,
                is_orientation: Boolean(tlaObj.is_orientation),
                performedBy: tlaObj.performed_by || tlaObj.performedBy || '',
                tlaName: tlaObj.tla_name || tlaObj.tlaName || '',
                classPhase: tlaObj.class_phase || tlaObj.classPhase || '',
                tlaDescription: tlaObj.description || tlaObj.tlaDescription || '',
                laboratory: Boolean(tlaObj.is_lab || tlaObj.isLab || false),
                isLab: Boolean(tlaObj.is_lab || tlaObj.isLab || false),
                assessmentType,
                assessmentDetail,
                assessmentIloId: matchingAss ? matchingAss.ilo_id : null,
                assessmentPeriod: matchingAss ? matchingAss.period : null,
                assessmentWeight: matchingAss ? matchingAss.weight : null
            };
        });

        const allAssessments = await TLAAssessment.findAll({ attributes: ['name'] });
        const assessmentTypesSet = new Set();
        allAssessments.forEach(a => {
            if (a.name) {
                assessmentTypesSet.add(a.name.trim());
            }
        });

        // Context for the assessment fields: the period this week falls in, the ILOs an
        // assessment can name, and how much of each level's course-wide weight the
        // assessments outside this form already use.
        const { weekNumber, ilos, offeringId } = await loadWeekContext(week);
        const editedTlaIds = new Set(tlaIds.map(Number));
        const usedElsewhere = { I: 0, E: 0, D: 0 };
        if (offeringId) {
            for (const row of await loadOfferingAssessments(offeringId)) {
                if (editedTlaIds.has(Number(row.tla_id)) || row.is_orientation || !(row.ied_level in usedElsewhere)) continue;
                usedElsewhere[row.ied_level] += parseWeight(row.weight) ?? 0;
            }
        }
        const levelWeights = Object.fromEntries(Object.keys(IED_WEIGHTS).map(level =>
            [level, { level, target: IED_WEIGHTS[level], usedElsewhere: Number(formatWeight(usedElsewhere[level])) }]));

        return res.json({
            week_id: weekId,
            is_orientation: isOrientation,
            tlas,
            assessmentTypeSuggestions: Array.from(assessmentTypesSet),
            suggestedPeriod: isOrientation ? null : periodForWeek(weekNumber),
            ilos: ilos.map(ilo => ({
                id: ilo.ilo_id,
                description: ilo.description,
                iedLevel: ilo.ied_level || null,
                isOrientation: !!ilo.is_orientation
            })),
            levelWeights
        });
    } catch (err) {
        console.error('getTlasForIlo error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Master Sync Function: Updates all TLAs and their assessments for a specific Week & Orientation context
async function syncTlasToIlo(req, res) {
    // Refusals are decided before the transaction opens: the server shares one SQLite
    // connection, so a rollback would also undo another request's write.
    const rawId = req.params.weekId || req.params.iloId;
    const { tlas } = req.body;
    const isOrientation = parseIsOrientation(req.body.is_orientation ?? req.body.isOrientation ?? req.query.isOrientation);

    let week;
    let weekIlos;
    try {
        week = await resolveWeekRecord(rawId);
        if (!week || !Array.isArray(tlas)) {
            return res.status(400).json({ message: 'Invalid payload or weekId' });
        }
        weekIlos = await IntendedLearningOutcome.findAll({ where: { co_id: week.co_id }, attributes: ['ilo_id'], raw: true });
    } catch (err) {
        console.error('syncTlasToIlo error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
    const weekIloIds = new Set(weekIlos.map(ilo => Number(ilo.ilo_id)));

    // An assessment needs an explicit period and weight. A graded one (weight above 0) names the ILO of this
    // week's course outcome it assesses (the only one when there is just one); an ungraded one may name none.
    for (const item of tlas) {
        const hasAssessment = Boolean(
            (item.assessmentType && String(item.assessmentType).trim()) ||
            (item.assessmentDetail && String(item.assessmentDetail).trim())
        );
        if (!hasAssessment) continue;
        const label = item.assessmentType || item.tlaName || 'this assessment';
        if (!PERIOD_LABELS[item.assessmentPeriod]) {
            return res.status(400).json({ message: `Choose a period (Prelim, Midterm, Semi-final or Final) for ${label}.` });
        }
        const weight = weightOf(item.assessmentWeight);
        if (weight === null) {
            return res.status(400).json({ message: `Enter a weight from 0 to 100 for ${label}.` });
        }
        if (item.assessmentIloId != null && item.assessmentIloId !== '' && !weekIloIds.has(Number(item.assessmentIloId))) {
            return res.status(400).json({ message: `The ILO chosen for ${label} is not part of this week's course outcome.` });
        }
        if ((item.assessmentIloId == null || item.assessmentIloId === '') && weight > 0) {
            if (weekIloIds.size !== 1) {
                return res.status(400).json({ message: `Choose the ILO that ${label} assesses.` });
            }
            item.assessmentIloId = [...weekIloIds][0];
        }
        if (item.assessmentIloId === '') item.assessmentIloId = null;
    }

    const t = await sequelize.transaction();
    try {
        const weekId = week.week_id;

        // Determine the default grading period ('p', 'm', 's', 'f') from the Course Outcome position
        let defaultPeriod = 'p';
        const currentCo = await CourseOutcome.findByPk(week.co_id, { transaction: t });
        if (currentCo) {
            const allCos = await CourseOutcome.findAll({
                where: { pc_offering_id: currentCo.pc_offering_id },
                order: [['co_id', 'ASC']],
                transaction: t
            });
            const coIdx = allCos.findIndex(c => c.co_id === currentCo.co_id);
            const periodChars = ['p', 'm', 's', 'f'];
            if (coIdx >= 0 && coIdx < periodChars.length) {
                defaultPeriod = periodChars[coIdx];
            }
        }

        // Find existing TLAs in DB ONLY for this (week_id, is_orientation) context
        const existingTlaRows = await TLA.findAll({
            where: { week_id: weekId, is_orientation: isOrientation },
            attributes: ['tla_id'],
            transaction: t,
            raw: true
        });
        const existingTlaIds = new Set(existingTlaRows.map(r => Number(r.tla_id)));

        // Identify which existing DB TLA IDs are kept in the incoming payload
        const incomingExistingIds = new Set(
            tlas
                .map(item => Number(item.id))
                .filter(id => Number.isInteger(id) && existingTlaIds.has(id))
        );

        // Delete TLAs that were removed by the user in this (week_id, is_orientation) context
        const tlaIdsToDelete = [...existingTlaIds].filter(id => !incomingExistingIds.has(id));
        if (tlaIdsToDelete.length > 0) {
            await TLAAssessment.destroy({ where: { tla_id: { [Op.in]: tlaIdsToDelete } }, transaction: t });
            await TLA.destroy({
                where: { tla_id: { [Op.in]: tlaIdsToDelete }, week_id: weekId, is_orientation: isOrientation },
                transaction: t
            });
        }

        for (const tlaData of tlas) {
            let currentTlaId = Number(tlaData.id);
            const isExisting = Number.isInteger(currentTlaId) && existingTlaIds.has(currentTlaId);

            const performedByCode = tlaData.performedBy === 'Instructor'
                ? 'T'
                : (tlaData.performedBy === 'Student' ? 'S' : (tlaData.performedBy || 'S'));

            const tlaPayload = {
                week_id: weekId,
                tla_name: (tlaData.tlaName || '').trim(),
                class_phase: normalizePhaseForDb(tlaData.classPhase),
                performed_by: String(performedByCode).slice(0, 1),
                description: (tlaData.tlaDescription || '').trim(),
                is_lab: Boolean(tlaData.isLab),
                is_orientation: isOrientation
            };

            if (isExisting) {
                await TLA.update(tlaPayload, { where: { tla_id: currentTlaId }, transaction: t });
            } else {
                const newTla = await TLA.create(tlaPayload, { transaction: t });
                currentTlaId = newTla.tla_id || newTla.id;
            }

            // Upsert TLAAssessment
            const existingAssessment = await TLAAssessment.findOne({ where: { tla_id: currentTlaId }, transaction: t });

            const hasAssessment = Boolean(
                (tlaData.assessmentType && String(tlaData.assessmentType).trim()) ||
                (tlaData.assessmentDetail && String(tlaData.assessmentDetail).trim())
            );

            if (hasAssessment) {
                const assessmentPayload = {
                    name: (tlaData.assessmentType || 'Assessment').trim().slice(0, 70),
                    description: (tlaData.assessmentDetail || '').trim(),
                    ilo_id: tlaData.assessmentIloId == null ? null : Number(tlaData.assessmentIloId),
                    period: tlaData.assessmentPeriod,
                    weight: formatWeight(weightOf(tlaData.assessmentWeight))
                };

                if (existingAssessment) {
                    await TLAAssessment.update(assessmentPayload, {
                        where: { method_id: existingAssessment.method_id },
                        transaction: t
                    });
                } else {
                    await TLAAssessment.create({
                        tla_id: currentTlaId,
                        ilo_id: assessmentPayload.ilo_id,
                        name: assessmentPayload.name,
                        description: assessmentPayload.description,
                        period: assessmentPayload.period || defaultPeriod,
                        weight: assessmentPayload.weight,
                        min_passing: 60
                    }, { transaction: t });
                }
            } else if (existingAssessment) {
                await TLAAssessment.destroy({ where: { method_id: existingAssessment.method_id }, transaction: t });
            }
        }

        await t.commit();
        return res.json({ message: 'Successfully synced TLAs and Assessments for week.' });
    } catch (err) {
        await t.rollback();
        console.error('syncTlasToIlo error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = { getTlasForIlo, syncTlasToIlo };
