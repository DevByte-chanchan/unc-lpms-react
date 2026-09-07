// routes/courseOutcomeAlignment.js
const express = require('express');
const router = express.Router();
const { getCourseProgramOutcomeAlignment } = require('../controllers/courseOutcomeAlignmentController');

// GET /api/course-outcome-alignment/:pcId/:revNum
router.get('/:pcId/:revNum', getCourseProgramOutcomeAlignment);

module.exports = router;
router.put('/:pcId/:revNum', courseOutcomeAlignmentController.updateCourseProgramOutcomeAlignment);
