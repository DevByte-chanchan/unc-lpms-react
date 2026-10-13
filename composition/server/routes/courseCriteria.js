// routes/courseCriteria.js
const express = require('express');
const router = express.Router();
// Updated import to reflect the version-controlled controller function name
const { getCourseCriteriaByPcOffering } = require('../controllers/courseCriteriaController');
const { requireOfferingAccess } = require('../middleware/courseAuthorization');
const { requireSection } = require('../middleware/sectionAccess');

// GET /api/course-criteria/:pcId/:revNum
router.get('/:pcId/:revNum', requireSection('criteria'), requireOfferingAccess, getCourseCriteriaByPcOffering);
router.get('/:pcId', requireSection('criteria'), requireOfferingAccess, getCourseCriteriaByPcOffering);

module.exports = router;
