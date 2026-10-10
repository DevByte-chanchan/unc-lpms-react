import { Router } from 'express';
import { requireRole } from '../middleware/auth.js';
import { uploadExcel } from '../middleware/upload.js';
import {
  listDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  unlistMany,
  deleteDepartment,
  uploadDepartments,
} from '../controllers/departmentController.js';

const router = Router();

router.get('/',             listDepartments);
router.post('/',            requireRole('VPAA'), createDepartment);
// PATCH /unlist must come before /:id so :id doesn't swallow "unlist".
router.patch('/unlist',     requireRole('VPAA'), unlistMany);
router.get('/:id',          getDepartment);
router.patch('/:id',        requireRole('VPAA'), updateDepartment);
router.delete('/:id',       requireRole('VPAA'), deleteDepartment);
router.post('/upload',      requireRole('VPAA'), uploadExcel.single('file'), uploadDepartments);

export default router;
