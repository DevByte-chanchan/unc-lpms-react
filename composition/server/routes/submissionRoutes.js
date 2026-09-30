const express = require('express');
const router = express.Router();
const { submitLearningPlan } = require('../controllers/submissionController');
const { requireRole } = require('../middleware/auth');
const { requireOfferingAccess } = require('../middleware/courseAuthorization');

router.post('/:pcId/:revNum', requireRole('instructor'), requireOfferingAccess, submitLearningPlan);

module.exports = router;
