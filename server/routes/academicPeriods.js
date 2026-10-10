import { Router } from 'express';
import { requireRole } from '../middleware/auth.js';
import {
  listPeriods,
  createPeriod,
  updatePeriod,
  closePeriod,
  reopenPeriod,
  deletePeriod,
} from '../controllers/academicPeriodController.js';

const router = Router();
router.get('/',              listPeriods);
router.post('/',             requireRole('VPAA'), createPeriod);
router.patch('/:id',         requireRole('VPAA'), updatePeriod);
router.patch('/:id/close',   requireRole('VPAA'), closePeriod);
router.patch('/:id/reopen',  requireRole('VPAA'), reopenPeriod);
router.delete('/:id',        requireRole('VPAA'), deletePeriod);
export default router;
