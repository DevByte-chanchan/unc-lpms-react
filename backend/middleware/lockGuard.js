import { Course, TosStatus } from '../models/index.js';
import { getSeasonConfig, isLocked } from '../config/season.js';

export const lockGuard = async (req, res, next) => {
    const { code, period } = req.params;
    if (!code || !period) {
        return next();
    }

    try {
        const course = await Course.findByPk(code, {
            include: [{ model: TosStatus, as: 'tosStatuses' }]
        });
        
        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        const season = getSeasonConfig();
        const statuses = course.tosStatuses || [];
        const midtermStatus = statuses.find(s => s.examPeriod === 'Midterm');
        const midtermApproved = midtermStatus && midtermStatus.status === 'approved';

        const lock = isLocked(period, season, course.learningPlanApproved, midtermApproved);
        
        if (lock.locked) {
            return res.status(403).json({ error: lock.reason });
        }
        
        next();
    } catch (err) {
        console.error('lockGuard error:', err);
        return res.status(500).json({ error: 'Internal server error during lock check' });
    }
};