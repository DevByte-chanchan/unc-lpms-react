const express = require('express');
const router = express.Router();
const { getCourseProgramOutcomeAlignment, updateCourseProgramOutcomeAlignment } = require('../controllers/courseOutcomeAlignmentController');
const { requireRole } = require('../middleware/auth');
const { requireEditablePlan } = require('../middleware/editLock');
const { requireOfferingAccess } = require('../middleware/courseAuthorization');
const { requireSection } = require('../middleware/sectionAccess');

// GET /api/course-outcome-alignment/:pcId/:revNum
router.get('/:pcId/:revNum', requireSection('alignment'), requireOfferingAccess, getCourseProgramOutcomeAlignment);
router.get('/:pcId', requireSection('alignment'), requireOfferingAccess, getCourseProgramOutcomeAlignment);
router.put('/:pcId/:revNum', requireRole('instructor'), requireOfferingAccess, requireEditablePlan, updateCourseProgramOutcomeAlignment);
router.put('/:pcId', requireRole('instructor'), requireOfferingAccess, requireEditablePlan, updateCourseProgramOutcomeAlignment);

module.exports = router;
