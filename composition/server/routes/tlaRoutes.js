const express = require('express');
const router = express.Router();
const { getTlasForIlo, syncTlasToIlo, getPreviousTlas, getAvailableTlas } = require('../controllers/tlaController');

router.get('/available', getAvailableTlas);

router.get('/ilo/:iloId', getTlasForIlo);
router.post('/ilo/:iloId', syncTlasToIlo);

router.get('/week/:weekId', getTlasForIlo);
router.post('/week/:weekId', syncTlasToIlo);

router.get('/previous/:weekId', getPreviousTlas);

module.exports = router;

