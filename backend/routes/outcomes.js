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

    const existing = await CourseOutcome.findAll({
        where: { courseCode: code },
        include: [{ model: IloItem, as: 'ilos' }]
    });

    const keptOutcomeIds = new Set();

    for (const outcome of outcomes) {
        const { ilos, id: outcomeId, ...outcomeData } = outcome;

        const existingOutcome = outcomeId
            ? existing.find(e => e.id === outcomeId)
            : existing.find(e => e.co === outcomeData.co);

        let outcomeRecord;
        if (existingOutcome) {
            await existingOutcome.update(outcomeData);
            outcomeRecord = existingOutcome;
        } else {
            outcomeRecord = await CourseOutcome.create({ ...outcomeData, courseCode: code });
        }
        keptOutcomeIds.add(outcomeRecord.id);

        const existingIlos = existingOutcome ? existingOutcome.ilos : [];

        const keptIloIds = new Set();
        const newIlos = [];

        for (const ilo of (ilos || [])) {
            const { iloDbId, ...iloData } = ilo;
            const existingIlo = existingIlos.find(i => i.id === iloDbId);
            if (existingIlo) {
                await existingIlo.update(iloData);
                keptIloIds.add(existingIlo.id);
                newIlos.push(existingIlo);
            } else {
                const created = await IloItem.create({ ...iloData, coId: outcomeRecord.id });
                keptIloIds.add(created.id);
                newIlos.push(created);
            }
        }

        // delete ILOs that were removed
        for (const existingIlo of existingIlos) {
            if (!keptIloIds.has(existingIlo.id)) {
                await existingIlo.destroy();
            }
        }

        outcomeRecord.dataValues.ilos = newIlos;
    }

    // delete outcomes that were removed
    for (const existingOutcome of existing) {
        if (!keptOutcomeIds.has(existingOutcome.id)) {
            await existingOutcome.destroy();
        }
    }

    const result = await CourseOutcome.findAll({
        where: { courseCode: code },
        include: [{ model: IloItem, as: 'ilos' }],
        order: [['co', 'ASC']]
    });

    res.json(result);
});

export default router;
