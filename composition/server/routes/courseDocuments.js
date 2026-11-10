'use strict';

// A Program Head's uploaded CO-PO / COAEP files per course offering (controllers/courseDocumentsController.js).
const express = require('express');
const router = express.Router();
const controller = require('../controllers/courseDocumentsController');
const { requireRole } = require('../middleware/auth');
const { requireOfferingAccess } = require('../middleware/courseAuthorization');

router.get('/:pcId', requireOfferingAccess, controller.info);
router.get('/:pcId/:kind', requireOfferingAccess, controller.download);
router.put('/:pcId/:kind', requireRole('program-head'), express.raw({ type: () => true, limit: '12mb' }), controller.upload);
router.delete('/:pcId/:kind', requireRole('program-head'), controller.remove);

module.exports = router;
