// routes/courseCoverage.routes.js
const express = require('express');
const router = express.Router();
const courseCoverageController = require('../controllers/courseCoverageController');

// GET request matching client visualization rules
router.get('/:code', courseCoverageController.getCourseCoverage);

module.exports = router;