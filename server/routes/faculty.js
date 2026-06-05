import { Router } from 'express';
import { uploadExcel } from '../middleware/upload.js';
import {
  listFaculty,
  getFaculty,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  inactivateMany,
  uploadFaculty,
} from '../controllers/facultyController.js';

const router = Router();

// GET /api/faculty/:id is the route powering the "View Details" modal.
// It returns the row with its long `about` bio attached.
router.get('/',          listFaculty);
router.get('/:id',       getFaculty);
router.post('/',         createFaculty);
// /inactivate must come BEFORE /:id so it isn't captured as an id.
router.patch('/inactivate', inactivateMany);
router.patch('/:id',     updateFaculty);
router.delete('/:id',    deleteFaculty);
router.post('/upload',   uploadExcel.single('file'), uploadFaculty);

export default router;
