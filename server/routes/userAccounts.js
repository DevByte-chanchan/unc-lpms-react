import { Router } from 'express';
import { requireRole } from '../middleware/auth.js';
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

// Mounted behind requireAuth in routes/index.js.
// The page is the Dean's (their own faculty only — the controller scopes it).
// Creating and editing accounts stays VPAA-only; there is no page for it.
const router = Router();
const page = requireRole('Dean', 'VPAA');
const admin = requireRole('VPAA');

router.get('/',                     page, listAccounts);
router.post('/',                    admin, createAccount);
// Fixed paths before /:id so they aren't captured as an id.
router.post('/from-faculty',        admin, createFromFaculty);
router.get('/held-invitations',     page, listHeldInvitations);
router.patch('/:id',                admin, updateAccount);
router.post('/:id/reset-password',  admin, resetPassword);
router.post('/:id/send-invitation', page, sendInvitationNow);
router.post('/:id/send-password-reset', page, sendPasswordResetNow);

export default router;
