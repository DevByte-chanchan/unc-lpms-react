// routes/syllabusRoutes.js
const express = require('express');
const router = express.Router();
const { getILOsByCourseCode } = require('../controllers/iloController');

// GET /api/syllabus/:courseCode/ilos
router.get('/:courseCode', getILOsByCourseCode);

module.exports = router;
