const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const controller = require('../controllers/programDocumentController');
const roleCheck = require('../middleware/roleCheck');

// Multer setup for program documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/program-documents'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Get program documents for a specific program and academic period
router.get('/', roleCheck, controller.getProgramDocuments);

// Check status of program documents (all 3 uploaded?)
router.get('/status/check', roleCheck, controller.checkProgramDocumentsStatus);

// Upload a single program document
router.post('/upload', roleCheck, upload.single('file'), controller.uploadProgramDocument);

// Batch upload all 3 program documents
router.post('/batch-upload', roleCheck, upload.fields([
  { name: 'po_peo', maxCount: 1 },
  { name: 'co_po', maxCount: 1 },
  { name: 'coaep', maxCount: 1 }
]), controller.upsertProgramDocuments);

// Delete a specific program document
router.delete('/:program_id/:academic_period_id/:document_type', roleCheck, controller.deleteProgramDocument);

module.exports = router;
