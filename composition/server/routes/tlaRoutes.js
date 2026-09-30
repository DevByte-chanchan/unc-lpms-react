const express = require('express');
const router = express.Router();
const { getTlasForIlo, syncTlasToIlo } = require('../controllers/tlaController');
const { requireRole } = require('../middleware/auth');
const { requireIloParamAccess } = require('../middleware/courseAuthorization');

router.get('/ilo/:iloId', requireIloParamAccess('iloId'), getTlasForIlo);
router.post('/ilo/:iloId', requireRole('instructor'), requireIloParamAccess('iloId'), syncTlasToIlo);

module.exports = router;
