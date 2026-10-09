// routes/courseDetails.js
const express = require('express');
const router = express.Router();

const { getCourseDetailsByPcOffering } = require('../controllers/courseDetailsController');
const { requireOfferingAccess } = require('../middleware/courseAuthorization');

router.get('/:pcId/:revNum', requireOfferingAccess, getCourseDetailsByPcOffering);
router.get('/:pcId', requireOfferingAccess, getCourseDetailsByPcOffering);

module.exports = router;
