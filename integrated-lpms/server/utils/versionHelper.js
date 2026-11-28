'use strict';

const { Op } = require('sequelize');
const db = require('../models');
const { computeWorkflowState } = require('./workflowRules');

/**
 * Unified Version Integrity, Lineage & Deferred Revision Increment Helper
 * Compatible with BOTH M2 Composition call style (pcId, revNum, opts) and (dbArg, pcId, revNum, opts).
 */

function computeAssignmentStatus(assignment, offering = null) {
  if (!assignment) return 'Draft';
  const logs = assignment.logs || assignment.workflowLogs || [];
  const wf = computeWorkflowState(logs, offering || assignment.offering || assignment.ProgramCourseOffering || null);
  return wf.compositionStatus;
}

function formatTermFromDate(dateInput, offering = null, period = null) {
  if (period && period.label) return period.label;
  if (offering && offering.school_year && offering.semester) {
    return `${offering.semester} SY ${offering.school_year}`;
  }
  if (!dateInput) return '1st Semester SY 2026-2027';
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '1st Semester SY 2026-2027';
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  if (month >= 6 && month <= 10) return `1st Sem SY ${year}-${year + 1}`;
  if (month >= 11) return `2nd Sem SY ${year}-${year + 1}`;
  return `2nd Sem SY ${year - 1}-${year}`;
}

async function findOfferingByPcIdAndRev(arg1, arg2, arg3, arg4) {
  // Support both (pcId, revNum, options) and (dbInstance, pcId, revNum, options)
  let pcId;
  let revNum;
  let options;
  if (arg1 && typeof arg1 === 'object' && arg1.ProgramCourseOffering) {
    pcId = arg2;
    revNum = arg3;
    options = arg4 || {};
  } else {
    pcId = arg1;
    revNum = arg2;
    options = arg3 || {};
  }

  const numPcId = Number(pcId);
  if (!numPcId) return null;
  const { where: extraWhere = {}, ...restOptions } = options;

  if (revNum !== undefined && revNum !== null && String(revNum) !== '' && !Number.isNaN(Number(revNum))) {
    const exact = await db.ProgramCourseOffering.findOne({
      where: { pc_offering_id: numPcId, revision_number: Number(revNum), ...extraWhere },
      ...restOptions,
    });
    if (exact) return exact;
  }

  return db.ProgramCourseOffering.findOne({
    where: { pc_offering_id: numPcId, ...extraWhere },
    ...restOptions,
  });
}

async function markOfferingModified(arg1, arg2, arg3) {
  let pcOfferingId;
  let transaction;
  if (arg1 && typeof arg1 === 'object' && arg1.ProgramCourseOffering) {
    pcOfferingId = arg2;
    transaction = arg3 || null;
  } else {
    pcOfferingId = arg1;
    transaction = arg2 || null;
  }
  if (!pcOfferingId) return;
  await db.ProgramCourseOffering.update(
    { has_modifications: true },
    {
      where: { pc_offering_id: Number(pcOfferingId) },
      ...(transaction ? { transaction } : {}),
    }
  );
}

