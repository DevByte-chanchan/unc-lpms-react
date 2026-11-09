export const ACTIVE_PERIOD = 'Midterm';
export const ENABLED_PERIODS = ['Midterm'];

export const getSeasonConfig = () => {
    return ACTIVE_PERIOD;
};

// eslint-disable-next-line no-unused-vars
export const isLocked = (period, currentSeason, learningPlanApproved, midtermApproved) => {
    if (period === 'Midterm') {
        if (!learningPlanApproved) {
            return { locked: true, reason: 'Locked: Learning Plan not approved' };
        }
        return { locked: false };
    } else if (period === 'Finals') {
        if (!learningPlanApproved) {
            return { locked: true, reason: 'Locked: Learning Plan not approved' };
        }
        return { locked: true, reason: 'Finals is not available yet' };
    }
    return { locked: false };
};

export const getCourseDeadline = (courseCode, period) => {
    const now = new Date();
    const overdueCourses = ['BSCS111L', 'BSCS341L', 'BSCS222L', 'BSCS223L'];
    let offsetDays = 7;
    if (period === 'Finals') {
        offsetDays = 30;
    } else if (overdueCourses.includes(courseCode)) {
        offsetDays = -5;
    }
    return new Date(now.getTime() + offsetDays * 24 * 60 * 60 * 1000).toISOString();
};
