const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/assignments
router.get('/', assignmentController.listAssignments);

// POST /api/assignments/action — record a workflow action (submit / return / approve)
router.post('/action', assignmentController.recordWorkflowAction);

// GET /api/assignments/:id
router.get('/:id', assignmentController.getAssignmentById);

module.exports = router;
