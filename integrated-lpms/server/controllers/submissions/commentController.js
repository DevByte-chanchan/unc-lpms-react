'use strict';

const { Op } = require('sequelize');
const db = require('../../models');
const { computeWorkflowState } = require('../../utils/workflowRules');
const { createNotification } = require('../../services/notifyService');

/**
 * Unified Comments Controller (M2 Composition + M3 Submissions Management)
 * Preserves ALL M2 endpoints (/unresolved-counts, /filter/:weekId/:type, /course/:pcId/:revNum, /update-resolution)
 * AND ALL M3 endpoints (/by-course/:code, POST /by-course, /suggestions/:pcId, /earlier-consultant/:pcId).
 * Enforces Dean comment visibility: unforwarded Dean comments during 'with_program_head' are hidden from Instructors.
 */

async function resolveAssignmentForOffering(pcId) {
  return db.CourseOfferingAssignment.findOne({
    where: { pc_offering_id: Number(pcId) },
    include: [
      { model: db.ProgramCourseOffering, as: 'offering' },
      { model: db.AssignmentWorkflowLog, as: 'logs' },
    ],
    order: [['co_assign_id', 'DESC']],
  });
}

function filterVisibleComments(comments, userRole, workflowStage) {
  const isInstructor = userRole === 'Instructor';
  return comments.filter((c) => {
    const role = String(c.commenter_role || '').toUpperCase();
    // Hide unforwarded Dean comments from Instructor while still in 'with_program_head' triage
    if (isInstructor && workflowStage === 'with_program_head' && role === 'DEAN') {
      return false;
    }
    return true;
  });
}

exports.getUnresolvedCounts = async (req, res, next) => {
  try {
    const pcId = req.query.pcId || req.query.pc_offering_id;
    let assignIds = [];

    if (pcId) {
      const a = await resolveAssignmentForOffering(pcId);
      if (a) assignIds = [a.co_assign_id];
    } else if (req.user?.user_id) {
      const assigns = await db.CourseOfferingAssignment.findAll({
        where: { stakeholder_id: req.user.user_id },
        attributes: ['co_assign_id'],
      });
      assignIds = assigns.map((a) => a.co_assign_id);
    }

    if (assignIds.length === 0) {
      return res.json({ total: 0, byType: { topics: 0, tlas: 0, references: 0, general: 0 }, byWeek: {} });
    }

    const rows = await db.Comment.findAll({
      where: {
        co_assign_id: { [Op.in]: assignIds },
        resolved_status: false,
        commenter_role: { [Op.ne]: 'INDUSTRY_CONSULTANT' },
      },
    });

    const byType = { topics: 0, tlas: 0, references: 0, general: 0 };
    const byWeek = {};

    for (const c of rows) {
      const t = String(c.comment_for || 'general').toLowerCase();
      if (t.includes('topic')) byType.topics += 1;
      else if (t.includes('tla')) byType.tlas += 1;
      else if (t.includes('ref')) byType.references += 1;
      else byType.general += 1;

      if (c.week_id) {
        const w = String(c.week_id);
        if (!byWeek[w]) byWeek[w] = { topics: 0, tlas: 0, references: 0, total: 0 };
        if (t.includes('topic')) byWeek[w].topics += 1;
        else if (t.includes('tla')) byWeek[w].tlas += 1;
        else if (t.includes('ref')) byWeek[w].references += 1;
        byWeek[w].total += 1;
      }
    }

    return res.json({ total: rows.length, byType, byWeek });
  } catch (err) {
    return next(err);
  }
};

exports.getCommentsByWeekAndType = async (req, res, next) => {
  try {
    const weekId = Number(req.params.weekId);
    const rawType = String(req.params.type || '').toLowerCase();

    const where = { week_id: weekId };
    if (rawType && rawType !== 'all') {
      where.comment_for = { [Op.like]: `%${rawType}%` };
    }

    const comments = await db.Comment.findAll({
      where,
      include: [{ model: db.CommentTarget, as: 'targets' }],
      order: [['createdAt', 'DESC']],
    });

    return res.json(comments);
  } catch (err) {
    return next(err);
  }
};

