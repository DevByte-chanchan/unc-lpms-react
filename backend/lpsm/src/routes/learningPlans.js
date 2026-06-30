const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const controller = require('../controllers/learningPlanController');
const roleCheck = require('../middleware/roleCheck');
const {
  validateLearningPlan,
  validateDocumentUpload,
  validateReview,
  validateBatchExport,
  validateTemplateQuery
} = require('../middleware/validation');

// Multer setup with file size and type validation
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    // Generate safe filename with timestamp and UUID-like suffix
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}-${random}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Allow PDF and common document formats
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed. Allowed: PDF, DOC, DOCX, XLS, XLSX`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Routes
router.post('/', roleCheck, validateLearningPlan, controller.createLearningPlan);
router.get('/', roleCheck, controller.getLearningPlans);
router.get('/template', roleCheck, validateTemplateQuery, controller.getTemplate);
router.get('/templates/available', roleCheck, controller.getAvailableTemplates);
router.post('/templates/create-from', roleCheck, validateLearningPlan, controller.createFromTemplate);
router.post('/:id/mark-as-template', roleCheck, controller.markAsTemplate);
router.get('/templates/stats', roleCheck, controller.getTemplateStats);
router.get('/:id', roleCheck, controller.getLearningPlan);

router.post('/:id/documents', roleCheck, upload.single('file'), validateDocumentUpload, controller.uploadDocument);
router.delete('/:id/documents/:docId', roleCheck, controller.deleteDocument);

router.post('/:id/submit', roleCheck, controller.submitLearningPlan);
router.post('/:id/review', roleCheck, validateReview, controller.submitReview);
router.post('/:id/approve', roleCheck, validateReview, controller.approveOrReturn);

// My comments
router.get('/:id/comments', roleCheck, controller.getMyComments);

// Version history
router.get('/:id/versions', roleCheck, controller.getLPVersions);
router.get('/:id/versions/:versionNo', roleCheck, controller.getLPVersion);
router.post('/:id/rollback/:versionNo', roleCheck, controller.rollbackToVersion);

// Export
router.get('/:id/export/pdf', roleCheck, controller.exportPDF);
router.post('/export/batch', roleCheck, validateBatchExport, controller.exportBatchPDF);

module.exports = router;
