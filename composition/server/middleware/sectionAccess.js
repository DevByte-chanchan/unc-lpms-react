'use strict';

const { canViewAnySection, hasFullAccess } = require('../config/sectionAccess');

const refuse = (res) => res.status(403).json({
    error: 'That part of the learning plan is not assigned to your role.',
    code: 'SECTION_RESTRICTED'
});

// Lets the request through when the signed-in role may see at least one of the listed sections
// (see config/sectionAccess.js). Put it before the controller of any route that returns the data
// of one part of a plan. It checks the role only, so it can sit before or after the course check.
const requireSection = (...sections) => (req, res, next) => {
    const role = req.user?.role;
    if (!role) return res.status(401).json({ error: 'Authentication required.' });
    return canViewAnySection(role, sections) ? next() : refuse(res);
};

// For routes that return the whole plan (revision history, the COAEP): restricted roles are refused.
const requireFullPlanAccess = (req, res, next) => {
    const role = req.user?.role;
    if (!role) return res.status(401).json({ error: 'Authentication required.' });
    return hasFullAccess(role) ? next() : refuse(res);
};

module.exports = { requireSection, requireFullPlanAccess };
