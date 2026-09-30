// routes/syllabusRoutes.js
const express = require('express');
const router = express.Router();
// Updated import to reflect the version-controlled controller function name
const { getILOsByPcOffering } = require('../controllers/iloController');
const {updateIloSchedule} = require("../controllers/iloScheduleController");
const { requireRole } = require('../middleware/auth');
const { requireOfferingAccess, requireIloParamAccess } = require('../middleware/courseAuthorization');

// GET /api/ilos/:pcId/:revNum
router.get('/:pcId/:revNum', requireOfferingAccess, getILOsByPcOffering);

router.put('/:ilo_id/schedule', requireRole('instructor'), requireIloParamAccess('ilo_id'), updateIloSchedule);

module.exports = router;
