const db = require('../models');
const { Week, CourseOutcome, IntendedLearningOutcome, sequelize } = db;
const { Op } = require('sequelize');

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

        return res.json({
            week_id: weekId,
            is_orientation: isOrientation,
            tlas,
            assessmentTypeSuggestions: Array.from(assessmentTypesSet)
        });
    } catch (err) {
        console.error('getTlasForIlo error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Master Sync Function: Updates all TLAs and their assessments for a specific Week & Orientation context
async function syncTlasToIlo(req, res) {
    const t = await sequelize.transaction();
    try {
        const rawId = req.params.weekId || req.params.iloId;
        const { tlas } = req.body;
        const isOrientation = parseIsOrientation(req.body.is_orientation ?? req.body.isOrientation ?? req.query.isOrientation);

        const week = await resolveWeekRecord(rawId);
        if (!week || !Array.isArray(tlas)) {
            await t.rollback();
            return res.status(400).json({ message: 'Invalid payload or weekId' });
        }
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
                    description: (tlaData.assessmentDetail || '').trim()
                };

                if (existingAssessment) {
                    await TLAAssessment.update(assessmentPayload, {
                        where: { method_id: existingAssessment.method_id },
                        transaction: t
                    });
                } else {
                    await TLAAssessment.create({
                        tla_id: currentTlaId,
                        ilo_id: tlaData.assessmentIloId || null,
                        name: assessmentPayload.name,
                        description: assessmentPayload.description,
                        period: tlaData.assessmentPeriod || defaultPeriod,
                        weight: tlaData.assessmentWeight != null ? String(tlaData.assessmentWeight) : '0',
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
