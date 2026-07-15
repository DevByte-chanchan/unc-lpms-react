// routes/courseDetails.js
const express = require('express');
const router = express.Router();

const { getCourseDetailsByPcOffering } = require('../controllers/courseDetailsController');

router.get('/:pcId/:revNum', getCourseDetailsByPcOffering);

module.exports = router;