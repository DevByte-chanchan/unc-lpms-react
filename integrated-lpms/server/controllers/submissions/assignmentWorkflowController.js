'use strict';

const { Op } = require('sequelize');
const db = require('../../models');
const { computeWorkflowState, validateWorkflowTransition } = require('../../utils/workflowRules');
const { evaluateAndIncrementRevisionOnApproval, formatTermFromDate } = require('../../utils/versionHelper');
const { createNotification, notifyUsersByRole } = require('../../services/notifyService');

/**
 * Unified Assignments & Approval Workflow Controller (M2 Composition + M3 Submissions)
 */

async function buildEnrichedAssignment(a) {
  const data = a.toJSON();
  const offering = a.offering || a.ProgramCourseOffering || null;
  const logs = a.logs || a.workflowLogs || [];
  const comments = a.comments || [];

  const wf = computeWorkflowState(logs, offering);
  const unresolvedComments = comments.filter(
    (c) => !c.resolved_status && String(c.commenter_role || '').toUpperCase() !== 'INDUSTRY_CONSULTANT'
  ).length;

  const course = offering?.course || offering?.Course || null;
  const program = offering?.program || offering?.Program || null;
  const department = offering?.department || offering?.Department || null;

  const offeringJson = offering
    ? {
        ...offering.toJSON(),
        Course: course ? course.toJSON() : null,
        Program: program ? program.toJSON() : null,
        Department: department ? department.toJSON() : null,
      }
    : null;

  return {
    ...data,
    logs,
    workflowLogs: logs,
    ProgramCourseOffering: offeringJson,
    offering: offeringJson,
    pc_offering_id: offering?.pc_offering_id || a.pc_offering_id,
    revision_number: offering?.revision_number || 1,
    course_no: course?.course_no || a.course_code || '',
    course_title: course?.course_title || a.course_name || '',
    program_name: program?.name || '',
    program_code: program?.code || '',
    department_name: department?.name || '',
    department_code: department?.code || '',
    school_year: offering?.school_year || '2026-2027',
    semester: offering?.semester || '1st Semester',
    termLabel: formatTermFromDate(a.date_assigned || offering?.createdAt, offering),
    instructor_name: a.faculty_name || a.instructorUser?.name || 'Assigned Instructor',
    overallStatus: wf.compositionStatus,
    workflowStage: wf.stage,
    stage: wf.stage,
    libraryStatus: wf.libraryStatus,
    programHeadStatus: wf.programHeadStatus,
    deanStatus: wf.deanStatus,
    returnedBy: wf.returnedBy,
    counterNote: wf.counterNote,
    canExport: wf.canExport,
    exportWatermarked: wf.exportWatermarked,
    date_approved: wf.approvedAt,
    approved_at: offering?.approved_at || wf.approvedAt,
    unresolvedComments,
    totalComments: comments.length,
  };
}

function matchesYearFilter(schoolYear, yearFilter) {
  const normSy = String(schoolYear || '').replace(/^sy\s*/i, '').replace(/\s+/g, '');
  const normFilter = String(yearFilter || '').replace(/^sy\s*/i, '').replace(/\s+/g, '');
  if (!normFilter) return true;
  if (/^\d{4}$/.test(normFilter)) {
    return normSy === normFilter || normSy.startsWith(`${normFilter}-`);
  }
  return normSy === normFilter;
}

