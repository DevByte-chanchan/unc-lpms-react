const express = require('express');
const router = express.Router();
const { getTlasForIlo, syncTlasToIlo } = require('../controllers/tlaController');

router.get('/ilo/:iloId', getTlasForIlo);
router.post('/ilo/:iloId', syncTlasToIlo);

module.exports = router;