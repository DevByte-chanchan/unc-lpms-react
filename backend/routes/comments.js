import { Router } from 'express';
import { Comment } from '../models/index.js';

const router = Router();

router.get('/:code/comments', async (req, res) => {
    const comments = await Comment.findAll({
        where: { courseCode: req.params.code },
        order: [['created_at', 'ASC']]
    });
    res.json(comments);
});

router.post('/:code/comments', async (req, res) => {
    const { co, ilo, cognitiveLevel, itemNumber, type, body } = req.body;
    const comment = await Comment.create({
        courseCode: req.params.code,
        co: co || '',
        ilo: ilo || '',
        cognitiveLevel: cognitiveLevel || '',
        itemNumber: itemNumber || '',
        type: type || '',
        body
    });
    res.json(comment);
});

router.delete('/:code/comments/:id', async (req, res) => {
    await Comment.destroy({
        where: { id: req.params.id, courseCode: req.params.code }
    });
    res.json({ ok: true });
});

export default router;