exports.listAssignments = async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 200);
    const statusFilter = req.query.status ? String(req.query.status).trim().toLowerCase() : null;
    const stageFilter = req.query.stage ? String(req.query.stage).trim().toLowerCase() : null;
    const search = req.query.search ? String(req.query.search).trim().toLowerCase() : null;
    const programId = req.query.program_id || req.query.programId ? Number(req.query.program_id || req.query.programId) : null;
    const courseId = req.query.course_id || req.query.courseId ? Number(req.query.course_id || req.query.courseId) : null;
    const deptId = req.query.dept_id ? Number(req.query.dept_id) : null;
    const periodId = req.query.academic_period_id ? Number(req.query.academic_period_id) : null;
    const yearFilter = req.query.year ? String(req.query.year).trim() : null;
    const semFilter = req.query.semester ? String(req.query.semester).trim().toLowerCase() : null;
    const scope = String(req.query.scope || '').toLowerCase();

    const where = { pc_offering_id: { [Op.ne]: null } };

    // If explicitly filtered by stakeholder, OR if active role is Instructor (and not asking for all/approver view)
    if (req.query.stakeholder) {
      where.stakeholder_id = Number(req.query.stakeholder);
    } else if (req.user?.activeRole === 'Instructor' && scope !== 'all') {
      where[Op.or] = [
        { stakeholder_id: req.user.user_id },
        ...(req.user.facultyId ? [{ faculty_id: req.user.facultyId }] : []),
      ];
    }

    if (periodId) where.academic_period_id = periodId;

    const rows = await db.CourseOfferingAssignment.findAll({
      where,
      include: [
        {
          model: db.ProgramCourseOffering,
          as: 'offering',
          required: true,
          where: {
            ...(programId ? { program_id: programId } : {}),
            ...(courseId ? { course_id: courseId } : {}),
            ...(deptId ? { dept_id: deptId } : {}),
          },
          include: [
            { model: db.Course, as: 'course' },
            { model: db.Program, as: 'program' },
            { model: db.Department, as: 'department' },
          ],
        },
        { model: db.User, as: 'instructorUser', attributes: ['user_id', 'name', 'email'], required: false },
        { model: db.AssignmentWorkflowLog, as: 'logs', required: false },
        { model: db.Comment, as: 'comments', required: false },
      ],
      order: [['co_assign_id', 'DESC']],
    });

    // Deduplicate by pc_offering_id (keep latest assignment record)
    const seen = new Set();
    let enriched = [];
    for (const a of rows) {
      if (seen.has(a.pc_offering_id)) continue;
      seen.add(a.pc_offering_id);
      enriched.push(await buildEnrichedAssignment(a));
    }

    // Role-based retrieval scoping
    const activeRole = req.user?.activeRole;
    if (activeRole === 'Industry Consultant') {
      // Industry Consultant only sees Approved plans for courses explicitly assigned to them
      const assignedLinks = await db.CourseConsultant.findAll({
        where: { consultant_user_id: req.user.user_id, is_active: true },
      });
      const allowedCourseIds = new Set(assignedLinks.map((l) => Number(l.course_id)));
      enriched = enriched.filter(
        (item) => item.workflowStage === 'approved' && allowedCourseIds.has(Number(item.offering?.course_id))
      );
    } else if (activeRole === 'VPAA' && scope !== 'all') {
      // VPAA only monitors Dean-approved learning plans
      enriched = enriched.filter((item) => item.workflowStage === 'approved');
    } else if (
      ['Program Head', 'Dean', 'Director of Libraries'].includes(activeRole) &&
      (yearFilter || semFilter) &&
      stageFilter !== 'draft'
    ) {
      // Unsubmitted drafts belong exclusively in /api/missing-submissions ("Not submitted" tab),
      // never in the approver Pending/Returned/Approved review queue.
      enriched = enriched.filter((item) => item.workflowStage !== 'draft');
    }

    if (yearFilter) {
      enriched = enriched.filter((item) => matchesYearFilter(item.school_year, yearFilter));
    }
    if (semFilter) {
      enriched = enriched.filter((item) => {
        const s = String(item.semester || '').toLowerCase();
        if (semFilter.startsWith('1')) return s.startsWith('1');
        if (semFilter.startsWith('2')) return s.startsWith('2');
        return s.includes(semFilter);
      });
    }

    if (search) {
      enriched = enriched.filter((item) =>
        `${item.course_no} ${item.course_title} ${item.instructor_name} ${item.program_name}`.toLowerCase().includes(search)
      );
    }

    if (statusFilter && statusFilter !== 'all') {
      enriched = enriched.filter((item) => item.overallStatus.toLowerCase() === statusFilter);
    }

    if (stageFilter && stageFilter !== 'all') {
      enriched = enriched.filter((item) => item.workflowStage.toLowerCase() === stageFilter);
    }

    const total = enriched.length;
    const start = (page - 1) * limit;
    const paged = enriched.slice(start, start + limit);

    return res.json({
      count: total,
      total,
      page,
      limit,
      perPage: limit,
      data: paged,
      rows: paged,
      assignments: paged,
    });
  } catch (err) {
    return next(err);
  }
};

