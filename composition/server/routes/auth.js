'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { rateLimit } = require('../utils/rateLimit');

// The e-mailed links (feature/course-assignment): lookups and submits share one budget per address;
// asking for an e-mail gets a tighter one.
const linkLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 60 });
const mailLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

// GET /api/auth/privacy — the Privacy Notice and the Data Protection Officer's contact. Public: it has
// to be readable before anyone has an account.
router.get('/privacy', auth.privacyNotice);

// POST /api/auth/register — create an account with one of the six LPMS roles
router.post('/register', auth.register);

// POST /api/auth/login — verify credentials, return the public user record
router.post('/login', auth.login);

// POST /api/auth/forgot-password — create a reset token. Always answers the
// same way, whether or not the email is registered.
router.post('/forgot-password', mailLimit, auth.requestReset);

// GET /api/auth/reset-password?token= — whom a reset link is for; POST — use it to set a new password
router.get('/reset-password', linkLimit, auth.getReset);
router.post('/reset-password', linkLimit, auth.resetPassword);

// The set-password invitation: who it is for, accept it (sets the password and signs in), or ask for a new link
router.get('/invitation', linkLimit, auth.getInvitation);
router.post('/accept-invitation', linkLimit, auth.acceptInvitation);
router.post('/request-invitation', mailLimit, auth.requestInvitation);

// POST /api/auth/change-password — signed-in user changes their own password (also the forced
// first-sign-in change). Allowed while a temporary password is still in force.
router.post('/change-password', requireAuth, auth.changePassword);

// POST /api/auth/logout — invalidate the server-side session and expire its
// HttpOnly cookie. Authentication prevents arbitrary cookie churn.
router.post('/logout', requireAuth, auth.logout);

// GET /api/auth/session — reconcile the browser's saved identity with the
// HttpOnly server session after refreshes and backend restarts.
router.get('/session', requireAuth, auth.currentSession);

// GET /api/auth/demo-accounts — the demo accounts the sign-in screen may list. Off by default
// (LPMS_SHOW_DEMO_ACCOUNTS=1 turns it on), never in production.
router.get('/demo-accounts', auth.demoAccounts);

// GET /api/auth/health — is server-side auth available? The client uses this
// to decide whether to fall back to its local account store.
router.get('/health', auth.health);

module.exports = router;
