'use strict';

const { Op } = require('sequelize');
const db = require('../../models');

const normalizeCommentTab = (rawFor) => {
  const s = String(rawFor || '').trim().toLowerCase();
  if (s.includes('topic')) return 'topics';
  if (s.includes('tla')) return 'tlas';
  if (s.includes('ref')) return 'references';
  return null;
};

const buildCommentFormUrl = (comment) => {
  if (!comment || !comment.week_id) return null;
  const tab = normalizeCommentTab(comment.comment_for);
  return `/topics/form/${comment.week_id}/returned${tab ? `?tab=${tab}` : ''}`;
};

const pickBestCommentForAssign = (comments = [], preferredRole = null) => {
  if (!Array.isArray(comments) || comments.length === 0) return null;
  const valid = comments.filter((c) => c.week_id && String(c.commenter_role || '').toUpperCase() !== 'INDUSTRY_CONSULTANT');
  if (valid.length === 0) return null;
  const normRole = preferredRole ? String(preferredRole).toUpperCase() : null;
  const unresolved = valid.filter((c) => !c.resolved_status);
  if (normRole) {
    const uRole = unresolved.find((c) => String(c.commenter_role || '').toUpperCase() === normRole);
    if (uRole) return uRole;
    const anyRole = valid.find((c) => String(c.commenter_role || '').toUpperCase() === normRole);
    if (anyRole) return anyRole;
  }
  return unresolved[0] || valid[0];
};

