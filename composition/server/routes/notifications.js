'use strict';

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

router.get('/', notificationController.listNotifications);
router.patch('/view-all', notificationController.markAllAsViewed);
router.post('/view-all', notificationController.markAllAsViewed);
router.patch('/:logId/view', notificationController.markAsViewed);
router.post('/:logId/view', notificationController.markAsViewed);

module.exports = router;
