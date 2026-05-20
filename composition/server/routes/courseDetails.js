// routes/courseDetails.js
const express = require('express');
const router = express.Router();
const { getCourseDetailsByCourseCode } = require('../controllers/courseDetailsController');

// GET /api/course-details/:courseCode
router.get('/:courseCode', getCourseDetailsByCourseCode);

module.exports = router;
