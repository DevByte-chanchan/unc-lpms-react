const express = require('express');
const router = express.Router();
const { getCourseDetailsByPcOffering, updateCourseDetailsByPcOffering } = require('../controllers/courseDetailsController');

router.get('/:pcId/:revNum', getCourseDetailsByPcOffering);
router.put('/:pcId/:revNum', updateCourseDetailsByPcOffering);

module.exports = router;