exports.listNotifications = async (req, res, next) => {
  try {
    const userId = req.user.user_id;

    // 1. Unified Notification rows (M1 + M3 + cross-module alerts)
    const notifRows = await db.Notification.findAll({
      where: { recipient_user_id: userId },
      order: [['created_at', 'DESC'], ['id', 'DESC']],
      limit: 60,
    });

    // 2. Composition workflow log notifications (for Instructor's assigned courses)
    const myAssignments = await db.CourseOfferingAssignment.findAll({
      where: { stakeholder_id: userId },
      include: [
        {
          model: db.ProgramCourseOffering,
          as: 'offering',
          include: [{ model: db.Course, as: 'course' }],
        },
      ],
    });
    const assignMap = new Map(myAssignments.map((a) => [a.co_assign_id, a]));
    const assignByOfferingId = new Map();
    for (const a of myAssignments) {
      if (a.pc_offering_id && !assignByOfferingId.has(Number(a.pc_offering_id))) {
        assignByOfferingId.set(Number(a.pc_offering_id), a);
      }
    }
    const assignIds = [...assignMap.keys()];

    // Collect comment IDs referenced by base Notification rows for single-query enrichment
    const referencedCommentIds = [...new Set(
      notifRows.map((n) => Number(n.comment_id)).filter((id) => Number.isFinite(id) && id > 0)
    )];

    const commentOrClauses = [];
    if (assignIds.length > 0) commentOrClauses.push({ co_assign_id: { [Op.in]: assignIds } });
    if (referencedCommentIds.length > 0) commentOrClauses.push({ comment_id: { [Op.in]: referencedCommentIds } });

    const allRelevantComments = commentOrClauses.length > 0
      ? await db.Comment.findAll({
          where: { [Op.or]: commentOrClauses },
          attributes: ['comment_id', 'co_assign_id', 'week_id', 'comment_for', 'commenter_role', 'resolved_status'],
          order: [['week_id', 'ASC'], ['comment_id', 'ASC']],
        })
      : [];

    const commentById = new Map();
    const commentsByAssignId = new Map();
    for (const c of allRelevantComments) {
      commentById.set(Number(c.comment_id), c);
      const aid = Number(c.co_assign_id);
      if (!commentsByAssignId.has(aid)) commentsByAssignId.set(aid, []);
      commentsByAssignId.get(aid).push(c);
    }

    const enrichedNotifications = notifRows.map((n) => {
      const json = n.toJSON ? n.toJSON() : { ...n };
      const t = String(json.type || '').toLowerCase();
      const isCommentOrReturn =
        t === 'comment' ||
        t === 'comment_added' ||
        t === 'returned' ||
        t === 'plan_returned';

      if (isCommentOrReturn) {
        let matchedComment = null;
        if (json.comment_id && commentById.has(Number(json.comment_id))) {
          matchedComment = commentById.get(Number(json.comment_id));
        } else if (json.offering_id && assignByOfferingId.has(Number(json.offering_id))) {
          const assign = assignByOfferingId.get(Number(json.offering_id));
          matchedComment = pickBestCommentForAssign(
            commentsByAssignId.get(Number(assign.co_assign_id)) || [],
            json.actor_role
          );
        }

        const directUrl = buildCommentFormUrl(matchedComment);
        if (directUrl) {
          json.target_url = directUrl;
          json.link = directUrl;
          json.target_week_id = Number(matchedComment.week_id);
          json.target_comment_for = normalizeCommentTab(matchedComment.comment_for);
        }
      }
      return json;
    });

    let workflowNotifications = [];
    if (assignIds.length > 0) {
      const logs = await db.AssignmentWorkflowLog.findAll({
        where: {
          co_assign_id: { [Op.in]: assignIds },
          actor_role: { [Op.ne]: 'INSTRUCTOR' },
        },
        order: [['createdAt', 'DESC'], ['log_id', 'DESC']],
        limit: 40,
      });

      workflowNotifications = logs.map((log) => {
        const a = assignMap.get(log.co_assign_id);
        const course = a?.offering?.course;
        const act = String(log.action_type || '').toUpperCase();
        let targetUrl = null;
        let targetWeekId = null;
        let targetCommentFor = null;

        if (act === 'RETURNED' || act === 'FORWARDED') {
          const matchedComment = pickBestCommentForAssign(
            commentsByAssignId.get(Number(log.co_assign_id)) || [],
            log.actor_role
          );
          const directUrl = buildCommentFormUrl(matchedComment);
          if (directUrl) {
            targetUrl = directUrl;
            targetWeekId = Number(matchedComment.week_id);
            targetCommentFor = normalizeCommentTab(matchedComment.comment_for);
          }
        }

        return {
          log_id: log.log_id,
          id: `log-${log.log_id}`,
          co_assign_id: log.co_assign_id,
          pc_offering_id: a?.pc_offering_id || null,
          revision_number: a?.offering?.revision_number || 1,
          course_no: course?.course_no || a?.course_code || '',
          course_title: course?.course_title || a?.course_name || '',
          actor_role: log.actor_role,
          actor_name: log.actor_name,
          action_type: log.action_type,
          note: log.note,
          target_url: targetUrl,
          target_week_id: targetWeekId,
          target_comment_for: targetCommentFor,
          is_viewed: Boolean(log.is_viewed),
          is_read: Boolean(log.is_viewed),
          createdAt: log.createdAt,
        };
      });
    }

    const unreadCount =
      enrichedNotifications.filter((n) => !n.is_read).length +
      workflowNotifications.filter((w) => !w.is_viewed).length;

    return res.json({
      notifications: enrichedNotifications,
      workflowNotifications,
      unreadCount,
    });
  } catch (err) {
    return next(err);
  }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const notifUnread = await db.Notification.count({
      where: { recipient_user_id: userId, is_read: false },
    });
    const myAssigns = await db.CourseOfferingAssignment.findAll({
      where: { stakeholder_id: userId },
      attributes: ['co_assign_id'],
    });
    let logUnread = 0;
    if (myAssigns.length > 0) {
      logUnread = await db.AssignmentWorkflowLog.count({
        where: {
          co_assign_id: { [Op.in]: myAssigns.map((a) => a.co_assign_id) },
          actor_role: { [Op.ne]: 'INSTRUCTOR' },
          is_viewed: false,
        },
      });
    }
    return res.json({ count: notifUnread + logUnread, unreadCount: notifUnread + logUnread });
  } catch (err) {
    return next(err);
  }
};

exports.markOneRead = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await db.Notification.update(
      { is_read: true, read_at: new Date() },
      { where: { id, recipient_user_id: req.user.user_id } }
    );
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
};

exports.markAllRead = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    await db.Notification.update(
      { is_read: true, read_at: new Date() },
      { where: { recipient_user_id: userId, is_read: false } }
    );
    const myAssigns = await db.CourseOfferingAssignment.findAll({
      where: { stakeholder_id: userId },
      attributes: ['co_assign_id'],
    });
    if (myAssigns.length > 0) {
      await db.AssignmentWorkflowLog.update(
        { is_viewed: true },
        { where: { co_assign_id: { [Op.in]: myAssigns.map((a) => a.co_assign_id) }, is_viewed: false } }
      );
    }
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
};

exports.markLogViewed = async (req, res, next) => {
  try {
    const logId = Number(req.params.logId);
    await db.AssignmentWorkflowLog.update({ is_viewed: true }, { where: { log_id: logId } });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
};
