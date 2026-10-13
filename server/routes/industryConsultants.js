import { Router } from 'express';
import { requireRole } from '../middleware/auth.js';
import { uploadExcel } from '../middleware/upload.js';
import { rateLimit } from '../utils/rateLimit.js';
import {
  listConsultants,
  getConsultant,
  createConsultant,
  updateConsultant,
  assignCourse,
  deleteConsultant,
  uploadConsultants,
  myCourses,
  inviteConsultant,
} from '../controllers/industryConsultantController.js';

const router = Router();
const inviteLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 60 });
router.get('/',              listConsultants);
// Before '/:id', or "me" would be taken for an id.
router.get('/me/courses',    requireRole('Industry Consultant'), myCourses);
router.get('/:id',           getConsultant);
router.post('/',             requireRole('Program Head'), createConsultant);
router.patch('/:id/assign',  requireRole('Program Head'), assignCourse);
router.patch('/:id',         requireRole('Program Head'), updateConsultant);
router.delete('/:id',        requireRole('Program Head'), deleteConsultant);
router.post('/upload',       requireRole('Program Head'), uploadExcel.single('file'), uploadConsultants);
// Invite now / Resend, signed by the Program Head who clicked.
router.post('/:id/invite',   requireRole('Program Head'), inviteLimit, inviteConsultant);
export default router;
