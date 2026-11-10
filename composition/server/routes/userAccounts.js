'use strict';

// User Accounts (feature/course-assignment): the VPAA and the superuser manage the accounts.
const express = require('express');
const router = express.Router();
const controller = require('../controllers/userAccountController');
const { requirePermission } = require('../middleware/auth');

router.use(requirePermission('users:manage'));
router.get('/', controller.listAccounts);
router.post('/', controller.createAccount);
router.patch('/:id', controller.updateAccount);
router.post('/:id/reset-password', controller.resetPassword);
router.post('/:id/send-invitation', controller.sendInvitationNow);
router.post('/:id/send-password-reset', controller.sendPasswordResetNow);

module.exports = router;
