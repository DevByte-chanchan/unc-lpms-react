import { Router } from 'express';
import { requireRole } from '../middleware/auth.js';
import { uploadExcel, uploadSheetOrPdf } from '../middleware/upload.js';
import {
  listCourseOfferingAssignments,
  getCourseOfferingAssignment,
  createCourseOfferingAssignment,
  updateCourseOfferingAssignment,
  deleteCourseOfferingAssignment,
  uploadCourseOfferingAssignments,
  revalidateCourseOfferingAssignments,
  getCourseOfferingAssignmentHistory,
  compareOfficialOfferings,
} from '../controllers/courseOfferingAssignmentController.js';

const router = Router();
router.get('/',           listCourseOfferingAssignments);
router.post('/revalidate', requireRole('Program Head'), revalidateCourseOfferingAssignments);
// The registrar's Subject Offerings vs. the pre-assignment (?preview=1 = dry run).
router.post('/compare-official', requireRole('Program Head'), uploadSheetOrPdf.single('file'), compareOfficialOfferings);
router.get('/:id/history', requireRole('Program Head', 'Dean', 'VPAA'), getCourseOfferingAssignmentHistory);
router.get('/:id',        getCourseOfferingAssignment);
router.post('/',          requireRole('Program Head', 'Dean'), createCourseOfferingAssignment);
router.patch('/:id',      requireRole('Program Head', 'Dean'), updateCourseOfferingAssignment);
router.delete('/:id',     requireRole('Program Head'), deleteCourseOfferingAssignment);
router.post('/upload',    requireRole('Program Head'), uploadExcel.single('file'), uploadCourseOfferingAssignments);
export default router;
