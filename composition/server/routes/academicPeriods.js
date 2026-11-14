'use strict';

const express = require('express');
const router = express.Router();
const { listAcademicPeriods, getCurrentAcademicPeriod } = require('../controllers/dashboardController');

router.get('/', listAcademicPeriods);
router.get('/current', getCurrentAcademicPeriod);

module.exports = router;
