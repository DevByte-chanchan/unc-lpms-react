'use strict';

const db = require('../../models');
const { findOfferingByPcIdAndRev } = require('../../utils/versionHelper');
const { computeWorkflowState } = require('../../utils/workflowRules');
const { notifyUsersByRole } = require('../../services/notifyService');

/**
 * POST /api/submit-learning-plan/:pcId/:revNum
 * Submits (or resubmits) a Learning Plan into simultaneous review (Director of Libraries + Program Head).
 * Mandatory Gate: If currently in 'returned' stage, blocks resubmission with HTTP 400 if any
 * visible reviewer comments (LIBRARY_DIRECTOR / PROGRAM_HEAD / forwarded DEAN) remain unresolved.
 */
async function submitLearningPlan(req, res, next) {
  try {
    const { pcId, revNum } = req.params;
    if (!pcId) {
      return res.status(400).json({ message: 'pcId is required.' });
    }

    const offering = await findOfferingByPcIdAndRev(pcId, revNum, {
      include: [{ model: db.Course, as: 'course' }],
    });
    if (!offering) {
      return res.status(404).json({ message: 'Learning Plan Offering not found.' });
    }

    if (offering.approved_at) {
      return res.status(409).json({ message: 'This Learning Plan is already approved and locked.' });
    }

    const assignment = await db.CourseOfferingAssignment.findOne({
      where: { pc_offering_id: offering.pc_offering_id },
      include: [{ model: db.AssignmentWorkflowLog, as: 'logs' }],
      order: [['co_assign_id', 'DESC']],
    });
    if (!assignment) {
      return res.status(404).json({ message: 'Course Assignment not found for this offering.' });
    }

    const wf = computeWorkflowState(assignment.logs || [], offering);
    if (wf.stage === 'approved') {
      return res.status(409).json({ message: 'This Learning Plan is already approved.' });
    }
    if (wf.stage === 'parallel_review' || wf.stage === 'dean_review' || wf.stage === 'with_program_head') {
      return res.status(200).json({
        message: 'Learning plan is already submitted and under review.',
        status: 'success',
        stage: wf.stage,
      });
    }

    // Resubmission Gate: When returning from 'returned', every visible reviewer comment must be resolved!
    if (wf.stage === 'returned') {
      const comments = await db.Comment.findAll({
        where: { co_assign_id: assignment.co_assign_id, resolved_status: false },
      });
      // Exclude Industry Consultant suggestions (which are advisory for future terms)
      const blockingUnresolved = comments.filter(
        (c) => String(c.commenter_role || '').toUpperCase() !== 'INDUSTRY_CONSULTANT'
      );
      if (blockingUnresolved.length > 0) {
        return res.status(400).json({
          error: `Cannot resubmit: ${blockingUnresolved.length} reviewer comment(s) must be resolved first.`,
          message: `Cannot resubmit: ${blockingUnresolved.length} reviewer comment(s) must be resolved first.`,
          unresolvedCount: blockingUnresolved.length,
        });
      }
    }

    const now = new Date();
    const actorUserId = req.user?.user_id || assignment.stakeholder_id || 1;
    const actorName = req.user?.name || assignment.faculty_name || 'Instructor';

    await db.sequelize.transaction(async (t) => {
      await assignment.update({ date_submitted: now, date_updated: now }, { transaction: t });

      await db.AssignmentWorkflowLog.create({
        co_assign_id: assignment.co_assign_id,
        stakeholder_id: String(actorUserId),
        actor_user_id: Number(actorUserId),
        actor_name: actorName,
        actor_role: 'INSTRUCTOR',
        action_type: 'SUBMITTED',
        note: wf.stage === 'returned' ? 'Addressed review comments and resubmitted learning plan.' : 'Submitted learning plan for review.',
        is_viewed: true,
        createdAt: now,
        updatedAt: now,
      }, { transaction: t });

      // Clear return snapshot once resubmitted
      if (db.PlanReturnSnapshot) {
        await db.PlanReturnSnapshot.destroy({ where: { offering_id: offering.pc_offering_id }, transaction: t });
      }
    });

    const courseCode = offering.course?.course_no || assignment.course_code || `Offering #${offering.pc_offering_id}`;
    const courseTitle = offering.course?.course_title || assignment.course_name || '';

    // Notify both Director of Libraries and Program Head for simultaneous review
    const notifPayload = {
      type: 'submitted',
      title: `Learning Plan Submitted: ${courseCode}`,
      message: `${actorName} submitted ${courseCode} (${courseTitle}) for simultaneous review.`,
      link: `/submissions/review/${offering.pc_offering_id}`,
      offeringId: offering.pc_offering_id,
      actorRole: 'INSTRUCTOR',
      sentByAccountId: actorUserId,
    };
    await Promise.all([
      notifyUsersByRole('Director of Libraries', notifPayload),
      notifyUsersByRole('Program Head', notifPayload),
    ]);

    return res.status(200).json({
      message: 'Learning Plan submitted successfully for simultaneous review.',
      status: 'success',
      stage: 'parallel_review',
      pc_offering_id: offering.pc_offering_id,
      co_assign_id: assignment.co_assign_id,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { submitLearningPlan };
