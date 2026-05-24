import { Router } from 'express';
import { Course, TosStatus } from '../models/index.js';

const router = Router();

router.get('/', async (req, res) => {
    const courses = await Course.findAll({
        include: [{ model: TosStatus, as: 'tosStatus' }],
        order: [['code', 'ASC']]
    });
    res.json(courses);
});

router.get('/:code', async (req, res) => {
    const course = await Course.findByPk(req.params.code, {
        include: [{ model: TosStatus, as: 'tosStatus' }]
    });
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json(course);
});

export default router;
