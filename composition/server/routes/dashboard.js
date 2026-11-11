'use strict';

const express = require('express');
const router = express.Router();
const { getDashboardSummary } = require('../controllers/dashboardController');

router.get('/summary', getDashboardSummary);
router.get('/', getDashboardSummary);

module.exports = router;
