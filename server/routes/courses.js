import { Router } from 'express';
import { requireRole } from '../middleware/auth.js';
import { uploadExcel } from '../middleware/upload.js';
import {
  listCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  uploadCourses,
  listPrereqOptions,
} from '../controllers/courseController.js';

const router = Router();

router.get('/',        listCourses);
router.get('/prereq-options', listPrereqOptions); // last sem's courses (all programs)
router.post('/upload', requireRole('Program Head'), uploadExcel.single('file'), uploadCourses);
router.get('/:id',     getCourse);     // includes prerequisites + revisions
router.post('/',       requireRole('Program Head'), createCourse);
router.patch('/:id',   requireRole('Program Head'), updateCourse);
router.delete('/:id',  requireRole('Program Head'), deleteCourse);

export default router;
