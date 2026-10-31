const express = require('express');
const router = express.Router();
const { getFormSettings } = require('../controllers/formSettingsController');

router.get('/', getFormSettings);

module.exports = router;
