const express = require('express');
const router = express.Router();
const revisionController = require('../controllers/revisionController');
const { requireOfferingAccess } = require('../middleware/courseAuthorization');
const { requireFullPlanAccess } = require('../middleware/sectionAccess');

// Change this line in your routes file
router.get('/:pcId', requireFullPlanAccess, requireOfferingAccess, revisionController.getRevisionsByOffering);

module.exports = router;
