const express = require('express');
const router = express.Router();
const { submitLearningPlan } = require('../controllers/submissionController');

router.post('/:pcId/:revNum', submitLearningPlan);

module.exports = router;