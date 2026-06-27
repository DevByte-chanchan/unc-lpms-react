const express = require('express');
const router = express.Router();
const controller = require('../controllers/syllabusController');
const roleCheck = require('../middleware/roleCheck');

router.get('/approvals', roleCheck, controller.listApprovals);
router.get('/approvals/:courseCode', roleCheck, controller.getApproval);
router.post('/:courseCode/approve', roleCheck, controller.approveSyllabus);
router.post('/:courseCode/return', roleCheck, controller.returnSyllabus);
router.get('/:courseCode/versions', roleCheck, controller.getVersions);
router.get('/:courseCode/versions/:versionNo', roleCheck, controller.getVersion);

module.exports = router;
