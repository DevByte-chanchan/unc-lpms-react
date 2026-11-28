'use strict';

const { Op } = require('sequelize');
const db = require('../../models');
const { computeWorkflowState } = require('../../utils/workflowRules');
const {
  syncOfferingForAssignment,
  ensureAssignmentInitialLogAndNotify,
} = require('../../services/offeringSyncService');

/**
 * M1 Course Offering Assignments Controller
 * Wired directly to M2 Composition & M3 Submissions via offeringSyncService!
 */

exports.listAssignments = async (req, res, next) => {
  try {
    const where = {};
    if (req.query?.academic_period_id || req.query?.period_id) {
      where.academic_period_id = Number(req.query.academic_period_id || req.query.period_id);
    }
    if (req.query?.program_id) where.program_id = Number(req.query.program_id);
    if (req.query?.faculty_id) where.faculty_id = Number(req.query.faculty_id);
    if (req.query?.status) where.status = req.query.status;
    if (req.query?.search) {
      where[Op.or] = [
        { course_code: { [Op.like]: `%${req.query.search}%` } },
        { course_name: { [Op.like]: `%${req.query.search}%` } },
        { faculty_name: { [Op.like]: `%${req.query.search}%` } },
      ];
    }

    const rows = await db.CourseOfferingAssignment.findAll({
      where,
      include: [
        {
          model: db.ProgramCourseOffering,
          as: 'offering',
          include: [
            { model: db.Course, as: 'course', required: false },
            { model: db.Program, as: 'program', required: false },
            { model: db.Department, as: 'department', required: false },
          ],
          required: false,
        },
        { model: db.Faculty, as: 'leadFaculty', attributes: ['faculty_id', 'name', 'email', 'employment_type'], required: false },
        { model: db.AssignmentWorkflowLog, as: 'logs', required: false },
      ],
      order: [['co_assign_id', 'DESC']],
    });

    const formatted = rows.map((row) => {
      const json = row.toJSON();
      const wf = computeWorkflowState(row.logs || [], row.offering);
      json.workflowStage = wf.stage;
      json.overallStatus = wf.compositionStatus;
      json.libraryStatus = wf.libraryStatus;
      json.programHeadStatus = wf.programHeadStatus;
      json.deanStatus = wf.deanStatus;
      json.revision_number = row.offering?.revision_number || 1;
      json.course_code = json.course_code || row.offering?.course?.course_no || '';
      json.course_name = json.course_name || row.offering?.course?.course_title || '';
      json.faculty_name = json.faculty_name || row.leadFaculty?.name || '';
      return json;
    });

    return res.json(formatted);
  } catch (err) {
    return next(err);
  }
};

exports.createAssignment = async (req, res, next) => {
  try {
    const courseId = req.body?.course_id ? Number(req.body.course_id) : null;
    const courseCode = req.body?.course_code || req.body?.course_no || null;
    const programId = req.body?.program_id ? Number(req.body.program_id) : 1;
    const facultyId = req.body?.faculty_id ? Number(req.body.faculty_id) : null;
    let facultyName = req.body?.faculty_name ? String(req.body.faculty_name).trim() : null;
    const academicPeriodId = req.body?.academic_period_id || req.body?.period_id || null;

    if (!courseId && !courseCode) {
      return res.status(400).json({ error: 'course_id or course_code is required.' });
    }

    if (facultyId && !facultyName) {
      const fac = await db.Faculty.findByPk(facultyId);
      if (fac) facultyName = fac.name;
    }

    const result = await db.sequelize.transaction(async (t) => {
      const synced = await syncOfferingForAssignment({
        courseId,
        courseCode,
        programId,
        academicPeriodId,
        facultyId,
        facultyName,
        actorUser: req.user,
      }, t);

      if (!synced.offering || !synced.course) {
        const err = new Error('Could not resolve Course for assignment.');
        err.status = 404;
        throw err;
      }

      const assignment = await db.CourseOfferingAssignment.create({
        pc_offering_id: synced.offering.pc_offering_id,
        course_id: synced.course.course_id,
        program_id: synced.program?.program_id || programId,
        academic_period_id: synced.period?.academic_period_id || academicPeriodId,
        course_code: synced.course.course_no,
        course_name: synced.course.course_title,
        year_level: req.body?.year_level || synced.course.year_lvl || 'THIRD YEAR',
        stakeholder_id: synced.stakeholderId || (req.body?.stakeholder_id ? Number(req.body.stakeholder_id) : null),
        faculty_id: facultyId,
        faculty_name: facultyName,
        contributors: Array.isArray(req.body?.contributors) ? req.body.contributors : [],
        sections: Array.isArray(req.body?.sections) ? req.body.sections : [],
        status: req.body?.status || 'Active',
        date_assigned: new Date(),
      }, { transaction: t });

      await ensureAssignmentInitialLogAndNotify(assignment, synced.offering, synced.course, req.user, t);

      await db.CourseAssignmentHistory.create({
        academic_period_id: synced.period?.academic_period_id || 2,
        program_id: synced.program?.program_id || 1,
        course_code: synced.course.course_no,
        course_name: synced.course.course_title,
        action: 'assigned',
        lead_before: null,
        lead_after: { faculty_id: facultyId, faculty_name: facultyName, stakeholder_id: assignment.stakeholder_id },
        contributors_before: [],
        contributors_after: assignment.contributors || [],
        source: 'manual',
        changed_by_account_id: req.user?.user_id || null,
      }, { transaction: t });

      return { assignment, offering: synced.offering, course: synced.course };
    });

    return res.status(201).json({
      ...result.assignment.toJSON(),
      offering: result.offering.toJSON(),
      course: result.course.toJSON(),
    });
  } catch (err) {
    return next(err);
  }
};

