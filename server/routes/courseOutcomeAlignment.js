// routes/courseOutcomeAlignment.js
const express = require('express');
const router = express.Router();
const { getCourseProgramOutcomeAlignment } = require('../controllers/courseOutcomeAlignmentController');

// GET /api/course-outcome-alignment/:courseCode
router.get('/:courseCode', getCourseProgramOutcomeAlignment);

module.exports = router;
