const express = require('express');
const router = express.Router();
const { getFormSettings, updateFormSettings } = require('../controllers/formSettingsController');
const { requireRole } = require('../middleware/auth');

router.get('/', getFormSettings);
router.put('/:formKey', requireRole('dean'), updateFormSettings);

module.exports = router;
