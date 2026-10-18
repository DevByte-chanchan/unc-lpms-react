export const ACTIVE_PERIOD = 'Midterm';
export const ENABLED_PERIODS = ['Midterm'];

export const getSeasonConfig = () => {
    return ACTIVE_PERIOD;
};

// eslint-disable-next-line no-unused-vars
export const isLocked = (period, currentSeason, learningPlanApproved, midtermApproved) => {
    if (period === 'Midterm') {
        return { locked: false };
    } else if (period === 'Finals') {
        if (!learningPlanApproved) {
            return { locked: true, reason: 'Locked: Learning Plan not approved' };
        }
        return { locked: true, reason: 'Finals is not available yet' };
    }
    return { locked: false };
};



