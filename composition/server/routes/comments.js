const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');

// Main badge metrics dashboard calculation route
router.get('/unresolved-counts/:code', commentController.getUnresolvedCommentCounts);

// All comments for a course (with CO/ILO + target labels) — used by the approver sidebar
router.get('/course/:code', commentController.getCourseComments);

// REUSABLE: Target retrieval filter used by ReferenceForm, TopicForm, TLAForm
router.get('/filter/:iloId/:commentFor', commentController.getCommentsByTarget);

// REUSABLE: Batch update handler to save state changes
router.put('/update-resolution', commentController.updateResolutionStatuses);

// Create an approver comment + its selected targets (topics/references/tlas)
router.post('/', commentController.createComment);

module.exports = router;