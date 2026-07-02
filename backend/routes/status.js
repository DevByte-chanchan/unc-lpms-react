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
    const now = new Date();
    if (status) {
        status.status = newStatus || 'draft';
        if (newStatus === 'pending') status.submittedAt = now;
        else if (newStatus === 'returned') status.returnedAt = now;
        else if (newStatus === 'approved') status.approvedAt = now;
        await status.save();
    } else {
        const extra = {};
        if (newStatus === 'pending') extra.submittedAt = now;
        else if (newStatus === 'returned') extra.returnedAt = now;
        else if (newStatus === 'approved') extra.approvedAt = now;
        status = await TosStatus.create({
            courseCode: req.params.code,
            status: newStatus || 'draft',
            ...extra
        });
    }
    res.json(status);
});

export default router;
