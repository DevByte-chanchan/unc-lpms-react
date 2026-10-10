import { Router } from 'express';
import { requireRole } from '../middleware/auth.js';
import { uploadExcel } from '../middleware/upload.js';
import {
  listCourseOfferingAssignments,
  getCourseOfferingAssignment,
  createCourseOfferingAssignment,
  updateCourseOfferingAssignment,
  deleteCourseOfferingAssignment,
  uploadCourseOfferingAssignments,
  revalidateCourseOfferingAssignments,
} from '../controllers/courseOfferingAssignmentController.js';

const router = Router();
router.get('/',           listCourseOfferingAssignments);
router.post('/revalidate', requireRole('Program Head'), revalidateCourseOfferingAssignments);
router.get('/:id',        getCourseOfferingAssignment);
router.post('/',          requireRole('Program Head'), createCourseOfferingAssignment);
router.patch('/:id',      requireRole('Program Head'), updateCourseOfferingAssignment);
router.delete('/:id',     requireRole('Program Head'), deleteCourseOfferingAssignment);
router.post('/upload',    requireRole('Program Head'), uploadExcel.single('file'), uploadCourseOfferingAssignments);
export default router;
