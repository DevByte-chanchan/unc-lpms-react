'use strict';

// A user's own notifications. Every query is scoped to req.user; no endpoint takes a user id
// except the poke target, which is validated as a reviewer with a pending item on the offering.

const { Op, Transaction } = require('sequelize');
const { sequelize, Sequelize, Notification, User } = require('../models');
const { effectiveLogs } = require('../utils/effectiveLogs');
const { planEditState, pendingReviewerRoles } = require('../utils/workflowRules');
const { canAccessCourseRows, loadOfferingCourseRows } = require('../middleware/courseAuthorization');
const { peopleFor, usersForRole } = require('../utils/notificationEvents');
const { eventMessage, ROLE_LABEL } = require('../utils/notify');
const { record: audit } = require('../utils/audit');

const POKE_WINDOW_MS = 4 * 60 * 60 * 1000;
const WORKFLOW_ROLE_BY_ACCOUNT = { 'director-of-libraries': 'LIBRARY_DIRECTOR', 'program-head': 'PROGRAM_HEAD', dean: 'DEAN' };

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

const toApi = (n, described) => ({
    id: n.id,
    type: n.type,
    message: n.message,
    actorRole: n.actor_role,
    isRead: Boolean(n.is_read),
    createdAt: n.created_at,
    readAt: n.read_at,
    offeringId: n.offering_id,
    ...(described.get(n.offering_id) || {})
});

// GET /api/notifications?unread=1&limit=20&offset=0  — newest first
const listNotifications = async (req, res, next) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
        const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
        const where = { recipient_user_id: req.user.id };
        if (['1', 'true'].includes(String(req.query.unread))) where.is_read = false;
        const { rows, count } = await Notification.findAndCountAll({ where, order: [['created_at', 'DESC'], ['id', 'DESC']], limit, offset });
        const described = await describeOfferings([...new Set(rows.map(n => n.offering_id).filter(Boolean))]);
        const unread = await Notification.count({ where: { recipient_user_id: req.user.id, is_read: false } });
        return res.json({ total: count, unread, rows: rows.map(n => toApi(n, described)) });
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

// ---- poke ---------------------------------------------------------------------------------

// Loads what a poke needs: the offering's people and its pending reviewer roles, or an error reply.
const loadPokeContext = async (req, res, offeringId) => {
    const rows = await loadOfferingCourseRows(offeringId);
    if (rows.length === 0) { res.status(404).json({ error: 'Course offering not found.' }); return null; }
    if (!canAccessCourseRows(req.user, rows)) { res.status(403).json({ error: 'You do not have access to this course.' }); return null; }
    const people = await peopleFor(offeringId);
    const logs = people?.assignmentId ? await effectiveLogs(sequelize, people.assignmentId) : [];
    return { people, pending: pendingReviewerRoles(logs) };
};

const lastPoke = (userId, offeringId, transaction) => Notification.findOne({
    where: { recipient_user_id: userId, offering_id: offeringId, type: 'poke', created_at: { [Op.gte]: new Date(Date.now() - POKE_WINDOW_MS) } },
    order: [['created_at', 'DESC']],
    ...(transaction ? { transaction } : {})
});
const nextPokeAt = (poke) => (poke ? new Date(new Date(poke.created_at).getTime() + POKE_WINDOW_MS) : null);

// GET /api/notifications/poke-targets/:offeringId — reviewers with a pending item, and when each may be poked again
const pokeTargets = async (req, res, next) => {
    try {
        const offeringId = asInt(req.params.offeringId);
        if (!offeringId) return res.status(400).json({ error: 'A valid offering id is required.' });
        const context = await loadPokeContext(req, res, offeringId);
        if (!context) return undefined;

        const targets = [];
        for (const role of context.pending) {
            for (const userId of usersForRole(context.people, role)) {
                if (!userId || String(userId) === String(req.user.id)) continue;
                const user = await User.findByPk(userId);
                if (!user || !user.is_active) continue;
                const next = nextPokeAt(await lastPoke(user.user_id, offeringId));
                targets.push({ userId: user.user_id, name: user.name, role: user.role, roleLabel: ROLE_LABEL[user.role], nextPokeAt: next });
            }
        }
        return res.json({ targets });
    } catch (err) {
        return next(err);
    }
};

// POST /api/notifications/poke { offeringId, targetUserId }
const poke = async (req, res, next) => {
    try {
        const offeringId = asInt(req.body?.offeringId);
        const targetUserId = asInt(req.body?.targetUserId);
        if (!offeringId || !targetUserId) return res.status(400).json({ error: 'offeringId and targetUserId are required.' });
        if (targetUserId === req.user.id) return res.status(400).json({ error: 'You cannot poke yourself.' });

        const context = await loadPokeContext(req, res, offeringId);
        if (!context) return undefined;

        const target = await User.findByPk(targetUserId);
        const workflowRole = target && target.is_active ? WORKFLOW_ROLE_BY_ACCOUNT[target.role] : null;
        const holdsPending = workflowRole
            && context.pending.includes(workflowRole)
            && usersForRole(context.people, workflowRole).some(id => String(id) === String(targetUserId));
        if (!holdsPending) return res.status(409).json({ error: 'That person has no pending review on this course.' });

        // Check and insert under one write lock, so two simultaneous pokes cannot both pass.
        const outcome = await sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async (transaction) => {
            const recent = await lastPoke(targetUserId, offeringId, transaction);
            if (recent) return { limited: true, next: nextPokeAt(recent) };
            await Notification.create({
                recipient_user_id: targetUserId,
                type: 'poke',
                offering_id: offeringId,
                message: eventMessage(context.people.courseCode, 'reminder: review pending', req.user.role),
                actor_role: WORKFLOW_ROLE_BY_ACCOUNT[req.user.role] || null,
                is_read: false
            }, { transaction });
            return { limited: false, next: new Date(Date.now() + POKE_WINDOW_MS) };
        });

        if (outcome.limited) {
            const retryAfterSeconds = Math.max(1, Math.ceil((outcome.next.getTime() - Date.now()) / 1000));
            res.set('Retry-After', String(retryAfterSeconds));
            return res.status(429).json({ error: 'This reviewer was already poked about this course. Try again later.', retryAfterSeconds, nextPokeAt: outcome.next });
        }

        await audit({
            actor: req.user, action: 'NOTIFICATION_POKE', entityType: 'notifications', entityId: offeringId,
            details: { target_user_id: targetUserId, offering_id: offeringId }, ip: req.ip
        });
        return res.status(201).json({ ok: true, nextPokeAt: outcome.next });
    } catch (err) {
        return next(err);
    }
};

module.exports = { listNotifications, unreadCount, markRead, markAllRead, pokeTargets, poke, POKE_WINDOW_MS };
