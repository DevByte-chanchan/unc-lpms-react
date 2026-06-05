import { Router } from 'express';
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
router.post('/upload', uploadExcel.single('file'), uploadCourses);
router.get('/:id',     getCourse);     // includes prerequisites + revisions
router.post('/',       createCourse);
router.patch('/:id',   updateCourse);
router.delete('/:id',  deleteCourse);

export default router;
