import { Router } from 'express';
import { Course, TosStatus, sequelize } from '../models/index.js';
import { getSeasonConfig, isLocked } from '../config/season.js';

const router = Router();

router.get('/', async (req, res) => {
    const courses = await Course.findAll({
        include: [{ model: TosStatus, as: 'tosStatuses' }],
        order: [['code', 'ASC']]
    });
    
    const season = getSeasonConfig();
    
    const mapped = courses.map(course => {
        const statuses = course.tosStatuses || [];
        const midtermStatus = statuses.find(s => s.examPeriod === 'Midterm');
        const finalsStatus = statuses.find(s => s.examPeriod === 'Finals');
        
        const midtermApproved = midtermStatus && midtermStatus.status === 'approved';
        
        const midtermLock = isLocked('Midterm', season, course.learningPlanApproved, midtermApproved);
        const finalsLock = isLocked('Finals', season, course.learningPlanApproved, midtermApproved);
        
        return {
            ...course.toJSON(),
            midtermLock,
            finalsLock,
            currentSeason: season,
            midtermTos: midtermStatus || null,
            finalsTos: finalsStatus || null
        };
    });
    
    res.json(mapped);
});

router.get('/:code', async (req, res) => {
    const course = await Course.findByPk(req.params.code, {
        include: [{ model: TosStatus, as: 'tosStatuses' }]
    });
    if (!course) return res.status(404).json({ error: 'Course not found' });
    
    const season = getSeasonConfig();
    const statuses = course.tosStatuses || [];
    const midtermStatus = statuses.find(s => s.examPeriod === 'Midterm');
    const finalsStatus = statuses.find(s => s.examPeriod === 'Finals');
    
    const midtermApproved = midtermStatus && midtermStatus.status === 'approved';
    const midtermLock = isLocked('Midterm', season, course.learningPlanApproved, midtermApproved);
    const finalsLock = isLocked('Finals', season, course.learningPlanApproved, midtermApproved);
    
    const payload = {
        ...course.toJSON(),
        midtermLock,
        finalsLock,
        currentSeason: season,
        midtermTos: midtermStatus || null,
        finalsTos: finalsStatus || null
    };
    
    res.json(payload);
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
    
    // return full course
    const updated = await Course.findByPk(req.params.code, {
        include: [{ model: TosStatus, as: 'tosStatuses' }]
    });
    
    const season = getSeasonConfig();
    const statuses = updated.tosStatuses || [];
    const midtermStatus = statuses.find(s => s.examPeriod === 'Midterm');
    const finalsStatus = statuses.find(s => s.examPeriod === 'Finals');
    const midtermApproved = midtermStatus && midtermStatus.status === 'approved';
    
    res.json({
        ...updated.toJSON(),
        midtermLock: isLocked('Midterm', season, updated.learningPlanApproved, midtermApproved),
        finalsLock: isLocked('Finals', season, updated.learningPlanApproved, midtermApproved),
        currentSeason: season,
        midtermTos: midtermStatus || null,
        finalsTos: finalsStatus || null
    });
});

export default router;
