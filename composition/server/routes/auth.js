'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

// POST /api/auth/register — create an account with one of the six LPMS roles
router.post('/register', auth.register);

// POST /api/auth/login — verify credentials, return the public user record
router.post('/login', auth.login);

// POST /api/auth/forgot-password — create a reset token. Always answers the
// same way, whether or not the email is registered.
router.post('/forgot-password', auth.requestReset);

// POST /api/auth/reset-password — consume a token and set a new password
router.post('/reset-password', auth.resetPassword);

// POST /api/auth/change-password — signed-in user changes their own password (also the forced
// first-sign-in change). Allowed while a temporary password is still in force.
router.post('/change-password', requireAuth, auth.changePassword);

// POST /api/auth/logout — invalidate the server-side session and expire its
// HttpOnly cookie. Authentication prevents arbitrary cookie churn.
router.post('/logout', requireAuth, auth.logout);

// GET /api/auth/session — reconcile the browser's saved identity with the
// HttpOnly server session after refreshes and backend restarts.
router.get('/session', requireAuth, auth.currentSession);

// GET /api/auth/health — is server-side auth available? The client uses this
// to decide whether to fall back to its local account store.
router.get('/health', auth.health);

module.exports = router;
