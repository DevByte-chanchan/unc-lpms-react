const express = require('express');
const router = express.Router();
const { getCatalogSettings, updateCatalogSettings } = require('../controllers/catalogSettingsController');
const { requireRole } = require('../middleware/auth');

router.get('/', getCatalogSettings);
router.put('/', requireRole('director-of-libraries'), updateCatalogSettings);

module.exports = router;
