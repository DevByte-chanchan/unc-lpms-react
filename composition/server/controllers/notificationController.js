'use strict';

// A user's own notifications. Every query is scoped to req.user; no endpoint takes a user id.

const { sequelize, Sequelize, Notification } = require('../models');
const { effectiveLogs } = require('../utils/effectiveLogs');
const { planEditState } = require('../utils/workflowRules');
const { findWaitingOnApprovers } = require('../utils/approverWaiting');
const { timezoneOf, schoolClock } = require('../utils/reminderRules');

const select = (sql, replacements = []) => sequelize.query(sql, { replacements, type: Sequelize.QueryTypes.SELECT });
const asInt = (value) => (/^\d+$/.test(String(value ?? '')) ? Number(value) : null);

// Course code, revision and review state per offering, so the client can open the right page.
const describeOfferings = async (offeringIds) => {
    const described = new Map();
    for (const id of offeringIds) {
        const [row] = await select(
            `SELECT c.course_no, pco.revision_number, a.co_assign_id
             FROM ProgramCourseOfferings pco INNER JOIN Courses c ON c.course_id = pco.course_id
                 LEFT JOIN CourseOfferingAssignments a ON a.pc_offering_id = pco.pc_offering_id
             WHERE pco.pc_offering_id = ?;`, [id]);
        if (!row) continue;
        const state = row.co_assign_id ? planEditState(await effectiveLogs(sequelize, row.co_assign_id)).state : 'Draft';
        described.set(id, { courseCode: row.course_no, revisionNumber: row.revision_number > 0 ? row.revision_number : null, state: state.toLowerCase() });
    }
    return described;
};

// The one plan waiting on this approver's decision right now, or null when there are none or several.
const onlyPlanWaitingOn = async (user) => {
    const role = { 'program-head': 'PROGRAM_HEAD', 'director-of-libraries': 'LIBRARY_DIRECTOR', dean: 'DEAN' }[user?.role];
    if (!role) return null;
    const tz = timezoneOf(process.env);
    const waiting = await findWaitingOnApprovers({ sequelize, today: schoolClock(new Date(), tz).day, timeZone: tz });
    const mine = new Set(waiting
        .filter(w => w.role === role && (role === 'LIBRARY_DIRECTOR'
            || String(role === 'PROGRAM_HEAD' ? w.programHeadId : w.deanId) === String(user.id)))
        .map(w => w.offeringId));
    return mine.size === 1 ? [...mine][0] : null;
};

const toApi = (n, described, offeringId = n.offering_id) => ({
    id: n.id,
    type: n.type,
    message: n.message,
    actorRole: n.actor_role,
    isRead: Boolean(n.is_read),
    createdAt: n.created_at,
    readAt: n.read_at,
    offeringId,
    ...(described.get(offeringId) || {})
});

// GET /api/notifications?unread=1&limit=20&offset=0  — newest first
const listNotifications = async (req, res, next) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
        const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
        const where = { recipient_user_id: req.user.id };
        if (['1', 'true'].includes(String(req.query.unread))) where.is_read = false;
        const { rows, count } = await Notification.findAndCountAll({ where, order: [['created_at', 'DESC'], ['id', 'DESC']], limit, offset });
        // A "plans waiting for your review" summary made before it named its plan: when exactly one plan waits on
        // this person now, point it there, so Open goes to the plan and not only to the list.
        const fallback = rows.some(n => n.type === 'approval_waiting' && !n.offering_id) ? await onlyPlanWaitingOn(req.user) : null;
        const offeringOf = (n) => n.offering_id || (n.type === 'approval_waiting' ? fallback : null);
        const described = await describeOfferings([...new Set(rows.map(offeringOf).filter(Boolean))]);
        const unread = await Notification.count({ where: { recipient_user_id: req.user.id, is_read: false } });
        return res.json({ total: count, unread, rows: rows.map(n => toApi(n, described, offeringOf(n))) });
    } catch (err) {
        return next(err);
    }
};

// GET /api/notifications/unread-count
const unreadCount = async (req, res, next) => {
    try {
        return res.json({ count: await Notification.count({ where: { recipient_user_id: req.user.id, is_read: false } }) });
    } catch (err) {
        return next(err);
    }
};

// PUT /api/notifications/:id/read — only your own; someone else's id is simply "not found"
const markRead = async (req, res, next) => {
    try {
        const id = asInt(req.params.id);
        const notification = id ? await Notification.findOne({ where: { id, recipient_user_id: req.user.id } }) : null;
        if (!notification) return res.status(404).json({ error: 'Notification not found.' });
        if (!notification.is_read) await notification.update({ is_read: true, read_at: new Date() });
        return res.json({ id: notification.id, isRead: true });
    } catch (err) {
        return next(err);
    }
};

// PUT /api/notifications/read-all
const markAllRead = async (req, res, next) => {
    try {
        const [updated] = await Notification.update({ is_read: true, read_at: new Date() }, { where: { recipient_user_id: req.user.id, is_read: false } });
        return res.json({ updated });
    } catch (err) {
        return next(err);
    }
};

module.exports = { listNotifications, unreadCount, markRead, markAllRead };
