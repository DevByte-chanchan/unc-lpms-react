const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');

// GET /api/assignments
router.get('/', assignmentController.listAssignments);

// GET /api/assignments/:id
router.get('/:id', assignmentController.getAssignmentById);

module.exports = router;
