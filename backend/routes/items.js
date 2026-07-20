import { Router } from 'express';
import { AssessmentItem, ItemChoice, ItemRubric, IloItem, CourseOutcome } from '../models/index.js';

const router = Router();

router.get('/:code/items', async (req, res) => {
    const items = await AssessmentItem.findAll({
        where: { courseCode: req.params.code },
        include: [
            { model: ItemChoice, as: 'choices' },
            { model: ItemRubric, as: 'rubrics' },
            { model: IloItem, as: 'iloItem', include: [{ model: CourseOutcome, as: 'outcome' }] }
        ],
        order: [['id', 'ASC']]
    });
    res.json(items);
});

router.put('/:code/items', async (req, res) => {
    const { code } = req.params;
    const items = req.body;

    await AssessmentItem.destroy({ where: { courseCode: code } });

    const created = [];
    for (const item of items) {
        const { choices, rubrics, co, ilo, ...itemData } = item;
        if (typeof itemData.id === 'string') delete itemData.id;
        const createdItem = await AssessmentItem.create({
            ...itemData,
            courseCode: code
        });

        if (choices && choices.length) {
            await ItemChoice.bulkCreate(
                choices.map(c => ({ ...c, itemId: createdItem.id }))
            );
        }
        if (rubrics && rubrics.length) {
            await ItemRubric.bulkCreate(
                rubrics.map(r => ({ ...r, itemId: createdItem.id }))
            );
        }

        const fullItem = await AssessmentItem.findByPk(createdItem.id, {
            include: [
                { model: ItemChoice, as: 'choices' },
                { model: ItemRubric, as: 'rubrics' },
                { model: IloItem, as: 'iloItem', include: [{ model: CourseOutcome, as: 'outcome' }] }
            ]
        });
        created.push(fullItem);
    }

    res.json(created);
});

export default router;
