import { Router } from 'express';
import { requireRole } from '../middleware/auth.js';
import { uploadExcel } from '../middleware/upload.js';
import { rateLimit } from '../utils/rateLimit.js';
import {
  listFaculty,
  getFaculty,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  inactivateMany,
  uploadFaculty,
  inviteFaculty,
  inviteAllFaculty,
} from '../controllers/facultyController.js';

const router = Router();
const inviteLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 60 });

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
// Invite now / Resend: an invitation right away, signed by the Dean who clicked.
// 5 per person per hour (utils/rateLimit.js is per client IP; the controller
// adds the per-account cap).
router.post('/invite-all',  requireRole('Dean'), inviteLimit, inviteAllFaculty);
router.post('/:id/invite',  requireRole('Dean'), inviteLimit, inviteFaculty);

export default router;
