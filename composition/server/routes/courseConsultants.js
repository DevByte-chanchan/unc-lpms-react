const express = require('express');
const router = express.Router();
const controller = require('../controllers/courseConsultantController');
const { requireRole } = require('../middleware/auth');
const { requireOfferingAccess } = require('../middleware/courseAuthorization');

// There is deliberately no DELETE route: an assignment is deactivated, never deleted.
router.get('/candidates', requireRole('program-head'), controller.getCandidates);
router.get('/', requireRole('program-head', 'dean', 'industry-consultant'), controller.listAssignments);
router.post('/', requireRole('program-head'), controller.assignConsultant);
router.put('/:id/deactivate', requireRole('program-head'), controller.deactivateAssignment);
// The consultant's "reviewed" sign-off on an approved plan (it never changes the approval).
router.get('/signoffs/:pcId', requireOfferingAccess, controller.listSignoffs);
router.post('/signoffs/:pcId', requireRole('industry-consultant'), requireOfferingAccess, controller.signOff);

module.exports = router;