async function evaluateAndIncrementRevisionOnApproval(arg1, arg2, arg3) {
  let pcOfferingId;
  let transaction;
  if (arg1 && typeof arg1 === 'object' && arg1.ProgramCourseOffering) {
    pcOfferingId = arg2;
    transaction = arg3 || null;
  } else {
    pcOfferingId = arg1;
    transaction = arg2 || null;
  }

  const txOpt = transaction ? { transaction } : {};
  const offering = await db.ProgramCourseOffering.findByPk(Number(pcOfferingId), txOpt);
  if (!offering) return { incremented: false, reason: 'not_found', revision_number: null };
  if (offering.is_revision_incremented) {
    return { incremented: false, reason: 'already_incremented', revision_number: offering.revision_number, offering };
  }

  const assignment = await db.CourseOfferingAssignment.findOne({
    where: { pc_offering_id: offering.pc_offering_id },
    include: [{ model: db.AssignmentWorkflowLog, as: 'logs' }],
    order: [['co_assign_id', 'DESC']],
    ...txOpt,
  });

  const wf = computeWorkflowState(assignment?.logs || [], offering);
  if (wf.stage !== 'approved' && !offering.approved_at) {
    return { incremented: false, reason: 'not_approved', revision_number: offering.revision_number, offering };
  }

  const priorOfferings = await db.ProgramCourseOffering.findAll({
    where: {
      course_id: offering.course_id,
      program_id: offering.program_id,
      pc_offering_id: { [Op.ne]: offering.pc_offering_id },
      approved_at: { [Op.ne]: null },
    },
    ...txOpt,
  });

  const hasPrior = priorOfferings.length > 0 || Boolean(offering.base_pc_offering_id);
  if (!hasPrior) {
    return { incremented: false, reason: 'first_approved_baseline', revision_number: offering.revision_number, offering };
  }

  if (!offering.has_modifications) {
    return { incremented: false, reason: 'no_modifications', revision_number: offering.revision_number, offering };
  }

  const maxPriorRev = priorOfferings.reduce((m, o) => Math.max(m, Number(o.revision_number || 1)), Number(offering.revision_number || 1));
  const nextRevision = maxPriorRev + 1;

  await offering.update(
    {
      revision_number: nextRevision,
      is_revision_incremented: true,
    },
    txOpt
  );

  return { incremented: true, revision_number: nextRevision, offering };
}

