const express = require('express');
const router = express.Router();
const controller = require('../controllers/notificationController');

// Everything is scoped to the signed-in user (req.user); no route takes a user id in its path.
router.get('/', controller.listNotifications);
router.get('/unread-count', controller.unreadCount);
router.put('/read-all', controller.markAllRead);
router.put('/:id/read', controller.markRead);

module.exports = router;
