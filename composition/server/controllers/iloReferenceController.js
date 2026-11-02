// controllers/iloReferenceController.js
const { WeeklyReference, Reference, Week, IntendedLearningOutcome, sequelize } = require('../models');
const { Op } = require('sequelize');

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

async function getReferencesByILO(req, res) {
    try {
        const rawId = req.params.weekId || req.params.iloId;
        const isOrientation = parseIsOrientation(req.query.isOrientation ?? req.query.orientation);
        const week = await resolveWeekRecord(rawId);
        if (!week) return res.status(400).json({ message: 'Valid weekId is required' });
        const weekId = week.week_id;

        try {
            const rows = await WeeklyReference.findAll({
                where: { week_id: weekId, is_orientation: isOrientation },
                include: [{ model: Reference, as: 'Reference' }],
                order: [['weekly_reference_id', 'ASC']]
            });

            const assigned = rows.map(r => {
                const refObj = r.Reference || r.reference;
                return {
                    weekly_reference_id: r.weekly_reference_id,
                    ilo_reference_id: r.weekly_reference_id,
                    reference_id: r.reference_id,
                    week_id: r.week_id,
                    is_orientation: Boolean(r.is_orientation),
                    reference: refObj ? {
                        reference_id: refObj.reference_id,
                        title: refObj.title,
                        type: refObj.type,
                        author: refObj.author,
                        isbn: refObj.isbn,
                        link: refObj.link,
                        publication_year: refObj.publication_year
                    } : null
                };
            });

            return res.json(assigned);
        } catch (includeErr) {
            const rows = await sequelize.query(
                `SELECT wr.weekly_reference_id,
                        wr.reference_id,
                        wr.week_id,
                        wr.is_orientation,
                        r.reference_id   AS ref_reference_id,
                        r.title          AS ref_title,
                        r.type           AS ref_type,
                        r.author         AS ref_author,
                        r.isbn           AS ref_isbn,
                        r.link           AS ref_link,
                        r.publication_year AS ref_publication_year
                 FROM \`WeeklyReferences\` wr
                 LEFT JOIN \`References\` r ON r.reference_id = wr.reference_id
                 WHERE wr.week_id = :weekId AND wr.is_orientation = :isOrientation
                 ORDER BY wr.weekly_reference_id ASC;`,
                { replacements: { weekId, isOrientation: isOrientation ? 1 : 0 }, type: sequelize.QueryTypes.SELECT }
            );

            const assigned = rows.map(r => ({
                weekly_reference_id: r.weekly_reference_id,
                ilo_reference_id: r.weekly_reference_id,
                reference_id: r.reference_id,
                week_id: r.week_id,
                is_orientation: Boolean(r.is_orientation),
                reference: r.ref_reference_id ? {
                    reference_id: r.ref_reference_id,
                    title: r.ref_title,
                    type: r.ref_type,
                    author: r.ref_author,
                    isbn: r.ref_isbn,
                    link: r.ref_link,
                    publication_year: r.ref_publication_year
                } : null
            }));

            return res.json(assigned);
        }
    } catch (err) {
        console.error('getReferencesByILO error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function assignReferencesToILO(req, res) {
    const t = await sequelize.transaction();
    try {
        const rawWeekId = req.body.week_id || req.body.ilo_id;
        const { reference_ids } = req.body;
        const isOrientation = parseIsOrientation(req.body.is_orientation ?? req.body.isOrientation ?? req.query.isOrientation);

        if (!rawWeekId || !Array.isArray(reference_ids)) {
            await t.rollback();
            return res.status(400).json({ message: 'week_id and reference_ids array are required' });
        }

        const week = await resolveWeekRecord(rawWeekId);
        if (!week) {
            await t.rollback();
            return res.status(404).json({ message: 'Week not found' });
        }
        const week_id = week.week_id;

        if (reference_ids.length > 0) {
            const found = await Reference.findAll({
                where: { reference_id: { [Op.in]: reference_ids } },
                attributes: ['reference_id'],
                transaction: t,
                raw: true
            });
            const foundIds = found.map(r => r.reference_id);
            const missing = reference_ids.filter(id => !foundIds.includes(id));
            if (missing.length) {
                await t.rollback();
                return res.status(400).json({ message: 'Some references not found', missing });
            }
        }

        // Preserve existing weekly_reference_id values so CommentTargets remain intact
        const existingRows = await WeeklyReference.findAll({
            where: { week_id, is_orientation: isOrientation },
            order: [['weekly_reference_id', 'ASC']],
            transaction: t,
            raw: true
        });

        const uniqueRefIds = [...new Set(reference_ids.map(Number).filter(Boolean))];
        const usedWeeklyRefIds = new Set();
        const desiredItems = uniqueRefIds.map(rid => ({ reference_id: rid, matched_id: null }));

        // Pass 1: Match by identical reference_id
        for (const item of desiredItems) {
            const match = existingRows.find(er =>
                !usedWeeklyRefIds.has(Number(er.weekly_reference_id)) &&
                Number(er.reference_id) === Number(item.reference_id)
            );
            if (match) {
                item.matched_id = Number(match.weekly_reference_id);
                usedWeeklyRefIds.add(item.matched_id);
            }
        }

        // Pass 2: Reuse any remaining existing rows in order
        for (const item of desiredItems) {
            if (item.matched_id) continue;
            const match = existingRows.find(er => !usedWeeklyRefIds.has(Number(er.weekly_reference_id)));
            if (match) {
                item.matched_id = Number(match.weekly_reference_id);
                usedWeeklyRefIds.add(item.matched_id);
            }
        }

        for (const item of desiredItems) {
            if (item.matched_id) {
                await WeeklyReference.update({
                    reference_id: item.reference_id,
                    week_id,
                    is_orientation: isOrientation,
                    updatedAt: new Date()
                }, {
                    where: { weekly_reference_id: item.matched_id },
                    transaction: t
                });
            } else {
                await WeeklyReference.create({
                    reference_id: item.reference_id,
                    week_id,
                    is_orientation: isOrientation,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }, { transaction: t });
            }
        }

        const idsToDelete = existingRows
            .map(er => Number(er.weekly_reference_id))
            .filter(id => !usedWeeklyRefIds.has(id));

        if (idsToDelete.length > 0) {
            await WeeklyReference.destroy({
                where: { weekly_reference_id: { [Op.in]: idsToDelete } },
                transaction: t
            });
        }

        await t.commit();
        return res.json({ message: 'Assigned weekly references updated', assignedCount: uniqueRefIds.length });
    } catch (err) {
        await t.rollback();
        console.error('assignReferencesToILO error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function deleteILOReference(req, res) {
    try {
        const id = Number(req.params.iloReferenceId);
        if (!id) return res.status(400).json({ message: 'weeklyReferenceId is required' });

        const deleted = await WeeklyReference.destroy({ where: { weekly_reference_id: id } });
        if (!deleted) return res.status(404).json({ message: 'WeeklyReference not found' });

        return res.json({ message: 'Deleted' });
    } catch (err) {
        console.error('deleteILOReference error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = { getReferencesByILO, assignReferencesToILO, deleteILOReference };
