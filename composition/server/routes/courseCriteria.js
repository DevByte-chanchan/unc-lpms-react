// routes/courseCriteria.js
const express = require('express');
const router = express.Router();
// Updated import to reflect the version-controlled controller function name
const { getCourseCriteriaByPcOffering } = require('../controllers/courseCriteriaController');

// GET /api/course-criteria/:pcId/:revNum
router.get('/:pcId/:revNum', getCourseCriteriaByPcOffering);

module.exports = router;
router.put('/:pcId/:revNum', courseCriteriaController.updateCourseCriteriaByPcOffering);
