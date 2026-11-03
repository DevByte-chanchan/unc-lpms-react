const express = require('express');
const router = express.Router();
const controller = require('../controllers/missingSubmissionsController');
const { requirePermission } = require('../middleware/auth');

// Plans not yet submitted, in the programs the Program Head or Dean heads (deadline:manage).
router.get('/', requirePermission('deadline:manage'), controller.listMissing);
router.put('/:offeringId/pause', requirePermission('deadline:manage'), controller.setPaused);

module.exports = router;