async function resolveWeekLineageContext(weekId) {
  const numericWeekId = parseInt(weekId, 10);
  if (Number.isNaN(numericWeekId)) return null;

  const weekRecord = await db.Week.findByPk(numericWeekId, {
    include: [
      {
        model: db.CourseOutcome,
        as: 'courseOutcome',
        include: [
          {
            model: db.ProgramCourseOffering,
            as: 'offering',
            include: [{ model: db.Course, as: 'course' }],
          },
          {
            model: db.IntendedLearningOutcome,
            as: 'ilos',
          },
        ],
      },
    ],
  });

  const co = weekRecord?.courseOutcome;
  const pco = co?.offering || co?.ProgramCourseOffering;
  if (!weekRecord || !co || !pco) return null;
  const course = pco.course || pco.Course || null;

  const allOfferingCos = await db.CourseOutcome.findAll({
    where: { pc_offering_id: pco.pc_offering_id },
    include: [
      { model: db.Week, as: 'weeks' },
      { model: db.IntendedLearningOutcome, as: 'ilos' },
    ],
    order: [
      ['co_id', 'ASC'],
      [{ model: db.Week, as: 'weeks' }, 'week_id', 'ASC'],
      [{ model: db.IntendedLearningOutcome, as: 'ilos' }, 'ilo_id', 'ASC'],
    ],
  });

  let coNumber = 1;
  let globalWeekCounter = 0;
  let targetGlobalWeekNumber = 1;
  const allCurrentOfferingWeekIds = [];
  const orderedCurrentWeeks = [];

  allOfferingCos.forEach((coItem, cIdx) => {
    if (Number(coItem.co_id) === Number(co.co_id)) coNumber = cIdx + 1;
    const sortedWeeks = [...(coItem.weeks || [])].sort((a, b) => Number(a.week_id) - Number(b.week_id));
    sortedWeeks.forEach((w) => {
      globalWeekCounter += 1;
      allCurrentOfferingWeekIds.push(Number(w.week_id));
      orderedCurrentWeeks.push({
        week_id: Number(w.week_id),
        co_id: Number(coItem.co_id),
        co_number: cIdx + 1,
        week_number: globalWeekCounter,
        hours: Number(w.hours) || 5,
      });
      if (Number(w.week_id) === numericWeekId) {
        targetGlobalWeekNumber = globalWeekCounter;
      }
    });
  });

  const otherOfferings = await db.ProgramCourseOffering.findAll({
    where: {
      course_id: pco.course_id,
      pc_offering_id: { [Op.ne]: pco.pc_offering_id },
    },
    include: [
      {
        model: db.CourseOfferingAssignment,
        as: 'assignments',
        include: [{ model: db.AssignmentWorkflowLog, as: 'logs' }],
      },
      {
        model: db.CourseOutcome,
        as: 'courseOutcomes',
        include: [
          { model: db.Week, as: 'weeks' },
          { model: db.IntendedLearningOutcome, as: 'ilos' },
        ],
      },
    ],
    order: [
      ['revision_number', 'DESC'],
      ['pc_offering_id', 'DESC'],
    ],
  });

  const priorOfferings = otherOfferings.map((other) => {
    const assigns = other.assignments || [];
    const latestAssign = [...assigns].sort((a, b) => Number(b.co_assign_id) - Number(a.co_assign_id))[0];
    const status = computeAssignmentStatus(latestAssign, other);
    const termLabel = formatTermFromDate(latestAssign?.date_assigned || other.createdAt, other);

    const sortedCos = [...(other.courseOutcomes || [])].sort((a, b) => Number(a.co_id) - Number(b.co_id));
    let wkCounter = 0;
    const weeksWithNumbers = [];
    sortedCos.forEach((otherCo, cIdx) => {
      const sortedWks = [...(otherCo.weeks || [])].sort((a, b) => Number(a.week_id) - Number(b.week_id));
      sortedWks.forEach((w) => {
        wkCounter += 1;
        weeksWithNumbers.push({
          week_id: Number(w.week_id),
          co_id: Number(otherCo.co_id),
          co_number: cIdx + 1,
          week_number: wkCounter,
          hours: Number(w.hours) || 5,
        });
      });
    });

    return {
      pc_offering_id: Number(other.pc_offering_id),
      revision_number: Number(other.revision_number) || 1,
      status,
      termLabel,
      date_assigned: latestAssign?.date_assigned || null,
      weeks: weeksWithNumbers,
      courseOutcomes: sortedCos,
    };
  });

  const sortedPriorOfferings = [...priorOfferings].sort((a, b) => {
    const aApproved = a.status === 'Approved' ? 1 : 0;
    const bApproved = b.status === 'Approved' ? 1 : 0;
    if (bApproved !== aApproved) return bApproved - aApproved;
    if (b.revision_number !== a.revision_number) return b.revision_number - a.revision_number;
    return b.pc_offering_id - a.pc_offering_id;
  });

  const baseOffering = pco.base_pc_offering_id
    ? sortedPriorOfferings.find((o) => Number(o.pc_offering_id) === Number(pco.base_pc_offering_id)) || sortedPriorOfferings[0] || null
    : sortedPriorOfferings[0] || null;

  return {
    weekId: numericWeekId,
    weekNumber: targetGlobalWeekNumber,
    weeklyHours: Number(weekRecord.hours) || 5,
    isOrientation: targetGlobalWeekNumber === 1,
    coId: Number(co.co_id),
    coNumber,
    coDescription: co.co_description || '',
    pcOfferingId: Number(pco.pc_offering_id),
    revisionNumber: Number(pco.revision_number) || 1,
    basePcOfferingId: pco.base_pc_offering_id ? Number(pco.base_pc_offering_id) : null,
    courseId: Number(pco.course_id),
    courseCode: course?.course_no || '',
    courseTitle: course?.course_title || '',
    courseDescription: pco.course_description || '',
    contactHours: course?.contact_hrs || '',
    credit: course?.credit || '',
    allOfferingCos,
    allCurrentOfferingWeekIds,
    orderedCurrentWeeks,
    priorOfferings: sortedPriorOfferings,
    previousOfferings: sortedPriorOfferings,
    baseOffering,
  };
}

module.exports = {
  computeAssignmentStatus,
  formatTermFromDate,
  findOfferingByPcIdAndRev,
  markOfferingModified,
  evaluateAndIncrementRevisionOnApproval,
  resolveWeekLineageContext,
};
