const express = require('express');
const router = express.Router();
const controller = require('../controllers/userController');
const { requirePermission } = require('../middleware/auth');

// Superuser only. There is deliberately no DELETE route: accounts are deactivated, never deleted.
router.use(requirePermission('users:manage'));
router.get('/', controller.listUsers);
router.post('/', controller.createUser);
router.put('/:id/role', controller.changeRole);
router.put('/:id/reset-password', controller.resetPassword);
router.put('/:id/activate', controller.activateUser);
router.put('/:id/deactivate', controller.deactivateUser);

module.exports = router;
