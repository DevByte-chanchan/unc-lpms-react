import { Router } from 'express';
import { CourseOutcome, IloItem } from '../models/index.js';

const router = Router();

router.get('/:code/outcomes', async (req, res) => {
    const outcomes = await CourseOutcome.findAll({
        where: { courseCode: req.params.code },
        include: [{ model: IloItem, as: 'ilos' }],
        order: [['co', 'ASC']]
    });
    res.json(outcomes);
});

router.put('/:code/outcomes', async (req, res) => {
    const { code } = req.params;
    const outcomes = req.body;

    await CourseOutcome.destroy({ where: { courseCode: code } });

    const created = [];
    for (const outcome of outcomes) {
        const { ilos, ...outcomeData } = outcome;
        const createdOutcome = await CourseOutcome.create({
            ...outcomeData,
            courseCode: code
        });

        if (ilos && ilos.length) {
            const createdIlos = await IloItem.bulkCreate(
                ilos.map(ilo => ({ ...ilo, coId: createdOutcome.id }))
            );
            createdOutcome.dataValues.ilos = createdIlos;
        }
        created.push(createdOutcome);
    }

    const result = await CourseOutcome.findAll({
        where: { courseCode: code },
        include: [{ model: IloItem, as: 'ilos' }],
        order: [['co', 'ASC']]
    });

    res.json(result);
});

export default router;
