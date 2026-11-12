import { Router } from 'express';
import { requireRole } from '../middleware/auth.js';
import { uploadExcel } from '../middleware/upload.js';
import { rateLimit } from '../utils/rateLimit.js';
import {
  listDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  unlistMany,
  deleteDepartment,
  uploadDepartments,
  inviteDean,
} from '../controllers/departmentController.js';

const router = Router();
const inviteLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 60 });

router.get('/',             listDepartments);
router.post('/',            requireRole('VPAA'), createDepartment);
// PATCH /unlist must come before /:id so :id doesn't swallow "unlist".
router.patch('/unlist',     requireRole('VPAA'), unlistMany);
router.get('/:id',          getDepartment);
router.patch('/:id',        requireRole('VPAA'), updateDepartment);
router.delete('/:id',       requireRole('VPAA'), deleteDepartment);
router.post('/upload',      requireRole('VPAA'), uploadExcel.single('file'), uploadDepartments);
// Invite now / Resend for the department's Dean, signed by the VPAA who clicked.
// 5 per person per hour (the controller's per-account cap).
router.post('/:id/invite-dean', requireRole('VPAA'), inviteLimit, inviteDean);

export default router;
