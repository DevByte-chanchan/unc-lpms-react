// routes/iloReferences.js
const express = require('express');
const router = express.Router();
const { getReferencesByILO, assignReferencesToILO, deleteILOReference } = require('../controllers/iloReferenceController');
const { requireEditablePlan } = require('../middleware/editLock');
const { requireRole } = require('../middleware/auth');
const {
    requireIloParamAccess,
    requireIloBodyAccess,
    requireIloReferenceParamAccess
} = require('../middleware/courseAuthorization');

// GET /api/ilo-references/:iloId
router.get('/:iloId', requireIloParamAccess('iloId'), getReferencesByILO);

// POST /api/ilo-references/assign
router.post('/assign', requireRole('instructor'), requireIloBodyAccess('ilo_id'), requireEditablePlan, assignReferencesToILO);

// DELETE /api/ilo-references/:iloReferenceId
router.delete('/:iloReferenceId', requireRole('instructor'), requireIloReferenceParamAccess('iloReferenceId'), requireEditablePlan, deleteILOReference);

module.exports = router;
