const express = require('express');
const router = express.Router();

const { getCourseDetailsByPcOffering, updateCourseDetailsByPcOffering } = require('../controllers/courseDetailsController');
const { requireRole } = require('../middleware/auth');
const { requireEditablePlan } = require('../middleware/editLock');
const { requireOfferingAccess } = require('../middleware/courseAuthorization');
const { requireSection } = require('../middleware/sectionAccess');

router.get('/:pcId/:revNum', requireSection('details'), requireOfferingAccess, getCourseDetailsByPcOffering);
router.get('/:pcId', requireSection('details'), requireOfferingAccess, getCourseDetailsByPcOffering);
router.put('/:pcId/:revNum', requireRole('instructor'), requireOfferingAccess, requireEditablePlan, updateCourseDetailsByPcOffering);
router.put('/:pcId', requireRole('instructor'), requireOfferingAccess, requireEditablePlan, updateCourseDetailsByPcOffering);

module.exports = router;
