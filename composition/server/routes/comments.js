const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');

// Main badge metrics dashboard calculation route - Updated for Version Control tracking
router.get('/unresolved-counts/:pcId/:revNum', commentController.getUnresolvedCommentCounts);

// REUSABLE: Target retrieval filter used by ReferenceForm, TopicForm, TLAForm
router.get('/filter/:iloId/:commentFor', commentController.getCommentsByTarget);

// REUSABLE: Batch update handler to save state changes
router.put('/update-resolution', commentController.updateResolutionStatuses);

module.exports = router;