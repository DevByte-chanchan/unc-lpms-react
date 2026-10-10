import { Router } from 'express';
import { requireRole } from '../middleware/auth.js';
import { uploadPdf } from '../middleware/upload.js';
import {
  getCurrent,
  listHistory,
  getVersion,
  extractStatements,
  saveStatements,
  restoreVersion,
} from '../controllers/universityStatementController.js';

const router = Router();

// Multer's own errors (file too large, wrong type) carry no HTTP status;
// give them one so the client sees a 4xx with a readable message.
const pdfUpload = (req, res, next) => uploadPdf.single('file')(req, res, (err) => {
  if (!err) return next();
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'That PDF is larger than 10 MB.' });
  return res.status(err.status || 400).json({ message: err.message });
});

// Fixed paths before /:id so :id doesn't swallow "current" / "history".
router.get('/current',      getCurrent);
router.get('/history',      listHistory);
router.post('/extract',     requireRole('VPAA'), pdfUpload, extractStatements);
router.post('/',            requireRole('VPAA'), saveStatements);
router.get('/:id',          getVersion);
router.post('/:id/restore', requireRole('VPAA'), restoreVersion);

export default router;
