const express = require('express');
const router = express.Router();
const controller = require('../controllers/offeringController');
const { requireRole } = require('../middleware/auth');

router.get('/candidates', requireRole('program-head'), controller.getCandidates);
router.post('/', requireRole('program-head'), controller.assignCourse);
router.post('/:id/start-revision', requireRole('instructor'), controller.startRevision);

module.exports = router;
