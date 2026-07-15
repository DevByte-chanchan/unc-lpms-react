// routes/courseCriteria.js
const express = require('express');
const router = express.Router();
const { getCourseCriteriaByCourseCode, getCourseCriteriaByPcOffering } = require('../controllers/courseCriteriaController');

// GET /api/course-criteria/:courseCode
router.get('/:courseCode', getCourseCriteriaByCourseCode);
// GET /api/course-criteria/:pcId/:revNum
router.get('/:pcId/:revNum', getCourseCriteriaByPcOffering);

module.exports = router;
