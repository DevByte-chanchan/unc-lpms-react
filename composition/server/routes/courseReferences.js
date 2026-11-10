'use strict';

// References filed per course by the Director of Libraries (controllers/courseReferencesController.js).
const express = require('express');
const router = express.Router();
const controller = require('../controllers/courseReferencesController');
const { requirePermission } = require('../middleware/auth');

router.get('/tree', controller.tree);
router.get('/by-reference/:referenceId', controller.byReference);
router.get('/:courseId', controller.list);
router.post('/:courseId', requirePermission('reference:manage'), controller.add);
router.delete('/:courseId/:referenceId', requirePermission('reference:manage'), controller.remove);

module.exports = router;