exports.getWaitingOnMe = async (req, res, next) => {
  try {
    const role = req.user.activeRole;
    const rows = await db.CourseOfferingAssignment.findAll({
      where: { pc_offering_id: { [Op.ne]: null } },
      include: [
        {
          model: db.ProgramCourseOffering,
          as: 'offering',
          required: true,
          include: [
            { model: db.Course, as: 'course' },
            { model: db.Program, as: 'program' },
            { model: db.Department, as: 'department' },
          ],
        },
        { model: db.AssignmentWorkflowLog, as: 'logs', required: false },
        { model: db.Comment, as: 'comments', required: false },
      ],
      order: [['co_assign_id', 'DESC']],
    });

    let allowedConsultantCourseIds = null;
    let signedConsultantOfferingIds = null;
    let activePeriod = null;
    if (role === 'Industry Consultant') {
      const [assignedLinks, signoffs, currentPeriod] = await Promise.all([
        db.CourseConsultant.findAll({
          where: { consultant_user_id: req.user.user_id, is_active: true },
        }),
        db.ConsultantSignoff.findAll({
          where: { consultant_user_id: req.user.user_id },
        }),
        db.AcademicPeriod.findOne({
          where: { is_active: true },
          order: [['sort_order', 'DESC'], ['academic_period_id', 'DESC']],
        }),
      ]);
      allowedConsultantCourseIds = new Set(assignedLinks.map((l) => Number(l.course_id)));
      signedConsultantOfferingIds = new Set(signoffs.map((s) => Number(s.offering_id)));
      activePeriod = currentPeriod;
    }

    const seen = new Set();
    const items = [];
    for (const a of rows) {
      if (seen.has(a.pc_offering_id)) continue;
      seen.add(a.pc_offering_id);
      const item = await buildEnrichedAssignment(a);

      let waiting = false;
      if (role === 'Director of Libraries') {
        waiting = item.workflowStage === 'parallel_review' && item.libraryStatus === 'Pending';
      } else if (role === 'Program Head') {
        waiting =
          (item.workflowStage === 'parallel_review' && item.programHeadStatus === 'Pending') ||
          item.workflowStage === 'with_program_head';
      } else if (role === 'Dean') {
        waiting = item.workflowStage === 'dean_review';
      } else if (role === 'Instructor') {
        const isOwner =
          Number(a.stakeholder_id) === Number(req.user.user_id) ||
          (req.user.facultyId && Number(a.faculty_id) === Number(req.user.facultyId));
        waiting = isOwner && (item.workflowStage === 'returned' || item.workflowStage === 'draft');
      } else if (role === 'Industry Consultant') {
        const inActivePeriod = !activePeriod || Number(item.offering?.academic_period_id) === Number(activePeriod.academic_period_id);
        waiting =
          item.workflowStage === 'approved' &&
          inActivePeriod &&
          allowedConsultantCourseIds.has(Number(item.offering?.course_id)) &&
          !signedConsultantOfferingIds.has(Number(item.pc_offering_id));
      } else if (role === 'VPAA') {
        // VPAA monitors approved plans and does not perform approval actions
        waiting = false;
      }

      if (waiting) items.push(item);
    }

    return res.json({ count: items.length, items });
  } catch (err) {
    return next(err);
  }
};

