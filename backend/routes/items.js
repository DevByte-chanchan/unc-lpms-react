import { Router } from 'express';
import { AssessmentItem, IloItem, CourseOutcome } from '../models/index.js';
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
    const items = req.body;

    // Pre-flight validation
    for (const item of items) {
        const itemData = item;
        const ilo = item.ilo;
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

    await AssessmentItem.destroy({ where: { courseCode: code, examPeriod: period } });

    const created = [];
    for (const item of items) {
        // eslint-disable-next-line no-unused-vars
        const { choices, rubrics, co, ilo, ...itemData } = item;
        
        if (typeof itemData.id === 'string') delete itemData.id;
        const createdItem = await AssessmentItem.create({
            ...itemData,
            courseCode: code,
            examPeriod: period
        });

        const fullItem = await AssessmentItem.findByPk(createdItem.id, {
            include: [
                { model: IloItem, as: 'iloItem', include: [{ model: CourseOutcome, as: 'outcome' }] }
            ]
        });
        created.push(fullItem);
    }

    res.json(created);
});

export default router;
