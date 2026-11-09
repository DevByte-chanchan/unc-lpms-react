// routes/iloReferences.js
const express = require('express');
const router = express.Router();
const { getReferencesByILO, assignReferencesToILO, deleteILOReference } = require('../controllers/iloReferenceController');
const { requireEditablePlan } = require('../middleware/editLock');
const { requireRole } = require('../middleware/auth');
const {
    requireWeekParamAccess,
    requireWeekBodyAccess,
    requireWeeklyReferenceParamAccess
} = require('../middleware/courseAuthorization');
const { requireSection } = require('../middleware/sectionAccess');

// GET /api/ilo-references/:iloId (a week id since the weekly planner)
router.get('/:iloId', requireSection('references'), requireWeekParamAccess('iloId'), getReferencesByILO);

// POST /api/ilo-references/assign
router.post('/assign', requireRole('instructor'), requireWeekBodyAccess('week_id', 'ilo_id'), requireEditablePlan, assignReferencesToILO);

// DELETE /api/ilo-references/:iloReferenceId
router.delete('/:iloReferenceId', requireRole('instructor'), requireWeeklyReferenceParamAccess('iloReferenceId'), requireEditablePlan, deleteILOReference);

module.exports = router;
