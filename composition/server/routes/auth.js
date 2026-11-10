'use strict';

const express = require('express');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.get('/me', authController.me);
router.post('/switch-role', requireAuth, authController.switchRole);
router.post('/change-password', requireAuth, authController.changePassword);

module.exports = router;
