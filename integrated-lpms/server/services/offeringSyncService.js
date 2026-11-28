'use strict';

const { Op } = require('sequelize');
const db = require('../models');
const { createNotification } = require('./notifyService');

/**
 * Cross-Module Sync Service (M1 Course Assignment -> M2 Composition & M3 Submissions)
 *
 * Guarantees that whenever a Program Head assigns a course offering in M1:
 *  1. A matching ProgramCourseOffering exists for (course_id, program_id, academic_period_id)
 *  2. If no CourseOutcomes/Weeks exist on the offering yet:
 *     - Clones COAEP COs/PO Alignments/ILOs/Weeks from the most recent approved offering of the same course+program (if any), OR
 *     - Scaffolds clean default CO1..CO4 + 16 Weeks (4 weeks/CO, 5.00 hrs each) so Composition renders immediately without 404s.
 *  3. Resolves Lead Faculty -> Users.user_id (`stakeholder_id`) so the Instructor immediately sees it on their Composition Dashboard.
 *  4. Appends an `ASSIGNED` workflow log if none exists for that assignment yet.
 */

async function resolveInstructorUserId({ facultyId, facultyName, email }, transaction = null) {
  const txOpt = transaction ? { transaction } : {};

  if (facultyId) {
    const userByFac = await db.User.findOne({ where: { faculty_id: Number(facultyId) }, ...txOpt });
    if (userByFac) return userByFac.user_id;

    const fac = await db.Faculty.findByPk(Number(facultyId), txOpt);
    if (fac?.email) {
      const userByEmail = await db.User.findOne({ where: { email: fac.email.toLowerCase().trim() }, ...txOpt });
      if (userByEmail) return userByEmail.user_id;
    }
    if (fac?.name) {
      const userByName = await db.User.findOne({ where: { name: fac.name.trim() }, ...txOpt });
      if (userByName) return userByName.user_id;
    }
  }

  if (email) {
    const userByEmail = await db.User.findOne({ where: { email: String(email).toLowerCase().trim() }, ...txOpt });
    if (userByEmail) return userByEmail.user_id;
  }

  if (facultyName) {
    const userByName = await db.User.findOne({ where: { name: String(facultyName).trim() }, ...txOpt });
    if (userByName) return userByName.user_id;
  }

  return null;
}

