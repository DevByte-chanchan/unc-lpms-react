import { Router } from 'express';
import { requireRole } from '../middleware/auth.js';
import { uploadPdf } from '../middleware/upload.js';
import {
  getCurrent,
  listAllActive,
  listHistory,
  getVersion,
  extractStatements,
  saveStatements,
  restoreVersion,
} from '../controllers/departmentStatementController.js';

const router = Router();

// Multer's own errors (file too large, wrong type) carry no HTTP status;
// give them one so the client sees a 4xx with a readable message.
const pdfUpload = (req, res, next) => uploadPdf.single('file')(req, res, (err) => {
  if (!err) return next();
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'That PDF is larger than 10 MB.' });
  return res.status(err.status || 400).json({ message: err.message });
});

// Fixed paths before /:id so :id doesn't swallow "all" / "history".
router.get('/',             getCurrent);       // ?department_code=SCIS
router.get('/all',          listAllActive);
router.get('/history',      listHistory);      // ?department_code=SCIS
router.post('/extract',     requireRole('Dean'), pdfUpload, extractStatements);
router.post('/',            requireRole('Dean'), saveStatements);
router.get('/:id',          getVersion);
router.post('/:id/restore', requireRole('Dean'), restoreVersion);

export default router;
