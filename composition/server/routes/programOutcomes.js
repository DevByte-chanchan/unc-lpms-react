const express = require('express');
const router = express.Router();
const controller = require('../controllers/programOutcomeController');
const { requirePermission } = require('../middleware/auth');
const { requireOfferingAccess } = require('../middleware/courseAuthorization');

// Read: anyone signed in. Write: the Program Head of that program (the controller checks which).
router.get('/programs', controller.listPrograms);
router.get('/offering/:pcId', requireOfferingAccess, controller.getForOffering);
router.get('/:programId', controller.getProgram);
router.put('/:programId', requirePermission('alignment:manage'), controller.saveProgram);

module.exports = router;
