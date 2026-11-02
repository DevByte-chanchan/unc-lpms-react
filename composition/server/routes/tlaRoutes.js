const express = require('express');
const router = express.Router();
const { getTlasForIlo, syncTlasToIlo } = require('../controllers/tlaController');

router.get('/ilo/:iloId', getTlasForIlo);
router.post('/ilo/:iloId', syncTlasToIlo);

router.get('/week/:weekId', getTlasForIlo);
router.post('/week/:weekId', syncTlasToIlo);

module.exports = router;
