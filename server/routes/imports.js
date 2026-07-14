import { Router } from 'express';
import { getLatestBatch, undoBatch } from '../controllers/importController.js';

const router = Router();

router.get('/latest',    getLatestBatch);
router.post('/:id/undo', undoBatch);

export default router;
