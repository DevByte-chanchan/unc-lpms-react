const express = require('express');
const router = express.Router();
const { getTlasForIlo, syncTlasToIlo } = require('../controllers/tlaController');
const { requireRole } = require('../middleware/auth');
const { requireEditablePlan } = require('../middleware/editLock');
const { requireWeekParamAccess } = require('../middleware/courseAuthorization');
const { requireSection } = require('../middleware/sectionAccess');

router.get('/ilo/:iloId', requireSection('coverage', 'criteria'), requireWeekParamAccess('iloId'), getTlasForIlo);
router.post('/ilo/:iloId', requireRole('instructor'), requireWeekParamAccess('iloId'), requireEditablePlan, syncTlasToIlo);

router.get('/week/:weekId', requireSection('coverage', 'criteria'), requireWeekParamAccess('weekId'), getTlasForIlo);
router.post('/week/:weekId', requireRole('instructor'), requireWeekParamAccess('weekId'), requireEditablePlan, syncTlasToIlo);

module.exports = router;