exports.getOfferingWorkflow = async (req, res, next) => {
  try {
    const pcId = Number(req.params.pcId);
    const offering = await db.ProgramCourseOffering.findByPk(pcId, {
      include: [
        { model: db.Course, as: 'course' },
        { model: db.Program, as: 'program' },
        { model: db.Department, as: 'department' },
      ],
    });
    if (!offering) return res.status(404).json({ error: 'Offering not found.' });

    const assignment = await db.CourseOfferingAssignment.findOne({
      where: { pc_offering_id: pcId },
      include: [
        { model: db.AssignmentWorkflowLog, as: 'logs' },
        { model: db.Comment, as: 'comments', include: [{ model: db.CommentTarget, as: 'targets' }] },
      ],
      order: [['co_assign_id', 'DESC']],
    });

    const wf = computeWorkflowState(assignment?.logs || [], offering);
    const signoffs = await db.ConsultantSignoff.findAll({ where: { offering_id: pcId } });

    return res.json({
      offering,
      assignment,
      workflow: wf,
      logs: (assignment?.logs || []).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
      comments: assignment?.comments || [],
      consultantSignoffs: signoffs,
    });
  } catch (err) {
    return next(err);
  }
};

exports.getPlanChecks = async (req, res, next) => {
  try {
    const pcId = Number(req.params.pcId);
    const offering = await db.ProgramCourseOffering.findByPk(pcId, {
      include: [
        { model: db.Course, as: 'course' },
        {
          model: db.CourseOutcome,
          as: 'courseOutcomes',
          include: [
            { model: db.IntendedLearningOutcome, as: 'ilos' },
            { model: db.ProgramOutcomeAlignment, as: 'poAlignments' },
            {
              model: db.Week,
              as: 'weeks',
              include: [
                { model: db.Subtopic, as: 'subtopics' },
                { model: db.TeachingAndLearningActivity, as: 'tlas' },
                { model: db.WeeklyReference, as: 'weeklyReferences', include: [{ model: db.Reference, as: 'reference' }] },
              ],
            },
          ],
        },
      ],
    });
    if (!offering) return res.status(404).json({ error: 'Offering not found.' });

    const cos = offering.courseOutcomes || [];
    const weeks = cos.flatMap((c) => c.weeks || []);
    const ilos = cos.flatMap((c) => c.ilos || []);
    const alignments = cos.flatMap((c) => c.poAlignments || []);

    const weeksWithTopics = weeks.filter((w) => (w.subtopics || []).length > 0).length;
    const weeksWithTlas = weeks.filter((w) => (w.tlas || []).length > 0).length;
    const weeksWithRefs = weeks.filter((w) => (w.weeklyReferences || []).length > 0).length;

    const totals = { prelim: 0, midterm: 0, semi: 0, final: 0 };
    for (const ilo of ilos) {
      totals.prelim += Number(ilo.prelim_weight || 0);
      totals.midterm += Number(ilo.midterm_weight || 0);
      totals.semi += Number(ilo.semi_weight || 0);
      totals.final += Number(ilo.final_weight || 0);
    }

    const currentYear = new Date().getFullYear();
    const catalogSettings = await db.CatalogSetting.findByPk(1);
    const recencyLimit = catalogSettings?.recency_years || 5;
    const deprecatedRefs = [];
    const seenRefIds = new Set();
    for (const w of weeks) {
      for (const wr of (w.weeklyReferences || [])) {
        const ref = wr.reference;
        if (!ref || seenRefIds.has(ref.reference_id)) continue;
        seenRefIds.add(ref.reference_id);
        if (ref.type === 'Textbook' && ref.publication_year) {
          const yr = new Date(ref.publication_year).getFullYear();
          if (currentYear - yr > recencyLimit) {
            deprecatedRefs.push({ reference_id: ref.reference_id, title: ref.title, year: yr });
          }
        }
      }
    }

    const assignment = await db.CourseOfferingAssignment.findOne({ where: { pc_offering_id: pcId }, order: [['co_assign_id', 'DESC']] });
    const unresolvedComments = assignment
      ? await db.Comment.count({
          where: {
            co_assign_id: assignment.co_assign_id,
            resolved_status: false,
            commenter_role: { [Op.ne]: 'INDUSTRY_CONSULTANT' },
          },
        })
      : 0;

    const checks = [
      { key: 'course_details', label: 'Course Details & Description', pass: Boolean(offering.course && offering.course_description) },
      { key: 'co_po', label: 'CO–PO Alignment Matrix', pass: alignments.length > 0 },
      { key: 'coaep_weights', label: 'Grading Criteria Weights (100% per term)', pass: totals.prelim === 100 && totals.midterm === 100 && totals.semi === 100 && totals.final === 100, details: totals },
      { key: 'weekly_topics', label: `Weekly Topics Mapped (${weeksWithTopics}/${weeks.length})`, pass: weeks.length > 0 && weeksWithTopics === weeks.length },
      { key: 'weekly_tlas', label: `Weekly TLAs Mapped (${weeksWithTlas}/${weeks.length})`, pass: weeks.length > 0 && weeksWithTlas === weeks.length },
      { key: 'weekly_refs', label: `Weekly References Mapped (${weeksWithRefs}/${weeks.length})`, pass: weeks.length > 0 && weeksWithRefs === weeks.length },
      { key: 'comments_resolved', label: `Unresolved Reviewer Comments (${unresolvedComments})`, pass: unresolvedComments === 0 },
    ];

    return res.json({
      pc_offering_id: pcId,
      ready: checks.every((c) => c.pass),
      checks,
      gradingTotals: totals,
      deprecatedReferences: deprecatedRefs,
      unresolvedComments,
    });
  } catch (err) {
    return next(err);
  }
};

