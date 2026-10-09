'use strict';

const { sequelize } = require('../models');
const { effectiveLogs } = require('../utils/effectiveLogs');
const { planEditState, lockMessage } = require('../utils/editLock');

// Runs after a require*Access middleware, which leaves the offering's
// assignment on req.courseAccess. Rejects writes to a plan that is pending
// review or approved.
const requireEditablePlan = async (req, res, next) => {
    try {
        const assignmentId = req.courseAccess?.co_assign_id;
        if (!assignmentId) return next(); // never assigned = no workflow yet = draft

        const logs = await effectiveLogs(sequelize, assignmentId);
        const { state, editable } = planEditState(logs);
        if (!editable) return res.status(409).json({ message: lockMessage(state), status: state });
        return next();
    } catch (error) {
        return next(error);
    }
};

module.exports = { requireEditablePlan };
