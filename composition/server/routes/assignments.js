const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { requireAuth } = require('../middleware/auth');
const { requireOfferingAccess } = require('../middleware/courseAuthorization');
const { getReviewRecord } = require('../controllers/reviewRecordController');
const { getPlanChecks } = require('../utils/planChecks');
const { getVersionHistory } = require('../utils/versionHistory');
const { getOfferingSignatures } = require('../controllers/signatureExportController');

router.use(requireAuth);

// GET /api/assignments
router.get('/', assignmentController.listAssignments);

// POST /api/assignments/action — record a workflow action (submit / return / approve)
router.post('/action', assignmentController.recordWorkflowAction);

// GET /api/assignments/offering/:pcId — workflow log for one offering (stage + who may act derive from it)
router.get('/offering/:pcId', requireOfferingAccess, assignmentController.getWorkflowByOffering);

// GET /api/assignments/offering/:pcId/review-record — the accreditation record (comments, actions, approvers)
router.get('/offering/:pcId/review-record', requireOfferingAccess, getReviewRecord);

// GET /api/assignments/offering/:pcId/plan-checks — hours, weeks, outcome coverage and exam periods of the plan
router.get('/offering/:pcId/plan-checks', requireOfferingAccess, getPlanChecks);

// GET /api/assignments/offering/:pcId/history — every version of the course's plan and who did what to it
router.get('/offering/:pcId/history', requireOfferingAccess, getVersionHistory);

// GET /api/assignments/offering/:pcId/signatures — the e-signature images (data: URIs) for the syllabus
// signature block; only for the steps each person performed. Access follows the course.
router.get('/offering/:pcId/signatures', requireOfferingAccess, getOfferingSignatures);

// GET /api/assignments/:id
router.get('/:id', assignmentController.getAssignmentById);

module.exports = router;
