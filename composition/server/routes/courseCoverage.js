// routes/courseCoverage.routes.js
const express = require('express');
const router = express.Router();
const courseCoverageController = require('../controllers/courseCoverageController');

// GET request matching client visualization rules - Updated for Version Control tracking
router.get('/:pcId/:revNum', courseCoverageController.getCourseCoverage);

module.exports = router;