async function ensureOfferingScaffold(offering, transaction = null) {
  const txOpt = transaction ? { transaction } : {};
  const existingCos = await db.CourseOutcome.findAll({
    where: { pc_offering_id: offering.pc_offering_id },
    order: [['co_id', 'ASC']],
    ...txOpt,
  });

  if (existingCos.length > 0) {
    // Ensure every CO has at least 4 Weeks
    for (const co of existingCos) {
      const wCount = await db.Week.count({ where: { co_id: co.co_id }, ...txOpt });
      if (wCount === 0) {
        await db.Week.bulkCreate(
          [1, 2, 3, 4].map(() => ({ co_id: co.co_id, hours: 5.0 })),
          txOpt
        );
      }
    }
    return;
  }

  // Check if there is a prior offering for the same (course_id, program_id) to inherit COAEP COs/PO Alignments/ILOs
  const prior = await db.ProgramCourseOffering.findOne({
    where: {
      course_id: offering.course_id,
      program_id: offering.program_id,
      pc_offering_id: { [Op.ne]: offering.pc_offering_id },
    },
    order: [['approved_at', 'DESC'], ['pc_offering_id', 'DESC']],
    ...txOpt,
  });

  if (prior) {
    const priorCos = await db.CourseOutcome.findAll({
      where: { pc_offering_id: prior.pc_offering_id },
      order: [['co_id', 'ASC']],
      ...txOpt,
    });

    if (priorCos.length > 0) {
      for (const pCo of priorCos) {
        const newCo = await db.CourseOutcome.create(
          { pc_offering_id: offering.pc_offering_id, co_description: pCo.co_description },
          txOpt
        );

        const pAligns = await db.ProgramOutcomeAlignment.findAll({ where: { co_id: pCo.co_id }, ...txOpt });
        if (pAligns.length > 0) {
          await db.ProgramOutcomeAlignment.bulkCreate(
            pAligns.map((a) => ({
              co_id: newCo.co_id,
              po_id: a.po_id,
              attainment_level: a.attainment_level,
            })),
            txOpt
          );
        }

        const pIlos = await db.IntendedLearningOutcome.findAll({
          where: { co_id: pCo.co_id },
          order: [['ilo_id', 'ASC']],
          ...txOpt,
        });
        if (pIlos.length > 0) {
          await db.IntendedLearningOutcome.bulkCreate(
            pIlos.map((ilo) => ({
              co_id: newCo.co_id,
              description: ilo.description,
              hours: ilo.hours,
              weeks: ilo.weeks,
              assessment_tool: ilo.assessment_tool,
              is_orientation: ilo.is_orientation,
              prelim_weight: ilo.prelim_weight,
              midterm_weight: ilo.midterm_weight,
              semi_weight: ilo.semi_weight,
              final_weight: ilo.final_weight,
              target: ilo.target,
              ied_level: ilo.ied_level,
              target_students_percent: ilo.target_students_percent,
              target_score_percent: ilo.target_score_percent,
            })),
            txOpt
          );
        }

        await db.Week.bulkCreate(
          [1, 2, 3, 4].map(() => ({ co_id: newCo.co_id, hours: 5.0 })),
          txOpt
        );
      }
      return;
    }
  }

  // Fresh course without prior COAEP: scaffold 4 default COs + orientation ILO + 1 default ILO per CO + 16 blank Weeks
  // (Weekly content — Topics, Subtopics, TLAs, WeeklyReferences — stays 100% empty.)
  const defaultCOs = [
    {
      co: 'CO1: Explain foundational concepts, principles, and frameworks of the course.',
      ilo: 'Explain the core foundational concepts, terminology, and principles of the course.',
      weights: { prelim_weight: 25, midterm_weight: 0, semi_weight: 0, final_weight: 0 },
      ied: 'I',
    },
    {
      co: 'CO2: Design structured solutions applying appropriate methodologies and standards.',
      ilo: 'Design structured solutions applying appropriate methodologies and technical standards.',
      weights: { prelim_weight: 0, midterm_weight: 25, semi_weight: 0, final_weight: 0 },
      ied: 'E',
    },
    {
      co: 'CO3: Develop and implement functional outputs demonstrating core competencies.',
      ilo: 'Develop and implement functional course outputs demonstrating core competencies.',
      weights: { prelim_weight: 0, midterm_weight: 0, semi_weight: 25, final_weight: 0 },
      ied: 'E',
    },
    {
      co: 'CO4: Evaluate and defend course deliverables against quality and industry benchmarks.',
      ilo: 'Evaluate and defend course deliverables against quality and industry benchmarks.',
      weights: { prelim_weight: 0, midterm_weight: 0, semi_weight: 0, final_weight: 25 },
      ied: 'D',
    },
  ];
  for (let i = 0; i < defaultCOs.length; i++) {
    const newCo = await db.CourseOutcome.create(
      { pc_offering_id: offering.pc_offering_id, co_description: defaultCOs[i].co },
      txOpt
    );
    if (i === 0) {
      await db.IntendedLearningOutcome.create({
        co_id: newCo.co_id,
        description: "Cite the value and relevance of the University's and the College's VMO as related to the course",
        is_orientation: true,
        prelim_weight: 0,
        midterm_weight: 0,
        semi_weight: 0,
        final_weight: 0,
        target: '60',
        ied_level: 'I',
        hours: 2,
        weeks: 0.4,
      }, txOpt);
    }
    await db.IntendedLearningOutcome.create({
      co_id: newCo.co_id,
      description: defaultCOs[i].ilo,
      is_orientation: false,
      assessment_tool: 'Written / Practical Assessment',
      ...defaultCOs[i].weights,
      target: '60',
      ied_level: defaultCOs[i].ied,
      hours: 20,
      weeks: 4,
    }, txOpt);
    await db.Week.bulkCreate(
      [1, 2, 3, 4].map(() => ({ co_id: newCo.co_id, hours: 5.0 })),
      txOpt
    );
  }
}

