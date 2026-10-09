// routes/courseCoverage.routes.js
const express = require('express');
const router = express.Router();
const courseCoverageController = require('../controllers/courseCoverageController');
const { requireOfferingAccess } = require('../middleware/courseAuthorization');

// GET request matching client visualization rules - Updated for Version Control tracking
router.get('/:pcId/:revNum', requireOfferingAccess, courseCoverageController.getCourseCoverage);
router.get('/:pcId', requireOfferingAccess, courseCoverageController.getCourseCoverage);

module.exports = router;
