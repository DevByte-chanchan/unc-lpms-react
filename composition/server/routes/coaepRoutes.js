const express = require('express');
const router = express.Router();
const { getCoaepByCourse } = require('../controllers/coaepController');
const { requireCourseCodeAccess } = require('../middleware/courseAuthorization');
const { requireFullPlanAccess } = require('../middleware/sectionAccess');

// GET /api/coaep/:code — COAEP content (COs, ILOs, assessment tools) for a course
router.get('/:code', requireFullPlanAccess, requireCourseCodeAccess, getCoaepByCourse);

module.exports = router;
