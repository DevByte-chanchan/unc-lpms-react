import { Course, TosStatus } from '../models/index.js';
import { getSeasonConfig, isLocked } from '../config/season.js';

export const lockGuard = async (req, res, next) => {
    const { code } = req.params;
    let { period } = req.params;
    if (!code) {
        return next();
    }

    try {
        const course = await Course.findByPk(code, {
            include: [{ model: TosStatus, as: 'tosStatuses' }]
        });
        
        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        period = period || course.examPeriod || 'Midterm';
        const statuses = course.tosStatuses || [];
        const currentTos = statuses.find(s => s.examPeriod === period);
        const currentStatus = currentTos ? currentTos.status : 'draft';

        if (currentStatus === 'approved') {
            return res.status(403).json({ error: 'Cannot modify an approved TOS' });
        }

        if (currentStatus === 'pending') {
            const isCommentRoute = req.originalUrl.includes('/comments');
            const isStatusRoute = req.originalUrl.includes('/status');
            if (!isCommentRoute && !isStatusRoute) {
                return res.status(403).json({ error: 'Cannot edit TOS while it is pending review' });
            }
        }

        const season = getSeasonConfig();
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