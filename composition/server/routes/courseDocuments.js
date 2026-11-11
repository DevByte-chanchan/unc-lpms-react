'use strict';

// A Program Head's uploaded CO-PO / COAEP files per course offering (controllers/courseDocumentsController.js).
const express = require('express');
const router = express.Router();
const controller = require('../controllers/courseDocumentsController');
const { requireRole } = require('../middleware/auth');
const { requireOfferingAccess } = require('../middleware/courseAuthorization');

router.get('/template/:kind', controller.template);
router.post('/export/coaep', express.json({ limit: '2mb' }), controller.exportCoaep);
router.get('/:pcId', requireOfferingAccess, controller.info);
router.get('/:pcId/:kind', requireOfferingAccess, controller.download);
router.put('/:pcId/:kind', requireRole('program-head'), express.raw({ type: () => true, limit: '12mb' }), controller.upload);
router.post('/:pcId/:kind/scan', requireRole('program-head'), express.raw({ type: () => true, limit: '13mb' }), controller.scan);
router.put('/:pcId/:kind/scanned', requireRole('program-head'), express.json({ limit: '2mb' }), controller.saveScanned);
router.delete('/:pcId/:kind', requireRole('program-head'), controller.remove);

module.exports = router;
