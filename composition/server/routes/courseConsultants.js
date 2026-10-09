const express = require('express');
const router = express.Router();
const controller = require('../controllers/courseConsultantController');
const { requireRole } = require('../middleware/auth');

// There is deliberately no DELETE route: an assignment is deactivated, never deleted.
router.get('/candidates', requireRole('program-head'), controller.getCandidates);
router.get('/', requireRole('program-head', 'dean', 'industry-consultant'), controller.listAssignments);
router.post('/', requireRole('program-head'), controller.assignConsultant);
router.put('/:id/deactivate', requireRole('program-head'), controller.deactivateAssignment);

module.exports = router;
