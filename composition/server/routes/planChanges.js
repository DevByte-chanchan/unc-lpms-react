const express = require('express');
const router = express.Router();
const { CourseOfferingAssignment } = require('../models');
const { requireOfferingAccess } = require('../middleware/courseAuthorization');
const { hasFullAccess } = require('../config/sectionAccess');
const { planChanges } = require('../utils/planChanges');

// GET /api/plan-changes/:pcId: what changed since the plan was last returned (utils/planChanges.js).
router.get('/:pcId', requireOfferingAccess, async (req, res, next) => {
    try {
        const offeringId = Number(req.params.pcId);
        const assignment = await CourseOfferingAssignment.findOne({ where: { pc_offering_id: offeringId }, attributes: ['co_assign_id'], raw: true });
        if (!assignment) return res.json({ since: null, changes: [] });
        res.json(await planChanges({
            offeringId, coAssignId: assignment.co_assign_id, userId: req.user?.id, onlyReferences: !hasFullAccess(req.user?.role)
        }));
    } catch (error) {
        next(error);
    }
});

module.exports = router;
