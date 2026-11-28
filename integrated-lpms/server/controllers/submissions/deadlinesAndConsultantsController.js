'use strict';

const db = require('../../models');
const { computeWorkflowState } = require('../../utils/workflowRules');
const { cloneOfferingContent } = require('../../services/offeringService');
const { createNotification } = require('../../services/notifyService');

function normalizeSemesterForDb(sem) {
  const v = String(sem || '').trim().toLowerCase();
  if (!v) return '1st Semester';
  if (v === '1' || v === '1st' || v.startsWith('1st') || v.includes('first')) return '1st Semester';
  if (v === '2' || v === '2nd' || v.startsWith('2nd') || v.includes('second')) return '2nd Semester';
  if (v === '3' || v.includes('sum') || v.includes('mid')) return 'Summer';
  return String(sem).trim();
}

// Term Deadlines
exports.listTermDeadlines = async (req, res, next) => {
  try {
    const where = {};
    if (req.query?.program_id) where.program_id = Number(req.query.program_id);
    const rows = await db.TermDeadline.findAll({ where, order: [['id', 'DESC']] });
    return res.json({ deadlines: rows });
  } catch (err) {
    return next(err);
  }
};

exports.saveTermDeadline = async (req, res, next) => {
  try {
    const program_id = Number(req.body?.program_id || 1);
    const school_year = String(req.body?.school_year || '2026-2027').trim();
    const semester = normalizeSemesterForDb(req.body?.semester || '1st Semester');
    const syllabus_due = req.body?.syllabus_due;
    if (!syllabus_due) return res.status(400).json({ error: 'syllabus_due date is required.' });

    const candidates = await db.TermDeadline.findAll({ where: { program_id, school_year } });
    const existing = candidates.find((d) => normalizeSemesterForDb(d.semester) === semester) || null;
    if (existing) {
      await existing.update({
        semester,
        syllabus_due,
        remind_before: req.body?.remind_before ?? existing.remind_before,
        overdue_every: req.body?.overdue_every != null ? Number(req.body.overdue_every) : existing.overdue_every,
        set_by: req.user?.user_id || existing.set_by,
      });
      return res.json({ deadline: existing });
    }

    const created = await db.TermDeadline.create({
      program_id,
      school_year,
      semester,
      syllabus_due,
      remind_before: req.body?.remind_before || '7,3,1,0',
      overdue_every: req.body?.overdue_every != null ? Number(req.body.overdue_every) : 3,
      set_by: req.user?.user_id || null,
    });
    return res.status(201).json({ deadline: created });
  } catch (err) {
    return next(err);
  }
};

exports.deleteTermDeadline = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const row = await db.TermDeadline.findByPk(id);
    if (!row) return res.status(404).json({ error: 'Term deadline not found.' });
    await row.destroy();
    return res.json({ ok: true, id });
  } catch (err) {
    return next(err);
  }
};

