import { Router } from 'express';
import { Comment } from '../models/index.js';
import { lockGuard } from '../middleware/lockGuard.js';

const router = Router();

router.get('/:code/:period/comments', async (req, res) => {
    const comments = await Comment.findAll({
        where: { courseCode: req.params.code, examPeriod: req.params.period },
        order: [['created_at', 'ASC']]
    });
    res.json(comments);
});

router.post('/:code/:period/comments', lockGuard, async (req, res) => {
    const { co, ilo, cognitiveLevel, itemNumber, type, body, courseOutcomeId, assessmentItemId, returnNumber } = req.body;
    const comment = await Comment.create({
        courseCode: req.params.code,
        examPeriod: req.params.period,
        co: co || '',
        ilo: ilo || '',
        cognitiveLevel: cognitiveLevel || '',
        itemNumber: itemNumber || '',
        type: type || '',
        body,
        courseOutcomeId: courseOutcomeId || null,
        assessmentItemId: assessmentItemId || null,
        returnNumber: typeof returnNumber === 'number' ? returnNumber : 0,
    });
    res.json(comment);
});

router.patch('/:code/:period/comments/:id', lockGuard, async (req, res) => {
    const { resolved } = req.body;
    const comment = await Comment.findOne({ where: { id: req.params.id, courseCode: req.params.code, examPeriod: req.params.period } });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (typeof resolved === 'boolean') comment.resolved = resolved;
    await comment.save();
    res.json(comment);
});

router.delete('/:code/:period/comments/:id', lockGuard, async (req, res) => {
    await Comment.destroy({
        where: { id: req.params.id, courseCode: req.params.code, examPeriod: req.params.period }
    });
    res.json({ ok: true });
});

export default router;
