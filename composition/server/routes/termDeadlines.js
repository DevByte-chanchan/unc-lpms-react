const express = require('express');
const router = express.Router();
const controller = require('../controllers/termDeadlineController');
const { requirePermission } = require('../middleware/auth');

// The syllabus due date of a term, per program. The Program Head and the Dean can read it (deadline:view); only the
// Program Head sets or removes it (deadline:manage). The controller limits each to the programs in their reach.
router.get('/', requirePermission('deadline:view'), controller.listDeadlines);
router.put('/', requirePermission('deadline:manage'), controller.saveDeadline);
router.delete('/:id', requirePermission('deadline:manage'), controller.deleteDeadline);

module.exports = router;