// Missing Submissions Monitoring
exports.listMissingSubmissions = async (_req, res, next) => {
  try {
    const [deadlines, pauses, reminderNotifs, assigns] = await Promise.all([
      db.TermDeadline.findAll(),
      db.ReminderPause.findAll(),
      db.Notification.findAll({
        where: { type: 'reminder' },
        order: [['created_at', 'DESC']],
      }),
      db.CourseOfferingAssignment.findAll({
        include: [
          {
            model: db.ProgramCourseOffering,
            as: 'offering',
            required: true,
            include: [{ model: db.Course, as: 'course' }, { model: db.Program, as: 'program' }],
          },
          {
            model: db.User,
            as: 'instructorUser',
            attributes: ['user_id', 'name', 'email', 'is_active', 'status'],
            required: false,
          },
          { model: db.AssignmentWorkflowLog, as: 'logs' },
        ],
        order: [['co_assign_id', 'DESC']],
      }),
    ]);

    const pausedSet = new Set(pauses.map((p) => Number(p.offering_id)));
    const lastReminderByOffering = new Map();
    for (const n of reminderNotifs) {
      const offId = Number(n.offering_id);
      if (offId && !lastReminderByOffering.has(offId)) {
        lastReminderByOffering.set(offId, n.created_at);
      }
    }

    const seenOfferings = new Set();
    const missing = [];
    for (const a of assigns) {
      if (!a.pc_offering_id || seenOfferings.has(a.pc_offering_id)) continue;
      seenOfferings.add(a.pc_offering_id);

      const wf = computeWorkflowState(a.logs || [], a.offering);
      // "Not submitted" strictly tracks offerings still in unsubmitted draft state.
      if (wf.stage !== 'draft') continue;

      const offYear = String(a.offering.school_year || '2026-2027').trim();
      const offSem = normalizeSemesterForDb(a.offering.semester || '1st Semester');
      const dl = deadlines.find(
        (d) =>
          Number(d.program_id) === Number(a.offering.program_id) &&
          String(d.school_year || '').trim() === offYear &&
          normalizeSemesterForDb(d.semester) === offSem
      );

      const instrUser = a.instructorUser;
      const instructorActive = instrUser
        ? Boolean(instrUser.is_active && instrUser.status !== 'Disabled')
        : Boolean(a.stakeholder_id || a.faculty_name);

      missing.push({
        pc_offering_id: a.pc_offering_id,
        co_assign_id: a.co_assign_id,
        course_no: a.offering.course?.course_no || a.course_code || '',
        course_title: a.offering.course?.course_title || a.course_name || '',
        program_id: Number(a.offering.program_id || a.program_id || 0),
        program_name: a.offering.program?.name || '',
        school_year: offYear,
        semester: offSem,
        instructor_name: a.faculty_name || instrUser?.name || 'Instructor',
        instructor_active: instructorActive,
        stakeholder_id: a.stakeholder_id,
        date_assigned: a.date_assigned || a.createdAt || null,
        stage: wf.stage,
        syllabus_due: dl?.syllabus_due || null,
        due_date: dl?.syllabus_due || null,
        last_reminder_at: lastReminderByOffering.get(Number(a.pc_offering_id)) || null,
        reminders_paused: pausedSet.has(Number(a.pc_offering_id)),
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    return res.json({ today, missing, total: missing.length });
  } catch (err) {
    return next(err);
  }
};

exports.toggleReminderPause = async (req, res, next) => {
  try {
    const offeringId = Number(req.params.pcId);
    const existing = await db.ReminderPause.findByPk(offeringId);
    if (existing) {
      await existing.destroy();
      return res.json({ offering_id: offeringId, paused: false });
    }
    await db.ReminderPause.create({ offering_id: offeringId, paused_by: req.user?.user_id || null });
    return res.json({ offering_id: offeringId, paused: true });
  } catch (err) {
    return next(err);
  }
};

exports.sendReminderNow = async (req, res, next) => {
  try {
    const offeringId = Number(req.params.pcId);
    const assign = await db.CourseOfferingAssignment.findOne({
      where: { pc_offering_id: offeringId },
      include: [{ model: db.ProgramCourseOffering, as: 'offering', include: [{ model: db.Course, as: 'course' }] }],
      order: [['co_assign_id', 'DESC']],
    });
    if (!assign) return res.status(404).json({ error: 'Assignment not found.' });

    if (assign.stakeholder_id) {
      await createNotification({
        recipientUserId: assign.stakeholder_id,
        type: 'reminder',
        title: `Submission Reminder: ${assign.offering?.course?.course_no || assign.course_code || ''}`,
        message: `${req.user.name} sent a reminder to complete and submit your learning plan.`,
        link: `/composition/course/${offeringId}/${assign.offering?.revision_number || 1}/course-details`,
        offeringId,
        actorRole: req.user.workflowRole,
        sentByAccountId: req.user.user_id,
      });
    }
    return res.json({ ok: true, offering_id: offeringId });
  } catch (err) {
    return next(err);
  }
};

// Course Consultants & Sign-offs (M3)
exports.listCourseConsultants = async (req, res, next) => {
  try {
    const where = { is_active: true };
    if (req.query?.course_id) where.course_id = Number(req.query.course_id);
    const rows = await db.CourseConsultant.findAll({
      where,
      include: [
        { model: db.Course, as: 'course', attributes: ['course_id', 'course_no', 'course_title'] },
        { model: db.User, as: 'consultantUser', attributes: ['user_id', 'name', 'email'] },
      ],
      order: [['course_consultant_id', 'DESC']],
    });
    return res.json({ consultants: rows });
  } catch (err) {
    return next(err);
  }
};

exports.signoffApprovedPlan = async (req, res, next) => {
  try {
    const offeringId = Number(req.params.pcId || req.body?.offering_id);
    const offering = await db.ProgramCourseOffering.findByPk(offeringId);
    if (!offering) return res.status(404).json({ error: 'Offering not found.' });
    if (!offering.approved_at) {
      return res.status(400).json({ error: 'Consultant sign-off is only available on Dean-approved learning plans.' });
    }

    const [signoff] = await db.ConsultantSignoff.findOrCreate({
      where: { offering_id: offeringId, consultant_user_id: req.user.user_id },
      defaults: { consultant_name: req.user.name, signed_at: new Date() },
    });

    return res.json({ ok: true, signoff });
  } catch (err) {
    return next(err);
  }
};

// Offering Start Revision & Carry-Over
exports.startRevision = async (req, res, next) => {
  try {
    const result = await cloneOfferingContent(req.params.pcId, {
      targetSchoolYear: req.body?.school_year,
      targetSemester: req.body?.semester,
      targetAcademicPeriodId: req.body?.academic_period_id,
      isCarryOver: false,
      actorUser: req.user,
      // New revisions start with an empty weekly content canvas so instructors choose whether to Import Previous
      copyWeeklyContent: req.body?.copyWeeklyContent === true,
    });
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
};

exports.carryOverOffering = async (req, res, next) => {
  try {
    const result = await cloneOfferingContent(req.params.pcId, {
      targetSchoolYear: req.body?.school_year,
      targetSemester: req.body?.semester,
      targetAcademicPeriodId: req.body?.academic_period_id,
      isCarryOver: true,
      actorUser: req.user,
      copyWeeklyContent: true,
    });
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
};

// Print-Ready Export Bundle
exports.getExportBundle = async (req, res, next) => {
  try {
    const pcId = Number(req.params.pcId || req.query.pcId);
    const offering = await db.ProgramCourseOffering.findByPk(pcId, {
      include: [
        { model: db.Course, as: 'course', include: [{ model: db.Prerequisite, as: 'prerequisites', include: [{ model: db.Course, as: 'prerequisiteCourse' }] }] },
        { model: db.Program, as: 'program' },
        { model: db.Department, as: 'department' },
        {
          model: db.CourseOutcome,
          as: 'courseOutcomes',
          include: [
            { model: db.ProgramOutcomeAlignment, as: 'poAlignments' },
            { model: db.IntendedLearningOutcome, as: 'ilos' },
            {
              model: db.Week,
              as: 'weeks',
              include: [
                { model: db.Subtopic, as: 'subtopics', include: [{ model: db.Topic, as: 'topic' }] },
                { model: db.TeachingAndLearningActivity, as: 'tlas', include: [{ model: db.TLAAssessment, as: 'assessments' }] },
                { model: db.WeeklyReference, as: 'weeklyReferences', include: [{ model: db.Reference, as: 'reference' }] },
              ],
            },
          ],
        },
      ],
    });
    if (!offering) return res.status(404).json({ error: 'Offering not found.' });

    const [assignment, universityStatement, deptStatement, formSettings, programOutcomes, signoffs] = await Promise.all([
      db.CourseOfferingAssignment.findOne({
        where: { pc_offering_id: pcId },
        include: [{ model: db.AssignmentWorkflowLog, as: 'logs' }],
        order: [['co_assign_id', 'DESC']],
      }),
      db.UniversityStatement.findOne({ where: { status: 'Active' }, order: [['university_statement_id', 'DESC']] }),
      db.DepartmentStatement.findOne({ where: { department_code: offering.department?.code || 'SCIS', status: 'Active' }, order: [['department_statement_id', 'DESC']] }),
      db.FormSetting.findAll(),
      db.ProgramOutcome.findAll({ where: { program_id: offering.program_id }, order: [['po_id', 'ASC']] }),
      db.ConsultantSignoff.findAll({ where: { offering_id: pcId } }),
    ]);

    const wf = computeWorkflowState(assignment?.logs || [], offering);
    return res.json({
      offering,
      assignment,
      workflow: wf,
      universityStatement,
      departmentStatement: deptStatement,
      formSettings,
      programOutcomes,
      consultantSignoffs: signoffs,
    });
  } catch (err) {
    return next(err);
  }
};
