import { Router } from 'express';
import { TosStatus } from '../models/index.js';

const router = Router();

router.get('/:code/status', async (req, res) => {
    let status = await TosStatus.findOne({
        where: { courseCode: req.params.code }
    });
    if (!status) {
        status = await TosStatus.create({
            courseCode: req.params.code,
            status: 'draft'
        });
    }
    res.json(status);
});

router.put('/:code/status', async (req, res) => {
    const { status: newStatus } = req.body;
    let status = await TosStatus.findOne({
        where: { courseCode: req.params.code }
    });
    if (status) {
        status.status = newStatus || 'draft';
        await status.save();
    } else {
        status = await TosStatus.create({
            courseCode: req.params.code,
            status: newStatus || 'draft'
        });
    }
    res.json(status);
});

export default router;
