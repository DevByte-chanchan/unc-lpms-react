// routes/courseCriteria.js
const express = require('express');
const router = express.Router();
const { getCourseCriteriaByCourseCode } = require('../controllers/courseCriteriaController');

// GET /api/course-criteria/:courseCode
router.get('/:courseCode', getCourseCriteriaByCourseCode);

module.exports = router;
