import { Router } from 'express';
import {
  listAccounts,
  createAccount,
  updateAccount,
  resetPassword,
  createFromFaculty,
  listHeldInvitations,
  sendInvitationNow,
  sendPasswordResetNow,
} from '../controllers/userAccountController.js';

// Mounted behind requireAuth + requireRole('VPAA') in routes/index.js.
const router = Router();

router.get('/',                     listAccounts);
router.post('/',                    createAccount);
// Fixed paths before /:id so they aren't captured as an id.
router.post('/from-faculty',        createFromFaculty);
router.get('/held-invitations',     listHeldInvitations);
router.patch('/:id',                updateAccount);
router.post('/:id/reset-password',  resetPassword);
router.post('/:id/send-invitation', sendInvitationNow);
router.post('/:id/send-password-reset', sendPasswordResetNow);

export default router;
