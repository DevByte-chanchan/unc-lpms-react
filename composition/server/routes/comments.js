const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');

// Main badge metrics dashboard calculation route - Updated for Version Control tracking
router.get('/unresolved-counts/:pcId/:revNum', commentController.getUnresolvedCommentCounts);

// REUSABLE: Target retrieval filter used by ReferenceForm, TopicForm, TLAForm
router.get('/filter/:iloId/:commentFor', commentController.getCommentsByTarget);

// REUSABLE: Batch update handler to save state changes
router.put('/update-resolution', commentController.updateResolutionStatuses);

// ALL COMMENTS for a course offering + revision (combines ILO/TLA/Topic/Ref comments)
router.get('/course/:pcId/:revNum', commentController.getCourseComments);

// ALL COMMENTS for a course by course code (works without pcId/revNum in the URL),
// enriched with CO/ILO labels + target titles for the approver sidebar
router.get('/by-course/:code', commentController.getCourseCommentsByCode);

module.exports = router;