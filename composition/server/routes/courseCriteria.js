// routes/courseCriteria.js
const express = require('express');
const router = express.Router();
// Updated import to reflect the version-controlled controller function name
const { getCourseCriteriaByPcOffering } = require('../controllers/courseCriteriaController');
const { requireOfferingAccess } = require('../middleware/courseAuthorization');

// GET /api/course-criteria/:pcId/:revNum
router.get('/:pcId/:revNum', requireOfferingAccess, getCourseCriteriaByPcOffering);

module.exports = router;