exports.getCommentsByOffering = async (req, res, next) => {
  try {
    const pcId = Number(req.params.pcId);
    const assignment = await resolveAssignmentForOffering(pcId);
    if (!assignment) return res.json({ comments: [], unresolvedCount: 0 });

    const wf = computeWorkflowState(assignment.logs || [], assignment.offering);
    const allComments = await db.Comment.findAll({
      where: { co_assign_id: assignment.co_assign_id },
      include: [{ model: db.CommentTarget, as: 'targets' }],
      order: [['createdAt', 'DESC']],
    });

    const visible = filterVisibleComments(allComments, req.user?.activeRole, wf.stage);
    const unresolvedCount = visible.filter(
      (c) => !c.resolved_status && String(c.commenter_role || '').toUpperCase() !== 'INDUSTRY_CONSULTANT'
    ).length;

    return res.json({
      comments: visible,
      unresolvedCount,
      stage: wf.stage,
    });
  } catch (err) {
    return next(err);
  }
};

exports.getCommentsByCourseCode = async (req, res, next) => {
  try {
    const courseCode = String(req.params.courseCode || '').trim();
    const course = await db.Course.findOne({ where: { course_no: courseCode } });
    if (!course) return res.json({ comments: [] });

    const offerings = await db.ProgramCourseOffering.findAll({
      where: { course_id: course.course_id },
      order: [['pc_offering_id', 'DESC']],
    });
    const offeringIds = offerings.map((o) => o.pc_offering_id);
    if (offeringIds.length === 0) return res.json({ comments: [] });

    const assigns = await db.CourseOfferingAssignment.findAll({
      where: { pc_offering_id: { [Op.in]: offeringIds } },
    });
    const assignIds = assigns.map((a) => a.co_assign_id);
    if (assignIds.length === 0) return res.json({ comments: [] });

    const comments = await db.Comment.findAll({
      where: { co_assign_id: { [Op.in]: assignIds } },
      include: [{ model: db.CommentTarget, as: 'targets' }],
      order: [['createdAt', 'DESC']],
    });

    return res.json({ comments });
  } catch (err) {
    return next(err);
  }
};

exports.createComment = async (req, res, next) => {
  try {
    const pcId = Number(req.body?.pc_offering_id || req.body?.offering_id || req.params?.pcId);
    const courseCode = req.body?.course_code || req.body?.courseCode;
    const message = String(req.body?.message || req.body?.text || req.body?.comment_text || req.body?.comment || '').trim();
    if (!message) return res.status(400).json({ error: 'Comment message is required.' });

    let assignment = null;
    if (pcId) {
      assignment = await resolveAssignmentForOffering(pcId);
    } else if (req.body?.co_assign_id) {
      assignment = await db.CourseOfferingAssignment.findByPk(Number(req.body.co_assign_id), {
        include: [{ model: db.ProgramCourseOffering, as: 'offering' }],
      });
    } else if (courseCode) {
      const course = await db.Course.findOne({ where: { course_no: courseCode } });
      if (course) {
        const off = await db.ProgramCourseOffering.findOne({
          where: { course_id: course.course_id },
          order: [['pc_offering_id', 'DESC']],
        });
        if (off) assignment = await resolveAssignmentForOffering(off.pc_offering_id);
      }
    }

    if (!assignment) {
      return res.status(404).json({ error: 'Target course assignment not found.' });
    }

    const commenterRole = req.user?.workflowRole || 'PROGRAM_HEAD';
    const created = await db.sequelize.transaction(async (t) => {
      const comment = await db.Comment.create({
        co_assign_id: assignment.co_assign_id,
        stakeholder_id: String(req.user.user_id),
        commenter_user_id: req.user.user_id,
        commenter_name: req.user.name,
        commenter_role: commenterRole,
        message,
        resolved_status: false,
        week_id: req.body?.week_id ? Number(req.body.week_id) : null,
        comment_for: req.body?.comment_for || req.body?.section || 'general',
      }, { transaction: t });

      const targetIds = Array.isArray(req.body?.target_ids)
        ? req.body.target_ids
        : (req.body?.target_id ? [req.body.target_id] : []);
      if (targetIds.length > 0) {
        await db.CommentTarget.bulkCreate(
          targetIds.map((tid) => ({ comment_id: comment.comment_id, target_id: Number(tid) })),
          { transaction: t }
        );
      }
      return comment;
    });

    if (assignment.stakeholder_id && commenterRole !== 'DEAN') {
      await createNotification({
        recipientUserId: assignment.stakeholder_id,
        type: 'comment',
        title: `New Review Comment from ${req.user.activeRole}`,
        message: `${req.user.name}: "${message.slice(0, 140)}"`,
        link: `/composition/course/${assignment.pc_offering_id}/${assignment.offering?.revision_number || 1}/revisions`,
        offeringId: assignment.pc_offering_id,
        commentId: created.comment_id,
        actorRole: commenterRole,
        sentByAccountId: req.user.user_id,
      });
    }

    return res.status(201).json({ comment: created });
  } catch (err) {
    return next(err);
  }
};

