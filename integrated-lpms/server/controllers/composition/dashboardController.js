'use strict';

const { Op } = require('sequelize');
const db = require('../../models');
const { computeWorkflowState } = require('../../utils/workflowRules');

const semRank = (s) => {
  const v = String(s || '').trim().toLowerCase();
  if (v.includes('sum') || v === '3') return 3;
  if (v.includes('2') || v.includes('second')) return 2;
  if (v.includes('1') || v.includes('first')) return 1;
  return 0;
};

const rankPeriod = (p) => {
  if (!p) return 0;
  const m = String(p.school_year || '').match(/(\d{4})/);
  const startY = m ? Number(m[1]) : 0;
  return startY * 1000 + semRank(p.semester);
};

async function getActiveAcademicPeriod() {
  const allPeriods = await db.AcademicPeriod.findAll({
    order: [['sort_order', 'DESC'], ['academic_period_id', 'DESC']],
  });
  if (allPeriods.length === 0) return null;
  const actives = allPeriods.filter((p) => p.status === 'Active' || p.is_active);
  if (actives.length > 0) {
    return actives.reduce((best, p) => (rankPeriod(p) > rankPeriod(best) ? p : best), actives[0]);
  }
  return allPeriods.reduce((best, p) => (rankPeriod(p) > rankPeriod(best) ? p : best), allPeriods[0]);
}

async function getDashboardSummary(req, res, next) {
  try {
    const currentTerm = await getActiveAcademicPeriod();
    const effectiveStakeholderId = req.query.stakeholder
      ? Number(req.query.stakeholder)
      : (req.user?.user_id || 1);

    // Fetch assignments owned by this instructor (or matching their faculty_id)
    const orFilter = [{ stakeholder_id: effectiveStakeholderId }];
    if (req.user?.facultyId) {
      orFilter.push({ faculty_id: req.user.facultyId });
    }

    const whereAssignment = {
      [Op.or]: orFilter,
      pc_offering_id: { [Op.ne]: null },
    };

    // Scope to active term unless showAll=true
    if (currentTerm && req.query.showAll !== 'true') {
      whereAssignment.academic_period_id = {
        [Op.or]: [currentTerm.academic_period_id, null],
      };
    }

    const rows = await db.CourseOfferingAssignment.findAll({
      where: whereAssignment,
      include: [
        {
          model: db.ProgramCourseOffering,
          as: 'ProgramCourseOffering',
          required: true,
          include: [
            { model: db.Course, as: 'Course', attributes: ['course_id', 'course_no', 'course_title', 'term', 'credit', 'contact_hrs', 'year_lvl'] },
            { model: db.Program, as: 'Program', attributes: ['program_id', 'name', 'code'] },
            { model: db.Department, as: 'Department', attributes: ['dept_id', 'name', 'code'] },
          ],
        },
        {
          model: db.AssignmentWorkflowLog,
          as: 'workflowLogs',
          attributes: ['log_id', 'stakeholder_id', 'actor_user_id', 'actor_name', 'actor_role', 'action_type', 'note', 'is_viewed', 'createdAt'],
        },
      ],
      order: [['date_assigned', 'DESC'], ['co_assign_id', 'DESC']],
    });

    // Filter out prior closed term offerings when currentTerm is active (unless showAll)
    const filtered = rows.filter((a) => {
      if (!currentTerm || req.query.showAll === 'true') return true;
      const off = a.ProgramCourseOffering;
      if (a.academic_period_id && Number(a.academic_period_id) !== Number(currentTerm.academic_period_id)) return false;
      if (off?.academic_period_id && Number(off.academic_period_id) !== Number(currentTerm.academic_period_id)) return false;
      return true;
    });

    // Deduplicate by pc_offering_id
    const seen = new Set();
    const unique = [];
    for (const a of filtered) {
      const pcoId = a.pc_offering_id;
      if (pcoId && !seen.has(pcoId)) {
        seen.add(pcoId);
        unique.push(a);
      }
    }

    const counts = { total: unique.length, draft: 0, pending: 0, returned: 0, approved: 0 };
    const formatted = unique.map((a) => {
      const data = a.toJSON();
      data.logs = data.workflowLogs || [];
      const wf = computeWorkflowState(data.logs, a.ProgramCourseOffering);
      data.overallStatus = wf.compositionStatus;
      data.workflowStage = wf.stage;
      data.libraryStatus = wf.libraryStatus;
      data.programHeadStatus = wf.programHeadStatus;
      data.deanStatus = wf.deanStatus;
      data.date_approved = wf.approvedAt;

      const lower = wf.compositionStatus.toLowerCase();
      if (counts[lower] !== undefined) counts[lower] += 1;
      return data;
    });

    return res.json({
      currentTerm,
      counts,
      assignments: formatted,
    });
  } catch (err) {
    return next(err);
  }
}

async function getAcademicPeriodsList(_req, res, next) {
  try {
    const periods = await db.AcademicPeriod.findAll({
      order: [['sort_order', 'DESC'], ['academic_period_id', 'DESC']],
    });
    return res.json(periods);
  } catch (err) {
    return next(err);
  }
}

async function getCurrentAcademicPeriod(_req, res, next) {
  try {
    const active = await getActiveAcademicPeriod();
    return res.json(active);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getDashboardSummary,
  getAcademicPeriodsList,
  listAcademicPeriods: getAcademicPeriodsList,
  getCurrentAcademicPeriod,
};
