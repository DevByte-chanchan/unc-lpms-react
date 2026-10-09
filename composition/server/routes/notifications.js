const express = require('express');
const router = express.Router();
const controller = require('../controllers/notificationController');
const { requirePermission } = require('../middleware/auth');

// Everything is scoped to the signed-in user (req.user); no route takes a user id in its path.
router.get('/', controller.listNotifications);
router.get('/unread-count', controller.unreadCount);
router.put('/read-all', controller.markAllRead);
router.put('/:id/read', controller.markRead);

// Poke (remind the instructor to submit): Program Head and Dean only (users the matrix grants notification:poke).
router.get('/poke-targets/:offeringId', requirePermission('notification:poke'), controller.pokeTargets);
router.post('/poke', requirePermission('notification:poke'), controller.poke);

module.exports = router;
