// routes/courseDetails.js
const express = require('express');
const router = express.Router();

const { getCourseDetailsByPcOffering } = require('../controllers/courseDetailsController');
const { requireOfferingAccess } = require('../middleware/courseAuthorization');
const { requireSection } = require('../middleware/sectionAccess');

router.get('/:pcId/:revNum', requireSection('details'), requireOfferingAccess, getCourseDetailsByPcOffering);
router.get('/:pcId', requireSection('details'), requireOfferingAccess, getCourseDetailsByPcOffering);

module.exports = router;