async function syncOfferingForAssignment({
  courseId,
  courseCode,
  programId,
  academicPeriodId,
  facultyId,
  facultyName,
  actorUser = null,
}, transaction = null) {
  const txOpt = transaction ? { transaction } : {};

  // 1. Resolve Course
  let course = courseId ? await db.Course.findByPk(Number(courseId), txOpt) : null;
  if (!course && courseCode) {
    course = await db.Course.findOne({
      where: { course_no: String(courseCode).trim() },
      order: [['course_id', 'ASC']],
      ...txOpt,
    });
  }
  if (!course) return { offering: null, stakeholderId: null };

  // 2. Resolve Program & Department
  let program = programId ? await db.Program.findByPk(Number(programId), txOpt) : null;
  if (!program) {
    program = await db.Program.findOne({ order: [['program_id', 'ASC']], ...txOpt });
  }
  const deptId = program?.dept_id || 3;

  // 3. Resolve Academic Period
  let period = academicPeriodId ? await db.AcademicPeriod.findByPk(Number(academicPeriodId), txOpt) : null;
  if (!period) {
    period = await db.AcademicPeriod.findOne({ where: { is_active: true }, ...txOpt })
      || await db.AcademicPeriod.findOne({ order: [['academic_period_id', 'DESC']], ...txOpt });
  }

  // 4. Find or create ProgramCourseOffering for (course, program, period)
  let offering = await db.ProgramCourseOffering.findOne({
    where: {
      course_id: course.course_id,
      program_id: program.program_id,
      ...(period ? { academic_period_id: period.academic_period_id } : {}),
    },
    order: [['pc_offering_id', 'DESC']],
    ...txOpt,
  });

  if (!offering) {
    const priorApproved = await db.ProgramCourseOffering.findOne({
      where: {
        course_id: course.course_id,
        program_id: program.program_id,
        approved_at: { [Op.ne]: null },
      },
      order: [['revision_number', 'DESC'], ['pc_offering_id', 'DESC']],
      ...txOpt,
    });

    offering = await db.ProgramCourseOffering.create({
      course_id: course.course_id,
      program_id: program.program_id,
      dept_id: deptId,
      academic_period_id: period?.academic_period_id || null,
      school_year: period?.school_year || '2026-2027',
      semester: period?.semester || '1st Semester',
      revision_number: priorApproved ? priorApproved.revision_number : 1,
      base_pc_offering_id: priorApproved ? priorApproved.pc_offering_id : null,
      has_modifications: false,
      is_revision_incremented: false,
      approved_at: null,
      course_description: priorApproved?.course_description || `Course learning plan for ${course.course_no} — ${course.course_title}.`,
    }, txOpt);
  }

  await ensureOfferingScaffold(offering, transaction);

  const stakeholderId = await resolveInstructorUserId({ facultyId, facultyName }, transaction);

  return {
    offering,
    course,
    program,
    period,
    stakeholderId,
  };
}

async function ensureAssignmentInitialLogAndNotify(assignment, offering, course, actorUser = null, transaction = null) {
  const txOpt = transaction ? { transaction } : {};
  const existingLog = await db.AssignmentWorkflowLog.findOne({
    where: { co_assign_id: assignment.co_assign_id, action_type: 'ASSIGNED' },
    ...txOpt,
  });

  if (!existingLog) {
    await db.AssignmentWorkflowLog.create({
      co_assign_id: assignment.co_assign_id,
      stakeholder_id: actorUser ? String(actorUser.user_id) : '2',
      actor_user_id: actorUser?.user_id || 2,
      actor_name: actorUser?.name || 'Program Head',
      actor_role: 'PROGRAM_HEAD',
      action_type: 'ASSIGNED',
      note: `Assigned ${course?.course_no || assignment.course_code || ''} to ${assignment.faculty_name || 'Instructor'}`,
      is_viewed: false,
    }, txOpt);
  }

  if (assignment.stakeholder_id && offering) {
    await createNotification({
      recipientUserId: assignment.stakeholder_id,
      academicPeriodId: assignment.academic_period_id || offering.academic_period_id,
      type: 'assignment',
      title: `Course Assigned: ${course?.course_no || assignment.course_code || ''}`,
      message: `You have been assigned to compose the learning plan for ${course?.course_no || assignment.course_code} — ${course?.course_title || assignment.course_name || ''}.`,
      link: `/composition/course/${offering.pc_offering_id}/${offering.revision_number || 1}/course-details`,
      offeringId: offering.pc_offering_id,
      actorRole: 'PROGRAM_HEAD',
      sentByAccountId: actorUser?.user_id || null,
    }, transaction);
  }
}

module.exports = {
  resolveInstructorUserId,
  ensureOfferingScaffold,
  syncOfferingForAssignment,
  ensureAssignmentInitialLogAndNotify,
};
