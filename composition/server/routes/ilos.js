// routes/syllabusRoutes.js
const express = require('express');
const router = express.Router();
// Updated import to reflect the version-controlled controller function name
const { getILOsByPcOffering, updateIlo } = require('../controllers/iloController');
const {updateIloSchedule} = require("../controllers/iloScheduleController");
const { requireRole } = require('../middleware/auth');
const { requireEditablePlan } = require('../middleware/editLock');
const { requireOfferingAccess, requireIloParamAccess } = require('../middleware/courseAuthorization');
const { requireSection } = require('../middleware/sectionAccess');

// GET /api/ilos/:pcId/:revNum
router.get('/:pcId/:revNum', requireSection('alignment', 'coverage', 'criteria'), requireOfferingAccess, getILOsByPcOffering);
router.get('/:pcId', requireSection('alignment', 'coverage', 'criteria'), requireOfferingAccess, getILOsByPcOffering);

router.put('/:ilo_id', requireRole('instructor'), requireIloParamAccess('ilo_id'), requireEditablePlan, updateIlo);
router.put('/:ilo_id/schedule', requireRole('instructor'), requireIloParamAccess('ilo_id'), requireEditablePlan, updateIloSchedule);

module.exports = router;
