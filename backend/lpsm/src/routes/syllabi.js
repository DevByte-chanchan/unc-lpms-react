const express = require('express');
const router = express.Router();
const controller = require('../controllers/syllabusController');
const roleCheck = require('../middleware/roleCheck');
const { validateTemplateQuery } = require('../middleware/validation');

const validateCourseCode = (req, res, next) => {
  const { courseCode } = req.params;
  if (!courseCode || typeof courseCode !== 'string' || courseCode.length > 50) {
    return res.status(400).json({ error: 'Invalid courseCode parameter' });
  }
  next();
};

router.get('/approvals', roleCheck, controller.listApprovals);
router.get('/approvals/:courseCode', roleCheck, validateCourseCode, controller.getApproval);
router.post('/:courseCode/approve', roleCheck, validateCourseCode, controller.approveSyllabus);
router.post('/:courseCode/return', roleCheck, validateCourseCode, controller.returnSyllabus);
router.get('/:courseCode/versions', roleCheck, validateCourseCode, controller.getVersions);
router.get('/:courseCode/versions/:versionNo', roleCheck, validateCourseCode, controller.getVersion);
router.get('/content/:courseCode', roleCheck, validateCourseCode, validateTemplateQuery, controller.getContent);
router.get('/content/:courseCode/previous', roleCheck, validateCourseCode, controller.getPreviousYearContent);
router.post('/content/:courseCode', roleCheck, validateCourseCode, controller.saveContent);
router.post('/:courseCode/export/pdf', roleCheck, validateCourseCode, controller.exportPdf);

module.exports = router;
