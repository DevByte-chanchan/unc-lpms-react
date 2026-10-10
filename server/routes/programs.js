import { Router } from 'express';
import { requireRole } from '../middleware/auth.js';
import { uploadExcel } from '../middleware/upload.js';
import {
  listPrograms,
  getProgram,
  createProgram,
  updateProgram,
  deleteProgram,
  uploadPrograms,
} from '../controllers/programController.js';

const router = Router();
router.get('/',        listPrograms);
router.get('/:id',     getProgram);
router.post('/',       requireRole('Dean'), createProgram);
router.patch('/:id',   requireRole('Dean'), updateProgram);
router.delete('/:id',  requireRole('Dean'), deleteProgram);
router.post('/upload', requireRole('Dean'), uploadExcel.single('file'), uploadPrograms);
export default router;
