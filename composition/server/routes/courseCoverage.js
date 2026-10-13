// routes/courseCoverage.routes.js
const express = require('express');
const router = express.Router();
const courseCoverageController = require('../controllers/courseCoverageController');
const { requireOfferingAccess } = require('../middleware/courseAuthorization');
const { requireSection } = require('../middleware/sectionAccess');

// GET request matching client visualization rules - Updated for Version Control tracking
router.get('/:pcId/:revNum', requireSection('coverage'), requireOfferingAccess, courseCoverageController.getCourseCoverage);
router.get('/:pcId', requireSection('coverage'), requireOfferingAccess, courseCoverageController.getCourseCoverage);

module.exports = router;
