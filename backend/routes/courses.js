import { Router } from 'express';
import { Course, TosStatus, sequelize } from '../models/index.js';

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

router.put('/:code', async (req, res) => {
    const course = await Course.findByPk(req.params.code);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    await sequelize.query(
        'UPDATE courses SET updated_at = NOW() WHERE code = ?',
        { replacements: [req.params.code] }
    );
    if (Object.keys(req.body).length > 0) {
        await course.update(req.body);
    }
    res.json(await Course.findByPk(req.params.code, {
        include: [{ model: TosStatus, as: 'tosStatus' }]
    }));
});

export default router;