exports.updateAssignment = async (req, res, next) => {
  try {
    const assignment = await db.CourseOfferingAssignment.findByPk(Number(req.params.id));
    if (!assignment) return res.status(404).json({ error: 'Course assignment not found.' });

    const beforeLead = {
      faculty_id: assignment.faculty_id,
      faculty_name: assignment.faculty_name,
      stakeholder_id: assignment.stakeholder_id,
    };
    const beforeContribs = assignment.contributors || [];

    const updates = {};
    if (req.body?.faculty_id !== undefined) updates.faculty_id = req.body.faculty_id ? Number(req.body.faculty_id) : null;
    if (req.body?.faculty_name !== undefined) updates.faculty_name = req.body.faculty_name;
    if (req.body?.contributors !== undefined) updates.contributors = Array.isArray(req.body.contributors) ? req.body.contributors : [];
    if (req.body?.sections !== undefined) updates.sections = Array.isArray(req.body.sections) ? req.body.sections : [];
    if (req.body?.status !== undefined) updates.status = req.body.status;
    if (req.body?.year_level !== undefined) updates.year_level = req.body.year_level;

    if (updates.faculty_id) {
      const fac = await db.Faculty.findByPk(updates.faculty_id);
      if (fac) {
        updates.faculty_name = updates.faculty_name || fac.name;
        const u = fac.email ? await db.User.findOne({ where: { email: fac.email } }) : null;
        if (u) updates.stakeholder_id = u.user_id;
      }
    }

    updates.date_updated = new Date();
    await assignment.update(updates);

    await db.CourseAssignmentHistory.create({
      academic_period_id: assignment.academic_period_id || 2,
      program_id: assignment.program_id || 1,
      course_code: assignment.course_code || '',
      course_name: assignment.course_name || '',
      action: 'updated',
      lead_before: beforeLead,
      lead_after: { faculty_id: assignment.faculty_id, faculty_name: assignment.faculty_name, stakeholder_id: assignment.stakeholder_id },
      contributors_before: beforeContribs,
      contributors_after: assignment.contributors || [],
      source: 'manual',
      changed_by_account_id: req.user?.user_id || null,
    });

    return res.json(assignment);
  } catch (err) {
    return next(err);
  }
};

exports.deleteAssignment = async (req, res, next) => {
  try {
    const assignment = await db.CourseOfferingAssignment.findByPk(Number(req.params.id));
    if (!assignment) return res.status(404).json({ error: 'Course assignment not found.' });
    await assignment.destroy();
    return res.json({ ok: true, id: assignment.co_assign_id });
  } catch (err) {
    return next(err);
  }
};

exports.getFacultyLoad = async (req, res, next) => {
  try {
    const where = {};
    if (req.query?.academic_period_id) where.academic_period_id = Number(req.query.academic_period_id);
    const rows = await db.CourseOfferingAssignment.findAll({ where });

    const loadMap = new Map();
    for (const r of rows) {
      const key = r.faculty_name || 'Unassigned';
      if (!loadMap.has(key)) {
        loadMap.set(key, { faculty_id: r.faculty_id, faculty_name: key, leadCount: 0, contributorCount: 0, courses: [] });
      }
      const entry = loadMap.get(key);
      entry.leadCount += 1;
      entry.courses.push({ course_code: r.course_code, course_name: r.course_name, role: 'Lead' });

      for (const c of (r.contributors || [])) {
        const cName = typeof c === 'string' ? c : c?.name;
        if (!cName) continue;
        if (!loadMap.has(cName)) {
          loadMap.set(cName, { faculty_id: null, faculty_name: cName, leadCount: 0, contributorCount: 0, courses: [] });
        }
        const cEntry = loadMap.get(cName);
        cEntry.contributorCount += 1;
        cEntry.courses.push({ course_code: r.course_code, course_name: r.course_name, role: 'Contributor' });
      }
    }

    return res.json([...loadMap.values()]);
  } catch (err) {
    return next(err);
  }
};

exports.getHistory = async (req, res, next) => {
  try {
    const where = {};
    if (req.query?.academic_period_id) where.academic_period_id = Number(req.query.academic_period_id);
    if (req.query?.course_code) where.course_code = req.query.course_code;
    const rows = await db.CourseAssignmentHistory.findAll({
      where,
      order: [['course_assignment_history_id', 'DESC']],
      limit: 100,
    });
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
};
