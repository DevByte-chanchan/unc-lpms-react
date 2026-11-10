const express = require('express');
const router = express.Router();
const controller = require('../controllers/userController');
const { requirePermission } = require('../middleware/auth');

// Superuser only. There is deliberately no DELETE route: accounts are deactivated, never deleted.
router.use(requirePermission('users:manage'));
// The superuser's own API (it can grant the superuser role). The VPAA also holds users:manage, but manages
// accounts only through /api/user-accounts, which keeps the superuser role out of its reach.
router.use((req, res, next) => (req.user?.role === 'superuser'
    ? next()
    : res.status(403).json({ error: 'You do not have permission to perform this action.' })));
router.get('/', controller.listUsers);
router.post('/', controller.createUser);
router.put('/:id/role', controller.changeRole);
router.put('/:id/reset-password', controller.resetPassword);
router.put('/:id/activate', controller.activateUser);
router.put('/:id/deactivate', controller.deactivateUser);

module.exports = router;
