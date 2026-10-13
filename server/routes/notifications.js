import { Router } from 'express';
import {
  listNotifications, getUnreadCount, markRead, markAllRead,
} from '../controllers/notificationController.js';

// Mounted behind requireAuth in routes/index.js. Each user sees only their own rows.
const router = Router();

router.get('/',               listNotifications);
router.get('/unread-count',   getUnreadCount);
// Fixed path before /:id so it isn't captured as an id.
router.post('/read-all',      markAllRead);
router.post('/:id/read',      markRead);

export default router;
