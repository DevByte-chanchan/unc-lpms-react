const express = require('express');
const router = express.Router();
const controller = require('../controllers/missingSubmissionsController');
const { requirePermission } = require('../middleware/auth');

// Plans not yet submitted, in the programs the Program Head heads or the Dean's department (deadline:view);
// only the Program Head pauses reminders (deadline:manage).
router.get('/', requirePermission('deadline:view'), controller.listMissing);
router.put('/:offeringId/pause', requirePermission('deadline:manage'), controller.setPaused);

module.exports = router;
