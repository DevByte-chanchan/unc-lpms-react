// routes/courseOutcomeAlignment.js
const express = require('express');
const router = express.Router();
const { getCourseProgramOutcomeAlignment } = require('../controllers/courseOutcomeAlignmentController');
const { requireOfferingAccess } = require('../middleware/courseAuthorization');
const { requireSection } = require('../middleware/sectionAccess');

// GET /api/course-outcome-alignment/:pcId/:revNum
router.get('/:pcId/:revNum', requireSection('alignment'), requireOfferingAccess, getCourseProgramOutcomeAlignment);
router.get('/:pcId', requireSection('alignment'), requireOfferingAccess, getCourseProgramOutcomeAlignment);

module.exports = router;
