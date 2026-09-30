// routes/courseOutcomeAlignment.js
const express = require('express');
const router = express.Router();
const { getCourseProgramOutcomeAlignment } = require('../controllers/courseOutcomeAlignmentController');
const { requireOfferingAccess } = require('../middleware/courseAuthorization');

// GET /api/course-outcome-alignment/:pcId/:revNum
router.get('/:pcId/:revNum', requireOfferingAccess, getCourseProgramOutcomeAlignment);

module.exports = router;
