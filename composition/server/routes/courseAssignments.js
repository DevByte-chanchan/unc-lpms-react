'use strict';

// Course Assignment: the Program Head's pre-assignment beside the registrar's official list.
const express = require('express');
const router = express.Router();
const controller = require('../controllers/courseAssignmentController');
const { requireRole } = require('../middleware/auth');

router.use(requireRole('program-head'));
router.get('/', controller.listAssignments);
// The .xls arrives as raw bytes (no multipart parser needed); 5 MB is far above a school-wide export.
router.post('/official', express.raw({ type: () => true, limit: '5mb' }), controller.importOfficial);
router.put('/:offeringId/instructor', controller.changeInstructor);

module.exports = router;
