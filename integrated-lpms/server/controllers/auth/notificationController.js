'use strict';

const { Op } = require('sequelize');
const db = require('../../models');

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
    const assignIds = [...assignMap.keys()];

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
          is_viewed: Boolean(log.is_viewed),
          is_read: Boolean(log.is_viewed),
          createdAt: log.createdAt,
        };
      });
    }

    const unreadCount =
      notifRows.filter((n) => !n.is_read).length +
      workflowNotifications.filter((w) => !w.is_viewed).length;

    return res.json({
      notifications: notifRows,
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