exports.getReviewRecord = async (req, res, next) => {
  try {
    const pcId = Number(req.params.pcId);
    const snap = await db.ReviewRecordSnapshot.findByPk(pcId);
    if (snap) {
      return res.json({ frozen: true, snapshot: JSON.parse(snap.payload), savedAt: snap.createdAt });
    }
    const offering = await db.ProgramCourseOffering.findByPk(pcId, {
      include: [
        { model: db.Course, as: 'course' },
        { model: db.Program, as: 'program' },
        { model: db.Department, as: 'department' },
      ],
    });
    if (!offering) return res.status(404).json({ error: 'Offering not found.' });
    const assignment = await db.CourseOfferingAssignment.findOne({
      where: { pc_offering_id: pcId },
      include: [{ model: db.AssignmentWorkflowLog, as: 'logs' }, { model: db.Comment, as: 'comments' }],
      order: [['co_assign_id', 'DESC']],
    });
    return res.json({
      frozen: false,
      snapshot: {
        offering,
        workflow: computeWorkflowState(assignment?.logs || [], offering),
        logs: assignment?.logs || [],
        comments: assignment?.comments || [],
      },
    });
  } catch (err) {
    return next(err);
  }
};

exports.getOfferingSignatures = async (req, res, next) => {
  try {
    const pcId = Number(req.params.pcId);
    const offering = await db.ProgramCourseOffering.findByPk(pcId, {
      include: [{ model: db.Program, as: 'program' }, { model: db.Department, as: 'department' }],
    });
    if (!offering) return res.status(404).json({ error: 'Offering not found.' });
    const assignment = await db.CourseOfferingAssignment.findOne({ where: { pc_offering_id: pcId }, order: [['co_assign_id', 'DESC']] });

    const users = await db.User.findAll({ attributes: ['user_id', 'name', 'role', 'roles', 'signature_path'] });
    const findByRole = (r) => users.find((u) => (u.roles || [u.role]).includes(r));

    const instructor = assignment?.stakeholder_id ? users.find((u) => u.user_id === assignment.stakeholder_id) : findByRole('Instructor');
    const programHead = offering.program?.stakeholder_id ? users.find((u) => u.user_id === offering.program.stakeholder_id) : findByRole('Program Head');
    const libraryDirector = findByRole('Director of Libraries');
    const dean = offering.department?.stakeholder_id ? users.find((u) => u.user_id === offering.department.stakeholder_id) : findByRole('Dean');

    const serialize = (u, title) => u ? {
      user_id: u.user_id,
      name: u.name,
      role: title,
      hasSignature: Boolean(u.signature_path),
      signatureUrl: u.signature_path ? `/api/profile/signature/${u.user_id}` : null,
    } : null;

    const latestSignoff = await db.ConsultantSignoff.findOne({
      where: { offering_id: pcId },
      order: [['signed_at', 'DESC']],
    });
    const consultantUser = latestSignoff?.consultant_user_id
      ? users.find((u) => Number(u.user_id) === Number(latestSignoff.consultant_user_id))
      : null;

    const sigMap = {
      instructor: serialize(instructor, 'Instructor'),
      libraryDirector: serialize(libraryDirector, 'Director of Libraries'),
      programHead: serialize(programHead, 'Program Head'),
      dean: serialize(dean, 'Dean'),
    };

    return res.json({
      ...sigMap,
      signatures: sigMap,
      consultant: latestSignoff ? {
        user_id: latestSignoff.consultant_user_id,
        name: latestSignoff.consultant_name || consultantUser?.name || 'Industry Consultant',
        signedAt: latestSignoff.signed_at,
        hasSignature: Boolean(consultantUser?.signature_path),
        signatureUrl: consultantUser?.signature_path ? `/api/profile/signature/${consultantUser.user_id}` : null,
      } : null,
    });
  } catch (err) {
    return next(err);
  }
};

