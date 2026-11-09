const express = require('express');
const router = express.Router();
const { getCourseCriteriaByPcOffering, updateCourseCriteriaByPcOffering } = require('../controllers/courseCriteriaController');
const { requireRole } = require('../middleware/auth');
const { requireEditablePlan } = require('../middleware/editLock');
const { requireOfferingAccess } = require('../middleware/courseAuthorization');
const { requireSection } = require('../middleware/sectionAccess');

// GET /api/course-criteria/:pcId/:revNum
router.get('/:pcId/:revNum', requireSection('criteria'), requireOfferingAccess, getCourseCriteriaByPcOffering);
router.get('/:pcId', requireSection('criteria'), requireOfferingAccess, getCourseCriteriaByPcOffering);
router.put('/:pcId/:revNum', requireRole('instructor'), requireOfferingAccess, requireEditablePlan, updateCourseCriteriaByPcOffering);
router.put('/:pcId', requireRole('instructor'), requireOfferingAccess, requireEditablePlan, updateCourseCriteriaByPcOffering);

module.exports = router;
