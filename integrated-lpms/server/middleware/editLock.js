'use strict';

const db = require('../models');
const { computeWorkflowState } = require('../utils/workflowRules');

async function assertOfferingEditable(pcOfferingId, user) {
  if (!pcOfferingId) return { ok: true };
  const offering = await db.ProgramCourseOffering.findByPk(pcOfferingId);
  if (!offering) {
    const err = new Error('Course offering not found.');
    err.status = 404;
    throw err;
  }

  // Unified rule: Approved offerings (approved_at set) are strictly immutable!
  if (offering.approved_at) {
    const err = new Error('Approved learning plans are locked and cannot be edited.');
    err.status = 403;
    throw err;
  }

  const assignment = await db.CourseOfferingAssignment.findOne({
    where: { pc_offering_id: offering.pc_offering_id },
    include: [{ model: db.AssignmentWorkflowLog, as: 'logs' }],
    order: [['co_assign_id', 'DESC']],
  });

  if (assignment) {
    const wf = computeWorkflowState(assignment.logs || [], offering);
    if (!['draft', 'returned'].includes(wf.stage)) {
      const err = new Error(`Learning plan cannot be edited while in '${wf.stage}' stage.`);
      err.status = 403;
      throw err;
    }
    if (user && user.role === 'instructor' && assignment.stakeholder_id && Number(assignment.stakeholder_id) !== Number(user.id)) {
      // Also allow contributors if listed
      const contribs = Array.isArray(assignment.contributors) ? assignment.contributors : [];
      const isContrib = contribs.some((c) => Number(c.user_id) === Number(user.id) || (user.facultyId && Number(c.faculty_id) === Number(user.facultyId)));
      if (!isContrib) {
        const err = new Error('Only the assigned instructor can edit this learning plan.');
        err.status = 403;
        throw err;
      }
    }
  }
  return { ok: true, offering, assignment };
}

function requireEditableByOffering(req, _res, next) {
  const pcId = req.params.pcId || req.params.offeringId || req.body?.pc_offering_id || req.body?.pcId;
  assertOfferingEditable(pcId, req.user).then(() => next()).catch(next);
}

async function resolvePcIdFromWeekOrIlo(rawId) {
  if (!rawId) return null;
  const week = await db.Week.findByPk(rawId, {
    include: [{ model: db.CourseOutcome, as: 'courseOutcome' }],
  });
  if (week?.courseOutcome?.pc_offering_id) return week.courseOutcome.pc_offering_id;

  const ilo = await db.IntendedLearningOutcome.findByPk(rawId, {
    include: [{ model: db.CourseOutcome, as: 'courseOutcome' }],
  });
  return ilo?.courseOutcome?.pc_offering_id || null;
}

function requireEditableByWeek(req, _res, next) {
  const rawId = req.params.weekId || req.params.iloId || req.params.ilo_id || req.body?.week_id || req.body?.ilo_id;
  resolvePcIdFromWeekOrIlo(rawId)
    .then((pcId) => assertOfferingEditable(pcId, req.user))
    .then(() => next())
    .catch(next);
}

async function resolvePcIdFromIloReference(refRowId) {
  if (!refRowId) return null;
  const row = await db.WeeklyReference.findByPk(refRowId);
  if (!row?.week_id) return null;
  return resolvePcIdFromWeekOrIlo(row.week_id);
}

function requireEditableByIloRef(req, _res, next) {
  resolvePcIdFromIloReference(req.params.iloReferenceId)
    .then((pcId) => assertOfferingEditable(pcId, req.user))
    .then(() => next())
    .catch(next);
}

module.exports = {
  assertOfferingEditable,
  requireEditableByOffering,
  requireEditableByWeek,
  requireEditableByIloRef,
};
