const express = require('express');
const router = express.Router();
const revisionController = require('../controllers/revisionController');
const { requireOfferingAccess } = require('../middleware/courseAuthorization');

// Change this line in your routes file
router.get('/:pcId', requireOfferingAccess, revisionController.getRevisionsByOffering);

module.exports = router;
