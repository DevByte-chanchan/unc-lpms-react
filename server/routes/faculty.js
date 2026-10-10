import { Router } from 'express';
import { requireRole } from '../middleware/auth.js';
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
router.post('/',         requireRole('Dean'), createFaculty);
// /inactivate must come BEFORE /:id so it isn't captured as an id.
router.patch('/inactivate', requireRole('Dean'), inactivateMany);
router.patch('/:id',     requireRole('Dean'), updateFaculty);
router.delete('/:id',    requireRole('Dean'), deleteFaculty);
router.post('/upload',   requireRole('Dean'), uploadExcel.single('file'), uploadFaculty);

export default router;
