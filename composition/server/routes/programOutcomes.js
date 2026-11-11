const express = require('express');
const router = express.Router();
const controller = require('../controllers/programOutcomeController');
const { requirePermission } = require('../middleware/auth');
const { requireOfferingAccess } = require('../middleware/courseAuthorization');

// Read: anyone signed in. Write: the Program Head of that program (the controller checks which).
router.get('/programs', controller.listPrograms);
// Program documents (controllers/programDocumentsController.js). Files arrive as raw bytes.
const docs = require('../controllers/programDocumentsController');
const raw = express.raw({ type: () => true, limit: '12mb' });
router.get('/template.xlsx', docs.template);
router.get('/:programId/front-pages', docs.getFrontPages);
router.put('/:programId/front-pages', requirePermission('alignment:manage'), raw, docs.putFrontPages);
router.delete('/:programId/front-pages', requirePermission('alignment:manage'), docs.deleteFrontPages);
router.post('/:programId/import', requirePermission('alignment:manage'), raw, docs.importProgramOutcomes);
router.post('/:programId/scan', requirePermission('alignment:manage'), express.raw({ type: () => true, limit: '13mb' }), docs.scanProgramOutcomes);
router.post('/:programId/front-pages/check', requirePermission('alignment:manage'), docs.checkFrontPages);
router.get('/offering/:pcId', requireOfferingAccess, controller.getForOffering);
router.get('/:programId', controller.getProgram);
router.put('/:programId', requirePermission('alignment:manage'), controller.saveProgram);

module.exports = router;
