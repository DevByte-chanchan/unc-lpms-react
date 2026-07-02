const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const controller = require('../controllers/programDocumentController');
const roleCheck = require('../middleware/roleCheck');
const { validateTemplateQuery } = require('../middleware/validation');

const validateRequiredIds = (req, res, next) => {
  const { program_id, academic_period_id } = req.query;
  if (!program_id || isNaN(parseInt(program_id))) {
    return res.status(400).json({ error: 'program_id must be a valid integer' });
  }
  if (!academic_period_id || isNaN(parseInt(academic_period_id))) {
    return res.status(400).json({ error: 'academic_period_id must be a valid integer' });
  }
  next();
};

const sanitizeFileName = (name) => {
  if (typeof name !== 'string') return 'file';
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 255);
};

const ALLOWED_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'image/png',
  'image/jpeg',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed: PDF, XLSX, XLS, CSV, PNG, JPEG'), false);
  }
};

// Multer setup for program documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/program-documents'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + sanitizeFileName(file.originalname));
  }
});

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE } });

// Get program documents for a specific program and academic period
router.get('/', roleCheck, validateRequiredIds, controller.getProgramDocuments);

// Check status of program documents (all 3 uploaded?)
router.get('/status/check', roleCheck, controller.checkProgramDocumentsStatus);

// Upload a single program document
const uploadMiddleware = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large. Maximum 10MB.' });
      return res.status(400).json({ error: err.message });
    }
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
};
router.post('/upload', roleCheck, uploadMiddleware, controller.uploadProgramDocument);

// Batch upload all 3 program documents
const batchUploadMw = (req, res, next) => {
  upload.fields([
    { name: 'po_peo', maxCount: 1 },
    { name: 'co_po', maxCount: 1 },
    { name: 'coaep', maxCount: 1 }
  ])(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large. Maximum 10MB.' });
      return res.status(400).json({ error: err.message });
    }
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
};
router.post('/batch-upload', roleCheck, batchUploadMw, controller.upsertProgramDocuments);

// Delete a specific program document
router.delete('/:program_id/:academic_period_id/:document_type', roleCheck, controller.deleteProgramDocument);

module.exports = router;
