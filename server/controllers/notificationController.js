/**
 * The bell — a user's own notifications, and nobody else's.
 *
 *   GET  /api/notifications?limit=20&before=<id>   { items, unread }, newest first
 *   GET  /api/notifications/unread-count           { unread }  (cheap; the header polls it)
 *   POST /api/notifications/:id/read
 *   POST /api/notifications/read-all
 *
 * Every query is scoped to req.user.id, so another user's row answers 404 —
 * it doesn't exist as far as this user is concerned.
 */
import { Op } from 'sequelize';
import db from '../models/index.js';

const { Notification, UserAccount } = db;

const present = (n, senders) => ({
  id: n.id,
  kind: n.kind,
  title: n.title,
  body: n.body,
  link: n.link,
  period_id: n.period_id,
  from: n.sent_by_account_id ? (senders.get(n.sent_by_account_id) || null) : null,
  read_at: n.read_at,
  emailed_at: n.emailed_at,
  created_at: n.createdAt,
});

const unreadCount = (userId) => Notification.count({ where: { user_account_id: userId, read_at: null } });

export async function listNotifications(req, res, next) {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const before = Number(req.query.before);
    const where = { user_account_id: req.user.id, ...(before ? { id: { [Op.lt]: before } } : {}) };
    const rows = await Notification.findAll({ where, order: [['id', 'DESC']], limit });
    const senderIds = [...new Set(rows.map((r) => r.sent_by_account_id).filter(Boolean))];
    const senders = new Map();
    if (senderIds.length) {
      for (const a of await UserAccount.findAll({ where: { id: senderIds }, attributes: ['id', 'display_name'] })) senders.set(a.id, a.display_name);
    }
    return res.json({ items: rows.map((r) => present(r, senders)), unread: await unreadCount(req.user.id) });
  } catch (err) {
    return next(err);
  }
}

export async function getUnreadCount(req, res, next) {
  try {
    return res.json({ unread: await unreadCount(req.user.id) });
  } catch (err) {
    return next(err);
  }
}

export async function markRead(req, res, next) {
  try {
    const id = Number(req.params.id);
    const row = id ? await Notification.findOne({ where: { id, user_account_id: req.user.id } }) : null;
    if (!row) return res.status(404).json({ message: 'Notification not found.' });
    if (!row.read_at) await row.update({ read_at: new Date() });
    return res.json({ id: row.id, read_at: row.read_at, unread: await unreadCount(req.user.id) });
  } catch (err) {
    return next(err);
  }
}

export async function markAllRead(req, res, next) {
  try {
    const [n] = await Notification.update({ read_at: new Date() }, { where: { user_account_id: req.user.id, read_at: null } });
    return res.json({ marked: n, unread: 0 });
  } catch (err) {
    return next(err);
  }
}
