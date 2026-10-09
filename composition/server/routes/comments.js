const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { requireRole } = require('../middleware/auth');
const { requireOfferingAccess, requireIloParamAccess } = require('../middleware/courseAuthorization');

// Main badge metrics dashboard calculation route - Updated for Version Control tracking
router.get('/unresolved-counts/:pcId/:revNum', requireOfferingAccess, commentController.getUnresolvedCommentCounts);
router.get('/unresolved-counts/:pcId', requireOfferingAccess, commentController.getUnresolvedCommentCounts);

// REUSABLE: Target retrieval filter used by ReferenceForm, TopicForm, TLAForm
router.get('/filter/:iloId/:commentFor', requireIloParamAccess('iloId'), commentController.getCommentsByTarget);

// REUSABLE: Batch update handler to save state changes
router.put('/update-resolution', requireRole('instructor'), commentController.updateResolutionStatuses);

// ALL COMMENTS for a course offering + revision (combines ILO/TLA/Topic/Ref comments)
router.get('/course/:pcId/:revNum', requireOfferingAccess, commentController.getCourseComments);
router.get('/course/:pcId', requireOfferingAccess, commentController.getCourseComments);

// ALL COMMENTS for a course by course code (works without pcId/revNum in the URL),
// enriched with CO/ILO labels + target titles for the approver sidebar
router.get('/by-course/:code', commentController.getCourseCommentsByCode);

// CREATE an approver comment by course code — resolves CO/ILO labels + target titles
router.post(
    '/by-course',
    requireRole('program-head', 'director-of-libraries', 'industry-consultant', 'dean'),
    commentController.createCourseComment
);

module.exports = router;
