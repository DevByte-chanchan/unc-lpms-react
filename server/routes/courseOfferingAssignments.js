import { Router } from 'express';
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
router.post('/revalidate', revalidateCourseOfferingAssignments);
router.get('/:id',        getCourseOfferingAssignment);
router.post('/',          createCourseOfferingAssignment);
router.patch('/:id',      updateCourseOfferingAssignment);
router.delete('/:id',     deleteCourseOfferingAssignment);
router.post('/upload',    uploadExcel.single('file'), uploadCourseOfferingAssignments);
export default router;
