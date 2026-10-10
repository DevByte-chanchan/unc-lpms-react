import { Router } from 'express';
import { requireRole } from '../middleware/auth.js';
import { uploadExcel } from '../middleware/upload.js';
import {
  listConsultants,
  getConsultant,
  createConsultant,
  updateConsultant,
  assignCourse,
  deleteConsultant,
  uploadConsultants,
} from '../controllers/industryConsultantController.js';

const router = Router();
router.get('/',              listConsultants);
router.get('/:id',           getConsultant);
router.post('/',             requireRole('Program Head'), createConsultant);
router.patch('/:id/assign',  requireRole('Program Head'), assignCourse);
router.patch('/:id',         requireRole('Program Head'), updateConsultant);
router.delete('/:id',        requireRole('Program Head'), deleteConsultant);
router.post('/upload',       requireRole('Program Head'), uploadExcel.single('file'), uploadConsultants);
export default router;
