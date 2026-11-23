'use strict';

// Title requests (controllers/titleRequestController.js, approver plan 4.4). Signed-in users only (server.js).
const express = require('express');
const router = express.Router();
const controller = require('../controllers/titleRequestController');
const { requirePermission, requireRole } = require('../middleware/auth');

router.get('/', requireRole('instructor', 'director-of-libraries'), controller.listRequests);
router.post('/', requireRole('instructor'), controller.createRequest);
router.put('/:id/added', requirePermission('reference:manage'), controller.markAdded);
router.put('/:id/declined', requirePermission('reference:manage'), controller.markDeclined);

module.exports = router;