exports.performWorkflowAction = async (req, res, next) => {
  try {
    let pcOfferingId = Number(
      req.body?.pc_offering_id ||
      req.body?.offering_id ||
      req.body?.pcId ||
      req.params?.pcId ||
      0
    );
    const courseCode = String(req.body?.code || req.body?.course_code || req.body?.courseCode || '').trim();
    const rawAction = req.body?.action_type || req.body?.action;
    const note = req.body?.note ? String(req.body.note).trim() : null;

    if (!pcOfferingId && courseCode) {
      const course = await db.Course.findOne({ where: { course_no: courseCode } });
      if (course) {
        const latestOff = await db.ProgramCourseOffering.findOne({
          where: { course_id: course.course_id },
          order: [['pc_offering_id', 'DESC']],
        });
        if (latestOff) pcOfferingId = Number(latestOff.pc_offering_id);
      }
    }

    if (!pcOfferingId || !rawAction) {
      return res.status(400).json({ error: 'pc_offering_id and action_type are required.' });
    }

    const offering = await db.ProgramCourseOffering.findByPk(pcOfferingId, {
      include: [{ model: db.Course, as: 'course' }],
    });
    if (!offering) return res.status(404).json({ error: 'Learning plan offering not found.' });

    const assignment = await db.CourseOfferingAssignment.findOne({
      where: { pc_offering_id: pcOfferingId },
      include: [{ model: db.AssignmentWorkflowLog, as: 'logs' }],
      order: [['co_assign_id', 'DESC']],
    });
    if (!assignment) return res.status(404).json({ error: 'Course offering assignment not found.' });

    const currentWf = computeWorkflowState(assignment.logs || [], offering);
    const check = validateWorkflowTransition({
      stage: currentWf.stage,
      actorWorkflowRole: req.user.workflowRole,
      actionType: rawAction,
      note,
    });

    if (!check.ok) {
      return res.status(400).json({ error: check.error, currentStage: currentWf.stage });
    }

    const actionType = check.normalizedAction;
    const actorWorkflowRole = req.user.workflowRole;

    // Prevent Instructor from resubmitting while actionable reviewer comments remain unresolved
    if (actorWorkflowRole === 'INSTRUCTOR' && actionType === 'SUBMITTED') {
      const unresolvedCount = await db.Comment.count({
        where: {
          co_assign_id: assignment.co_assign_id,
          resolved_status: false,
          commenter_role: { [Op.ne]: 'INDUSTRY_CONSULTANT' },
        },
      });
      if (unresolvedCount > 0) {
        return res.status(400).json({
          error: `Cannot submit yet. There are still ${unresolvedCount} unresolved review comment(s) to address.`,
        });
      }
    }

    const result = await db.sequelize.transaction(async (t) => {
      const log = await db.AssignmentWorkflowLog.create({
        co_assign_id: assignment.co_assign_id,
        stakeholder_id: String(req.user.user_id),
        actor_user_id: req.user.user_id,
        actor_name: req.user.name,
        actor_role: actorWorkflowRole,
        action_type: actionType,
        note,
        is_viewed: false,
      }, { transaction: t });

      if (actorWorkflowRole === 'INSTRUCTOR' && actionType === 'SUBMITTED') {
        const now = new Date();
        await assignment.update({ date_submitted: now, date_updated: now }, { transaction: t });
      }

      const updatedLogs = [...(assignment.logs || []), log];
      const nextWf = computeWorkflowState(updatedLogs, offering);

      let revisionEvaluation = null;

      // Dean Final Approval -> stamp approved_at, evaluate deferred revision increment, snapshot ReviewRecord, close open comments!
      if (actorWorkflowRole === 'DEAN' && actionType === 'ACCEPTED') {
        const now = new Date();
        await offering.update({ approved_at: now }, { transaction: t });
        await assignment.update({ date_updated: now }, { transaction: t });

        // Auto-resolve any lingering review comments upon final Dean approval
        await db.Comment.update(
          { resolved_status: true, resolved_date: now },
          {
            where: {
              co_assign_id: assignment.co_assign_id,
              resolved_status: false,
              commenter_role: { [Op.ne]: 'INDUSTRY_CONSULTANT' },
            },
            transaction: t,
          }
        );

        revisionEvaluation = await evaluateAndIncrementRevisionOnApproval(offering.pc_offering_id, t);

        const refreshedOffering = await db.ProgramCourseOffering.findByPk(offering.pc_offering_id, { transaction: t });
        await db.ReviewRecordSnapshot.upsert({
          offering_id: offering.pc_offering_id,
          payload: JSON.stringify({
            approved_at: now.toISOString(),
            approved_by: req.user.name,
            revision_number: refreshedOffering.revision_number,
            logs: updatedLogs.map((l) => l.toJSON ? l.toJSON() : l),
          }),
        }, { transaction: t });
      }

      // Return to Instructor -> save return snapshot
      if (
        (actionType === 'RETURNED' && (actorWorkflowRole === 'LIBRARY_DIRECTOR' || actorWorkflowRole === 'PROGRAM_HEAD')) ||
        (actionType === 'FORWARDED' && actorWorkflowRole === 'PROGRAM_HEAD')
      ) {
        await db.PlanReturnSnapshot.upsert({
          offering_id: offering.pc_offering_id,
          payload: JSON.stringify({
            returned_at: new Date().toISOString(),
            returned_by: req.user.name,
            returned_role: actorWorkflowRole,
            note,
          }),
        }, { transaction: t });
      }

      return { log, nextWf, revisionEvaluation };
    });

    // Fire cross-module notifications outside transaction
    const courseLabel = `${offering.course?.course_no || assignment.course_code || ''} — ${offering.course?.course_title || assignment.course_name || ''}`;
    if (actorWorkflowRole === 'INSTRUCTOR' && actionType === 'SUBMITTED') {
      await notifyUsersByRole('Program Head', {
        type: 'submitted',
        title: `Learning Plan Submitted: ${offering.course?.course_no || ''}`,
        message: `${req.user.name} submitted ${courseLabel} for review.`,
        link: `/submissions/review/${offering.pc_offering_id}`,
        offeringId: offering.pc_offering_id,
        actorRole: 'INSTRUCTOR',
        sentByAccountId: req.user.user_id,
      });
      await notifyUsersByRole('Director of Libraries', {
        type: 'submitted',
        title: `Learning Plan Submitted: ${offering.course?.course_no || ''}`,
        message: `${req.user.name} submitted ${courseLabel} for reference review.`,
        link: `/submissions/review/${offering.pc_offering_id}`,
        offeringId: offering.pc_offering_id,
        actorRole: 'INSTRUCTOR',
        sentByAccountId: req.user.user_id,
      });
    } else if (actorWorkflowRole === 'DEAN' && actionType === 'ACCEPTED') {
      if (assignment.stakeholder_id) {
        await createNotification({
          recipientUserId: assignment.stakeholder_id,
          type: 'approved',
          title: `Learning Plan Approved: ${offering.course?.course_no || ''}`,
          message: `Dean ${req.user.name} granted final approval for ${courseLabel}.`,
          link: `/courses/${offering.pc_offering_id}/${result.revisionEvaluation?.revision_number || offering.revision_number}/approved`,
          offeringId: offering.pc_offering_id,
          actorRole: 'DEAN',
          sentByAccountId: req.user.user_id,
        });
      }
      await notifyUsersByRole('VPAA', {
        type: 'approved',
        title: `Approved Learning Plan: ${offering.course?.course_no || ''}`,
        message: `${courseLabel} has been approved by Dean ${req.user.name} and is ready for institutional archive.`,
        link: `/submissions/review/${offering.pc_offering_id}`,
        offeringId: offering.pc_offering_id,
        actorRole: 'DEAN',
        sentByAccountId: req.user.user_id,
      });
    } else if (result.nextWf.stage === 'dean_review') {
      const isCountered = actorWorkflowRole === 'PROGRAM_HEAD' && actionType === 'COUNTERED';
      await notifyUsersByRole('Dean', {
        type: 'dean_review',
        title: isCountered
          ? `Program Head Sent Back Plan: ${offering.course?.course_no || ''}`
          : `Ready for Final Dean Approval: ${offering.course?.course_no || ''}`,
        message: isCountered
          ? `${req.user.name} sent ${courseLabel} back for your reconsideration.${note ? ` Note: ${note}` : ''}`
          : `Both Director of Libraries and Program Head approved ${courseLabel}. Ready for your final review.`,
        link: `/submissions/review/${offering.pc_offering_id}`,
        offeringId: offering.pc_offering_id,
        actorRole: actorWorkflowRole,
        sentByAccountId: req.user.user_id,
      });
    } else if (result.nextWf.stage === 'with_program_head') {
      await notifyUsersByRole('Program Head', {
        type: 'dean_returned',
        title: `Dean Returned Learning Plan: ${offering.course?.course_no || ''}`,
        message: `Dean ${req.user.name} returned ${courseLabel} to you for triage.${note ? ` Note: ${note}` : ''}`,
        link: `/submissions/review/${offering.pc_offering_id}`,
        offeringId: offering.pc_offering_id,
        actorRole: 'DEAN',
        sentByAccountId: req.user.user_id,
      });
    } else if (result.nextWf.stage === 'returned' && assignment.stakeholder_id) {
      const returnedComments = await db.Comment.findAll({
        where: {
          co_assign_id: assignment.co_assign_id,
          resolved_status: false,
          commenter_role: { [Op.ne]: 'INDUSTRY_CONSULTANT' },
          week_id: { [Op.ne]: null },
        },
        order: [['week_id', 'ASC'], ['comment_id', 'ASC']],
      });
      const roleMatch = returnedComments.find((c) => String(c.commenter_role || '').toUpperCase() === actorWorkflowRole);
      const primaryComment = roleMatch || returnedComments[0] || null;
      const tabName = ['topics', 'tlas', 'references'].includes(String(primaryComment?.comment_for || '').toLowerCase())
        ? String(primaryComment.comment_for).toLowerCase()
        : null;
      const returnLink = primaryComment?.week_id
        ? `/topics/form/${primaryComment.week_id}/returned${tabName ? `?tab=${tabName}` : ''}`
        : `/courses/${offering.pc_offering_id}/${offering.revision_number}/returned`;

      await createNotification({
        recipientUserId: assignment.stakeholder_id,
        type: 'returned',
        title: `Learning Plan Returned: ${offering.course?.course_no || ''}`,
        message: `${req.user.name} (${req.user.activeRole}) returned ${courseLabel} for revision.${note ? ` Note: ${note}` : ''}`,
        link: returnLink,
        offeringId: offering.pc_offering_id,
        commentId: primaryComment?.comment_id || null,
        targetType: tabName || null,
        targetId: primaryComment?.week_id || null,
        actorRole: actorWorkflowRole,
        sentByAccountId: req.user.user_id,
      });
    }

    const refreshed = await db.ProgramCourseOffering.findByPk(offering.pc_offering_id);

    return res.json({
      ok: true,
      action_type: actionType,
      workflow: result.nextWf,
      revision_number: refreshed.revision_number,
      approved_at: refreshed.approved_at,
      revisionEvaluation: result.revisionEvaluation,
    });
  } catch (err) {
    return next(err);
  }
};
