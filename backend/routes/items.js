import { Router } from 'express';
import { Op } from 'sequelize';
import { AssessmentItem, IloItem, CourseOutcome, sequelize } from '../models/index.js';
import { lockGuard } from '../middleware/lockGuard.js';

const router = Router();

router.get('/:code/:period/items', async (req, res) => {
    const items = await AssessmentItem.findAll({
        where: { courseCode: req.params.code, examPeriod: req.params.period },
        include: [
            { model: IloItem, as: 'iloItem', include: [{ model: CourseOutcome, as: 'outcome' }] }
        ],
        order: [['id', 'ASC']]
    });
    res.json(items);
});

router.put('/:code/:period/items', lockGuard, async (req, res) => {
    const { code, period } = req.params;
    const items = Array.isArray(req.body) ? req.body : [];

    // Pre-flight validation
    for (const item of items) {
        const itemData = item;
        const ilo = item.ilo;
        // Drafts may still hold a blank (0) row, so 0 is tolerated here and enforced on
        // submit (frontend canSubmit + status route). Negative / fractional / non-numeric
        // points are never valid.
        if (item.points !== undefined && item.points !== null) {
            const pts = Number(item.points);
            if (!Number.isInteger(pts) || pts < 0) {
                return res.status(400).json({ error: `Invalid points value: ${item.points}` });
            }
        }
        if (ilo === 'ILO1' && !['Remembering', 'Understanding'].includes(itemData.cognitiveLevel)) {
            return res.status(400).json({ error: `Invalid cognitive level for ILO1: ${itemData.cognitiveLevel}` });
        }
        if (ilo === 'ILO2' && !['Applying', 'Analyzing'].includes(itemData.cognitiveLevel)) {
            return res.status(400).json({ error: `Invalid cognitive level for ILO2: ${itemData.cognitiveLevel}` });
        }
        if (ilo === 'ILO3' && !['Evaluating', 'Creating'].includes(itemData.cognitiveLevel)) {
            return res.status(400).json({ error: `Invalid cognitive level for ILO3: ${itemData.cognitiveLevel}` });
        }
    }

    let t;
    try {
        t = await sequelize.transaction();

        const existingItems = await AssessmentItem.findAll({
            where: { courseCode: code, examPeriod: period },
            transaction: t
        });

        const existingMap = new Map(existingItems.map(item => [item.id, item]));
        const incomingIds = [];
        const seen = new Set();

        for (const item of items) {
            if (item.id !== undefined && item.id !== null) {
                if (typeof item.id !== 'number' || !Number.isInteger(item.id) || item.id <= 0) {
                    await t.rollback();
                    return res.status(400).json({ error: `Invalid assessment item id: ${item.id}` });
                }
                if (seen.has(item.id)) {
                    await t.rollback();
                    return res.status(400).json({ error: `Duplicate item id in payload: ${item.id}` });
                }
                seen.add(item.id);
                const existing = existingMap.get(item.id);
                if (!existing) {
                    await t.rollback();
                    return res.status(400).json({ error: `Assessment item ${item.id} does not belong to this scope` });
                }
                if (item.iloId && existing.iloId !== item.iloId) {
                    await t.rollback();
                    return res.status(400).json({ error: `Assessment item ${item.id} does not match existing ILO scope` });
                }
                incomingIds.push(item.id);
            }
        }

        // Delete rows missing from payload
        if (incomingIds.length > 0) {
            await AssessmentItem.destroy({
                where: {
                    courseCode: code,
                    examPeriod: period,
                    id: { [Op.notIn]: incomingIds }
                },
                transaction: t
            });
        } else {
            await AssessmentItem.destroy({
                where: { courseCode: code, examPeriod: period },
                transaction: t
            });
        }

        // Update rows with id, create rows without id
        for (const item of items) {
            // eslint-disable-next-line no-unused-vars
            const { choices, rubrics, co, ilo, id: _id, ...itemData } = item;
            if (item.id) {
                await AssessmentItem.update(
                    itemData,
                    {
                        where: { id: item.id, courseCode: code, examPeriod: period },
                        transaction: t
                    }
                );
            } else {
                await AssessmentItem.create(
                    {
                        ...itemData,
                        courseCode: code,
                        examPeriod: period
                    },
                    { transaction: t }
                );
            }
        }

        const result = await AssessmentItem.findAll({
            where: { courseCode: code, examPeriod: period },
            include: [
                { model: IloItem, as: 'iloItem', include: [{ model: CourseOutcome, as: 'outcome' }] }
            ],
            order: [['id', 'ASC']],
            transaction: t
        });

        await t.commit();
        res.json(result);
    } catch (err) {
        if (t && !t.finished) {
            await t.rollback();
        }
        console.error('Failed to save assessment items:', err);
        res.status(500).json({ error: 'Failed to save assessment items' });
    }
});

export default router;
