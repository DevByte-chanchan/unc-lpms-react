import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { login, logout, me, changePassword } from '../controllers/authController.js';
import {
  getInvitation, acceptInvitation, forgotPassword, getReset, resetPassword,
} from '../controllers/passwordLinkController.js';
import { rateLimit } from '../utils/rateLimit.js';

const router = Router();

// Public: sign in, and the emailed set-password / reset-password links.
router.post('/login', login);

// Per client IP. Lookups are cheap but guessable-in-theory, so they share one
// budget with the submits; forgot-password sends email, so it gets its own,
// tighter one (plus MAX_PER_HOUR per account in services/passwordResets.js).
const linkLimit   = rateLimit({ windowMs: 15 * 60 * 1000, max: 60 });
const forgotLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

router.get('/invitation',          linkLimit, getInvitation);
router.post('/accept-invitation',  linkLimit, acceptInvitation);
router.get('/reset-password',      linkLimit, getReset);
router.post('/reset-password',     linkLimit, resetPassword);
router.post('/forgot-password',    forgotLimit, forgotPassword);

router.use(requireAuth);
router.post('/logout',          logout);
router.get('/me',               me);
router.post('/change-password', changePassword);

export default router;
