const express = require('express');
const router = express.Router();
const controller = require('../controllers/termDeadlineController');
const { requirePermission } = require('../middleware/auth');

// The syllabus due date of a term, per program. Program Head and Dean only (deadline:manage);
// the controller limits each to the programs they head.
router.get('/', requirePermission('deadline:manage'), controller.listDeadlines);
router.put('/', requirePermission('deadline:manage'), controller.saveDeadline);
router.delete('/:id', requirePermission('deadline:manage'), controller.deleteDeadline);

module.exports = router;
