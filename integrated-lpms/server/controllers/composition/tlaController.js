const db = require('../../models');
const { Week, CourseOutcome, IntendedLearningOutcome, sequelize } = db;
const { Op } = require('sequelize');
const {
    resolveWeekLineageContext,
    markOfferingModified
} = require('../../utils/versionHelper');

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

function formatPhaseForUi(val) {
    const norm = normalizePhaseForDb(val);
    if (norm === 'preclass') return 'Pre-class';
    if (norm === 'inclass') return 'In-class';
    if (norm === 'postclass') return 'Post-class';
    if (norm === 'asynchronous') return 'Asynchronous';
    if (norm === 'synchronous') return 'Synchronous';
    return 'In-class';
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

/**
 * COMP-011: Fetch TLAs and Assessments from prior approved/historical revisions for the matching week.
 * Maps any linked TLAAssessment.ilo_id from the prior revision to the current offering's corresponding ilo_id.
 */
async function getPreviousTlas(req, res) {
    try {
        const rawWeekId = req.params.weekId || req.query.weekId || req.params.iloId;
        const isOrientation = parseIsOrientation(req.query.isOrientation ?? req.query.orientation);
        const requestedPcOfferingId = req.query.sourcePcOfferingId
            ? Number(req.query.sourcePcOfferingId)
            : null;

        const week = await resolveWeekRecord(rawWeekId);
        if (!week) {
            return res.status(400).json({ message: 'Valid weekId is required' });
        }

        const lineage = await resolveWeekLineageContext(week.week_id);
        if (!lineage) {
            return res.status(404).json({ message: 'Week lineage context not found' });
        }

        const priorOfferings = lineage.priorOfferings || [];
        if (priorOfferings.length === 0) {
            return res.json({
                hasPreviousRevision: false,
                weekNumber: lineage.weekNumber,
                isOrientation,
                revisions: [],
                tlas: []
            });
        }

        const targetPriorOffering =
            (requestedPcOfferingId &&
                priorOfferings.find((po) => Number(po.pc_offering_id) === requestedPcOfferingId)) ||
            priorOfferings[0];

        // Build ILO mapping from targetPriorOffering's ILOs -> current offering's ILOs
        const currentFlatIlos = [];
        (lineage.allOfferingCos || []).forEach((coItem, cIdx) => {
            const sortedIlos = [...(coItem.ilos || coItem.IntendedLearningOutcomes || [])].sort(
                (a, b) => Number(a.ilo_id) - Number(b.ilo_id)
            );
            sortedIlos.forEach((iloItem, iIdx) => {
                currentFlatIlos.push({
                    ilo_id: Number(iloItem.ilo_id),
                    coIndex: cIdx,
                    iloIndex: iIdx,
                    is_orientation: Boolean(iloItem.is_orientation),
                    normDesc: String(iloItem.description || '').trim().toLowerCase()
                });
            });
        });

        const priorIloToCurrentIloMap = new Map();
        (targetPriorOffering.courseOutcomes || []).forEach((priorCo, cIdx) => {
            const sortedPriorIlos = [...(priorCo.ilos || priorCo.IntendedLearningOutcomes || [])].sort(
                (a, b) => Number(a.ilo_id) - Number(b.ilo_id)
            );
            sortedPriorIlos.forEach((pIlo, iIdx) => {
                const pNormDesc = String(pIlo.description || '').trim().toLowerCase();
                const exactDescMatch = currentFlatIlos.find((c) => c.normDesc === pNormDesc);
                const posMatch = currentFlatIlos.find(
                    (c) => c.coIndex === cIdx && c.iloIndex === iIdx
                );
                const mappedId = exactDescMatch
                    ? exactDescMatch.ilo_id
                    : posMatch
                      ? posMatch.ilo_id
                      : null;
                if (mappedId) {
                    priorIloToCurrentIloMap.set(Number(pIlo.ilo_id), mappedId);
                }
            });
        });

        const matchingPriorWeek = (targetPriorOffering.weeks || []).find(
            (w) => Number(w.week_number) === Number(lineage.weekNumber)
        );

        const mappedTlas = [];
        if (matchingPriorWeek) {
            const priorTlaRows = await TLA.findAll({
                where: {
                    week_id: matchingPriorWeek.week_id,
                    is_orientation: isOrientation
                },
                order: [['tla_id', 'ASC']]
            });
            const priorTlaIds = priorTlaRows.map((r) => r.tla_id);
            const priorAssessments =
                priorTlaIds.length > 0
                    ? await TLAAssessment.findAll({
                          where: { tla_id: { [Op.in]: priorTlaIds } },
                          order: [['method_id', 'ASC']]
                      })
                    : [];

            priorTlaRows.forEach((tlaObj) => {
                const matchingAss = priorAssessments.find(
                    (a) => Number(a.tla_id) === Number(tlaObj.tla_id)
                );
                const mappedIloId =
                    matchingAss && matchingAss.ilo_id
                        ? priorIloToCurrentIloMap.get(Number(matchingAss.ilo_id)) || null
                        : null;

                mappedTlas.push({
                    sourceTlaId: Number(tlaObj.tla_id),
                    tlaName: tlaObj.tla_name || '',
                    tlaDescription: tlaObj.description || '',
                    performedBy:
                        tlaObj.performed_by === 'T'
                            ? 'Instructor'
                            : tlaObj.performed_by === 'S'
                              ? 'Student'
                              : tlaObj.performed_by || 'Student',
                    classPhase: formatPhaseForUi(tlaObj.class_phase),
                    isLab: Boolean(tlaObj.is_lab),
                    laboratory: Boolean(tlaObj.is_lab),
                    is_orientation: Boolean(tlaObj.is_orientation),
                    assessmentType: matchingAss ? matchingAss.name || '' : '',
                    assessmentDetail: matchingAss ? matchingAss.description || '' : '',
                    assessmentIloId: mappedIloId,
                    assessmentPeriod: matchingAss ? matchingAss.period : null,
                    assessmentWeight: matchingAss ? matchingAss.weight : null
                });
            });
        }

        return res.json({
            hasPreviousRevision: true,
            weekNumber: lineage.weekNumber,
            isOrientation,
            selectedRevision: {
                pc_offering_id: targetPriorOffering.pc_offering_id,
                revision_number: targetPriorOffering.revision_number,
                termLabel: targetPriorOffering.termLabel,
                status: targetPriorOffering.status
            },
            revisions: priorOfferings.map((po) => ({
                pc_offering_id: po.pc_offering_id,
                revision_number: po.revision_number,
                termLabel: po.termLabel,
                status: po.status
            })),
            tlas: mappedTlas
        });
    } catch (err) {
        console.error('getPreviousTlas error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

/**
 * Helper: Build a lookup map from any prior offering's ilo_id -> current offering's corresponding ilo_id
 */
function buildPriorToCurrentIloMap(lineage, offeringsToMap = []) {
    const currentFlatIlos = [];
    (lineage.allOfferingCos || []).forEach((coItem, cIdx) => {
        const sortedIlos = [...(coItem.ilos || coItem.IntendedLearningOutcomes || [])].sort(
            (a, b) => Number(a.ilo_id) - Number(b.ilo_id)
        );
        sortedIlos.forEach((iloItem, iIdx) => {
            currentFlatIlos.push({
                ilo_id: Number(iloItem.ilo_id),
                coIndex: cIdx,
                iloIndex: iIdx,
                is_orientation: Boolean(iloItem.is_orientation),
                normDesc: String(iloItem.description || '').trim().toLowerCase()
            });
        });
    });

    const currentIloIdSet = new Set(currentFlatIlos.map(c => c.ilo_id));
    const map = new Map();
    currentFlatIlos.forEach(c => map.set(c.ilo_id, c.ilo_id));

    offeringsToMap.forEach((priorOff) => {
        (priorOff.courseOutcomes || []).forEach((priorCo, cIdx) => {
            const sortedPriorIlos = [...(priorCo.ilos || priorCo.IntendedLearningOutcomes || [])].sort(
                (a, b) => Number(a.ilo_id) - Number(b.ilo_id)
            );
            sortedPriorIlos.forEach((pIlo, iIdx) => {
                const pId = Number(pIlo.ilo_id);
                if (currentIloIdSet.has(pId)) return;
                const pNormDesc = String(pIlo.description || '').trim().toLowerCase();
                const exactDescMatch = currentFlatIlos.find((c) => c.normDesc === pNormDesc);
                const posMatch = currentFlatIlos.find(
                    (c) => c.coIndex === cIdx && c.iloIndex === iIdx
                );
                const mappedId = exactDescMatch
                    ? exactDescMatch.ilo_id
                    : posMatch
                      ? posMatch.ilo_id
                      : null;
                if (mappedId) {
                    map.set(pId, mappedId);
                }
            });
        });
    });

    return map;
}

/**
 * Course-scoped available TLAs for the TLA Search Bar Dropdown (GET /api/tlas/available)
 * Mirrors GET /api/topics/available:
 * 1. Strictly scoped to the active course_id and orientation flag (zero cross-course leakage).
 * 2. Top priority section: TLAs from the matching week of the latest previous revision (isPrevMatchingWeek: true).
 * 3. Bottom section: All other deduplicated TLAs belonging to the course across all terms/revisions (isPrevMatchingWeek: false), sorted alphabetically.
 */
async function getAvailableTlas(req, res) {
    try {
        const rawWeekId = req.query.weekId || req.query.iloId;
        const isOrientation = parseIsOrientation(req.query.isOrientation ?? req.query.orientation);

        const week = await resolveWeekRecord(rawWeekId);
        if (!week) {
            return res.status(400).json({ message: 'Valid weekId is required' });
        }

        const lineage = await resolveWeekLineageContext(week.week_id);
        if (!lineage) {
            return res.json([]);
        }

        const priorOfferings = lineage.priorOfferings || [];
        const latestPriorOffering = priorOfferings[0] || null;
        const iloMap = buildPriorToCurrentIloMap(lineage, priorOfferings);

        const allCourseWeekIdsSet = new Set((lineage.allCurrentOfferingWeekIds || []).map(Number));
        priorOfferings.forEach((po) => {
            (po.weeks || []).forEach((w) => allCourseWeekIdsSet.add(Number(w.week_id)));
        });
        const allCourseWeekIds = Array.from(allCourseWeekIdsSet).filter(Boolean);

        if (allCourseWeekIds.length === 0) {
            return res.json([]);
        }

        const allTlaRows = await TLA.findAll({
            where: {
                week_id: { [Op.in]: allCourseWeekIds },
                is_orientation: isOrientation
            },
            order: [['tla_id', 'ASC']]
        });

        if (allTlaRows.length === 0) {
            return res.json([]);
        }

        const allTlaIds = allTlaRows.map((r) => r.tla_id);
        const allAssessments = await TLAAssessment.findAll({
            where: { tla_id: { [Op.in]: allTlaIds } },
            order: [['method_id', 'ASC']]
        });

        const assessmentByTlaId = new Map();
        allAssessments.forEach((a) => {
            const tid = Number(a.tla_id);
            if (!assessmentByTlaId.has(tid)) {
                assessmentByTlaId.set(tid, a);
            }
        });

        const serializeTlaOption = (tlaObj, extra = {}) => {
            const matchingAss = assessmentByTlaId.get(Number(tlaObj.tla_id));
            const mappedIloId =
                matchingAss && matchingAss.ilo_id
                    ? iloMap.get(Number(matchingAss.ilo_id)) || null
                    : null;

            return {
                sourceTlaId: Number(tlaObj.tla_id),
                tlaName: (tlaObj.tla_name || '').trim(),
                tlaDescription: (tlaObj.description || '').trim(),
                performedBy:
                    tlaObj.performed_by === 'T'
                        ? 'Instructor'
                        : tlaObj.performed_by === 'S'
                          ? 'Student'
                          : tlaObj.performed_by || 'Student',
                classPhase: formatPhaseForUi(tlaObj.class_phase),
                isLab: Boolean(tlaObj.is_lab),
                laboratory: Boolean(tlaObj.is_lab),
                is_orientation: Boolean(tlaObj.is_orientation),
                assessmentType: matchingAss ? matchingAss.name || '' : '',
                assessmentDetail: matchingAss ? matchingAss.description || '' : '',
                assessmentIloId: mappedIloId,
                assessmentPeriod: matchingAss ? matchingAss.period : null,
                assessmentWeight: matchingAss ? matchingAss.weight : null,
                ...extra
            };
        };

        // 1. Latest previous revision's matching-week TLAs (prioritized on top)
        const prevMatchingWeekTlas = [];
        const seenNormalizedNames = new Set();

        const matchingPriorWeek = latestPriorOffering
            ? (latestPriorOffering.weeks || []).find(
                  (w) => Number(w.week_number) === Number(lineage.weekNumber)
              )
            : null;

        if (matchingPriorWeek) {
            const matchingRows = allTlaRows.filter(
                (r) => Number(r.week_id) === Number(matchingPriorWeek.week_id)
            );
            matchingRows.forEach((tlaObj) => {
                const normName = String(tlaObj.tla_name || '').trim().toLowerCase();
                if (!normName || seenNormalizedNames.has(normName)) return;
                seenNormalizedNames.add(normName);
                prevMatchingWeekTlas.push(
                    serializeTlaOption(tlaObj, {
                        isPrevMatchingWeek: true,
                        prevRevisionNumber: latestPriorOffering.revision_number,
                        prevTermLabel: latestPriorOffering.termLabel,
                        prevWeekNumber: lineage.weekNumber
                    })
                );
            });
        }

        // 2. All remaining deduplicated TLAs for this course (sorted alphabetically)
        const otherCourseTlas = [];
        allTlaRows.forEach((tlaObj) => {
            const normName = String(tlaObj.tla_name || '').trim().toLowerCase();
            if (!normName || seenNormalizedNames.has(normName)) return;
            seenNormalizedNames.add(normName);
            otherCourseTlas.push(
                serializeTlaOption(tlaObj, {
                    isPrevMatchingWeek: false
                })
            );
        });

        otherCourseTlas.sort((a, b) => a.tlaName.localeCompare(b.tlaName));

        return res.json([...prevMatchingWeekTlas, ...otherCourseTlas]);
    } catch (err) {
        console.error('getAvailableTlas error:', err);
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
        let pcOfferingId = null;
        const currentCo = await CourseOutcome.findByPk(week.co_id, { transaction: t });
        if (currentCo) {
            pcOfferingId = currentCo.pc_offering_id;
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
                    ...(tlaData.assessmentIloId !== undefined ? { ilo_id: tlaData.assessmentIloId || null } : {}),
                    ...(tlaData.assessmentPeriod ? { period: tlaData.assessmentPeriod } : {}),
                    ...(tlaData.assessmentWeight != null ? { weight: String(tlaData.assessmentWeight) } : {})
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

        if (pcOfferingId) {
            await markOfferingModified(pcOfferingId, t);
        }

        await t.commit();
        return res.json({ message: 'Successfully synced TLAs and Assessments for week.' });
    } catch (err) {
        await t.rollback();
        console.error('syncTlasToIlo error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = { getTlasForIlo, getPreviousTlas, getAvailableTlas, syncTlasToIlo };

