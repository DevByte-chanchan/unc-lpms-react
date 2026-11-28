'use strict';

const db = require('../models');

/**
 * MySQL-8-safe Offering Revision & Carry-Over Service (M3 Submissions + M2 Copy-on-Write)
 * Replaces SQLite `BEGIN IMMEDIATE` and raw SQL cloning with Sequelize MySQL 8 transactions.
 */

async function cloneOfferingContent(sourceOfferingId, {
  targetSchoolYear,
  targetSemester,
  targetAcademicPeriodId = null,
  isCarryOver = false,
  actorUser = null,
  copyWeeklyContent = true,
}) {
  return db.sequelize.transaction(async (t) => {
    const source = await db.ProgramCourseOffering.findByPk(Number(sourceOfferingId), { transaction: t });
    if (!source) {
      const err = new Error('Source offering not found');
      err.status = 404;
      throw err;
    }

    const newOffering = await db.ProgramCourseOffering.create({
      course_id: source.course_id,
      program_id: source.program_id,
      dept_id: source.dept_id,
      academic_period_id: targetAcademicPeriodId || source.academic_period_id,
      school_year: targetSchoolYear || source.school_year,
      semester: targetSemester || source.semester,
      revision_number: source.revision_number, // Deferred increment on Dean approval if modified!
      base_pc_offering_id: source.pc_offering_id,
      carried_from_offering_id: isCarryOver ? source.pc_offering_id : null,
      has_modifications: false,
      is_revision_incremented: false,
      approved_at: isCarryOver ? new Date() : null,
      course_description: source.course_description,
    }, { transaction: t });

    // Clone CourseOutcomes, PO Alignments, ILOs, Weeks, Topics, Subtopics, TLAs, Assessments, WeeklyReferences
    const srcCos = await db.CourseOutcome.findAll({
      where: { pc_offering_id: source.pc_offering_id },
      order: [['co_id', 'ASC']],
      transaction: t,
    });

    const iloIdMap = new Map();
    const weekIdMap = new Map();

    for (const sCo of srcCos) {
      const newCo = await db.CourseOutcome.create({
        pc_offering_id: newOffering.pc_offering_id,
        co_description: sCo.co_description,
      }, { transaction: t });

      const sAligns = await db.ProgramOutcomeAlignment.findAll({ where: { co_id: sCo.co_id }, transaction: t });
      if (sAligns.length) {
        await db.ProgramOutcomeAlignment.bulkCreate(
          sAligns.map((a) => ({ co_id: newCo.co_id, po_id: a.po_id, attainment_level: a.attainment_level })),
          { transaction: t }
        );
      }

      const sIlos = await db.IntendedLearningOutcome.findAll({
        where: { co_id: sCo.co_id },
        order: [['ilo_id', 'ASC']],
        transaction: t,
      });
      for (const sIlo of sIlos) {
        const nIlo = await db.IntendedLearningOutcome.create({
          co_id: newCo.co_id,
          description: sIlo.description,
          hours: sIlo.hours,
          weeks: sIlo.weeks,
          assessment_tool: sIlo.assessment_tool,
          is_orientation: sIlo.is_orientation,
          prelim_weight: sIlo.prelim_weight,
          midterm_weight: sIlo.midterm_weight,
          semi_weight: sIlo.semi_weight,
          final_weight: sIlo.final_weight,
          target: sIlo.target,
          ied_level: sIlo.ied_level,
          target_students_percent: sIlo.target_students_percent,
          target_score_percent: sIlo.target_score_percent,
        }, { transaction: t });
        iloIdMap.set(sIlo.ilo_id, nIlo.ilo_id);
      }

      const sWeeks = await db.Week.findAll({
        where: { co_id: sCo.co_id },
        order: [['week_id', 'ASC']],
        transaction: t,
      });
      for (const sW of sWeeks) {
        const nW = await db.Week.create({ co_id: newCo.co_id, hours: sW.hours }, { transaction: t });
        weekIdMap.set(sW.week_id, nW.week_id);
      }
    }

    if (copyWeeklyContent) {
      const topicCloneCache = new Map();
      for (const [oldWeekId, newWeekId] of weekIdMap.entries()) {
        // Weekly References
        const sWRefs = await db.WeeklyReference.findAll({ where: { week_id: oldWeekId }, transaction: t });
        if (sWRefs.length) {
          await db.WeeklyReference.bulkCreate(
            sWRefs.map((wr) => ({
              week_id: newWeekId,
              reference_id: wr.reference_id,
              is_orientation: wr.is_orientation,
            })),
            { transaction: t }
          );
        }

        // Subtopics + CoW Topics
        const sSubs = await db.Subtopic.findAll({
          where: { week_id: oldWeekId },
          include: [{ model: db.Topic, as: 'topic' }],
          order: [['sequence_order', 'ASC'], ['subtopic_id', 'ASC']],
          transaction: t,
        });
        for (const sub of sSubs) {
          let newTopicId = topicCloneCache.get(sub.topic_id);
          if (!newTopicId && sub.topic) {
            const newTopic = await db.Topic.create({
              title: sub.topic.title,
              course_id: sub.topic.course_id,
              parent_topic_id: sub.topic.topic_id,
            }, { transaction: t });
            newTopicId = newTopic.topic_id;
            topicCloneCache.set(sub.topic_id, newTopicId);
          }
          await db.Subtopic.create({
            week_id: newWeekId,
            topic_id: newTopicId || sub.topic_id,
            title: sub.title,
            sequence_order: sub.sequence_order,
            is_orientation: sub.is_orientation,
            parent_subtopic_id: sub.subtopic_id,
            estimated_minutes: sub.estimated_minutes,
          }, { transaction: t });
        }

        // TLAs & Assessments
        const sTlas = await db.TeachingAndLearningActivity.findAll({
          where: { week_id: oldWeekId },
          include: [{ model: db.TLAAssessment, as: 'assessments' }],
          order: [['tla_id', 'ASC']],
          transaction: t,
        });
        for (const tla of sTlas) {
          const nTla = await db.TeachingAndLearningActivity.create({
            week_id: newWeekId,
            tla_name: tla.tla_name,
            description: tla.description,
            performed_by: tla.performed_by,
            class_phase: tla.class_phase,
            is_lab: tla.is_lab,
            is_orientation: tla.is_orientation,
          }, { transaction: t });

          if (Array.isArray(tla.assessments) && tla.assessments.length > 0) {
            await db.TLAAssessment.bulkCreate(
              tla.assessments.map((a) => ({
                tla_id: nTla.tla_id,
                ilo_id: a.ilo_id ? (iloIdMap.get(a.ilo_id) || null) : null,
                name: a.name,
                description: a.description,
                period: a.period,
                weight: a.weight,
                min_passing: a.min_passing,
              })),
              { transaction: t }
            );
          }
        }
      }
    }

    // Clone CourseOfferingAssignment metadata
    const srcAssign = await db.CourseOfferingAssignment.findOne({
      where: { pc_offering_id: source.pc_offering_id },
      order: [['co_assign_id', 'DESC']],
      transaction: t,
    });
    const newAssign = await db.CourseOfferingAssignment.create({
      pc_offering_id: newOffering.pc_offering_id,
      course_id: source.course_id,
      program_id: source.program_id,
      academic_period_id: newOffering.academic_period_id,
      course_code: srcAssign?.course_code || null,
      course_name: srcAssign?.course_name || null,
      year_level: srcAssign?.year_level || null,
      stakeholder_id: srcAssign?.stakeholder_id || null,
      faculty_id: srcAssign?.faculty_id || null,
      faculty_name: srcAssign?.faculty_name || null,
      contributors: srcAssign?.contributors || [],
      sections: srcAssign?.sections || [],
      status: 'Active',
      date_assigned: new Date(),
    }, { transaction: t });

    await db.AssignmentWorkflowLog.create({
      co_assign_id: newAssign.co_assign_id,
      stakeholder_id: actorUser ? String(actorUser.user_id) : '2',
      actor_user_id: actorUser?.user_id || null,
      actor_name: actorUser?.name || 'System',
      actor_role: actorUser?.workflowRole || 'PROGRAM_HEAD',
      action_type: isCarryOver ? 'ACCEPTED' : 'ASSIGNED',
      note: isCarryOver
        ? `Carried over from approved offering #${source.pc_offering_id}`
        : `Revision started from offering #${source.pc_offering_id}`,
      is_viewed: false,
    }, { transaction: t });

    return { offering: newOffering, assignment: newAssign };
  });
}

module.exports = {
  cloneOfferingContent,
};