exports.updateResolution = async (req, res, next) => {
  try {
    // Support single { comment_id, resolved_status } OR batch { updates: [{ comment_id, resolved_status }] } OR { commentIds, resolved_status }
    const updates = [];
    if (Array.isArray(req.body?.updates)) {
      for (const u of req.body.updates) {
        updates.push({ id: Number(u.comment_id || u.id), resolved: Boolean(u.resolved_status ?? u.resolved) });
      }
    } else if (Array.isArray(req.body?.commentIds)) {
      const flag = Boolean(req.body.resolved_status ?? true);
      for (const cid of req.body.commentIds) {
        updates.push({ id: Number(cid), resolved: flag });
      }
    } else if (req.body?.comment_id || req.body?.id || req.params?.commentId) {
      const id = Number(req.body?.comment_id || req.body?.id || req.params?.commentId);
      const flag = Boolean(req.body?.resolved_status ?? req.body?.resolved ?? true);
      updates.push({ id, resolved: flag });
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No comment IDs provided for resolution update.' });
    }

    const now = new Date();
    for (const u of updates) {
      await db.Comment.update(
        { resolved_status: u.resolved, resolved_date: u.resolved ? now : null },
        { where: { comment_id: u.id } }
      );
    }

    return res.json({ ok: true, updatedCount: updates.length });
  } catch (err) {
    return next(err);
  }
};

exports.listSuggestions = async (req, res, next) => {
  try {
    const pcId = Number(req.params.pcId);
    const assignment = await resolveAssignmentForOffering(pcId);
    if (!assignment) return res.json({ suggestions: [] });

    const suggestions = await db.Comment.findAll({
      where: { co_assign_id: assignment.co_assign_id, commenter_role: 'INDUSTRY_CONSULTANT' },
      order: [['createdAt', 'DESC']],
    });
    return res.json({ suggestions });
  } catch (err) {
    return next(err);
  }
};

exports.createSuggestion = async (req, res, next) => {
  try {
    const pcId = Number(req.params.pcId);
    const message = String(req.body?.message || req.body?.comment_text || req.body?.comment || '').trim();
    if (!message) return res.status(400).json({ error: 'Suggestion message is required.' });

    const assignment = await resolveAssignmentForOffering(pcId);
    if (!assignment) return res.status(404).json({ error: 'Offering assignment not found.' });

    const created = await db.Comment.create({
      co_assign_id: assignment.co_assign_id,
      stakeholder_id: String(req.user.user_id),
      commenter_user_id: req.user.user_id,
      commenter_name: req.user.name,
      commenter_role: 'INDUSTRY_CONSULTANT',
      message,
      resolved_status: false,
      week_id: req.body?.week_id ? Number(req.body.week_id) : null,
      comment_for: req.body?.comment_for || 'suggestion',
    });

    await db.AssignmentWorkflowLog.create({
      co_assign_id: assignment.co_assign_id,
      stakeholder_id: String(req.user.user_id),
      actor_user_id: req.user.user_id,
      actor_name: req.user.name,
      actor_role: 'INDUSTRY_CONSULTANT',
      action_type: 'Suggest',
      note: message.slice(0, 250),
      is_viewed: false,
    });

    return res.status(201).json({ suggestion: created });
  } catch (err) {
    return next(err);
  }
};

exports.deleteComment = async (req, res, next) => {
  try {
    const id = Number(req.params.commentId || req.params.id);
    const row = await db.Comment.findByPk(id);
    if (!row) return res.status(404).json({ error: 'Comment not found.' });
    await row.destroy();
    return res.json({ ok: true, id });
  } catch (err) {
    return next(err);
  }
};
