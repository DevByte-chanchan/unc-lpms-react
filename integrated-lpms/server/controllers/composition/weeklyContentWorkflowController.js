'use strict';

const { Op } = require('sequelize');
const db = require('../../models');
const {
  findOfferingByPcIdAndRev,
  resolveWeekLineageContext,
  markOfferingModified,
} = require('../../utils/versionHelper');
const { computeWorkflowState } = require('../../utils/workflowRules');

const LAB_PHASES = ['Pre-class', 'In-class', 'Post-class'];
const NON_LAB_PHASES = ['Asynchronous', 'Synchronous'];

function computeCourseScheduleMeta(course = {}) {
  let lecCredits = 0;
  let labCredits = 0;
  if (course && course.credit) {
    const lecMatch = String(course.credit).match(/(\d+(?:\.\d+)?)\s*LEC/i);
    const labMatch = String(course.credit).match(/(\d+(?:\.\d+)?)\s*LAB/i);
    if (lecMatch) lecCredits = parseFloat(lecMatch[1]);
    if (labMatch) labCredits = parseFloat(labMatch[1]);
  }
  if (lecCredits === 0 && labCredits === 0) {
    lecCredits = 2;
    labCredits = 1;
  }

  let lecContactHours = lecCredits * 1;
  let labContactHours = labCredits * 3;
  if (course && course.contact_hrs) {
    const lecHrsMatch = String(course.contact_hrs).match(/(\d+(?:\.\d+)?)\s*Hrs?\s*Lec/i);
    const labHrsMatch = String(course.contact_hrs).match(/(\d+(?:\.\d+)?)\s*Hrs?\s*Lab/i);
    if (lecHrsMatch) lecContactHours = parseFloat(lecHrsMatch[1]);
    if (labHrsMatch) labContactHours = parseFloat(labHrsMatch[1]);
  }

  const totalWeeklyHours = (lecContactHours + labContactHours) || 5;
  const orientationHours = (lecContactHours > 0 && lecContactHours < totalWeeklyHours)
    ? lecContactHours
    : Math.min(2, Math.max(1, totalWeeklyHours - 1));

  // Match TopicForm.jsx courseHasLab detection exactly
  const combined = `${course?.credit || ''} ${course?.contact_hrs || ''}`.trim();
  let courseHasLab = true;
  if (combined) {
    if (!/\blab\b/i.test(combined)) {
      courseHasLab = false;
    } else {
      const numericLabMatches = [...combined.matchAll(/(\d+(?:\.\d+)?)\s*(?:hrs?\s*)?lab\b/gi)];
      if (numericLabMatches.length > 0) {
        courseHasLab = numericLabMatches.some((m) => parseFloat(m[1]) > 0);
      }
    }
  }

  return {
    totalWeeklyHours,
    orientationHours,
    courseHasLab,
    allowedPhases: courseHasLab ? LAB_PHASES : NON_LAB_PHASES,
  };
}

function normalizeClassPhase(val) {
  if (!val) return '';
  const v = String(val).toLowerCase();
  if (v.includes('pre')) return 'Pre-class';
  if (v.includes('in')) return 'In-class';
  if (v.includes('post')) return 'Post-class';
  if (v.includes('async')) return 'Asynchronous';
  if (v.includes('sync')) return 'Synchronous';
  return String(val).trim();
}

function isTextbookReference(ref) {
  const raw = String(ref?.type || ref?.Type || ref?.typeKey || '').toLowerCase();
  return raw.includes('textbook');
}

function validateSlice({ subtopics, tlas, assessmentsByTlaId, weeklyRefs, budgetHours, allowedPhases, courseHasLab }) {
  const topicIssues = [];
  const tlaIssues = [];
  const refIssues = [];

  // 1. Topics & weekly time budget validation (matches TopicSubForm in TopicForm.jsx)
  const topicsMap = new Map();
  for (const sub of subtopics) {
    const tid = Number(sub.topic_id || 0);
    const topicTitle = String(sub.topic?.title || '').trim();
    if (!topicsMap.has(tid)) {
      topicsMap.set(tid, { topic_id: tid, title: topicTitle, subtopics: [] });
    }
    topicsMap.get(tid).subtopics.push(sub);
  }
  const groupedTopics = Array.from(topicsMap.values());

  let usedMinutes = 0;
  if (groupedTopics.length === 0) {
    topicIssues.push('Add at least 1 topic with at least 1 subtopic.');
  } else {
    groupedTopics.forEach((topic, tIdx) => {
      const label = `Topic #${tIdx + 1}${topic.title ? ` (${topic.title})` : ''}`;
      if (!topic.title) {
        topicIssues.push(`Topic #${tIdx + 1}: Topic title cannot be empty.`);
      }
      if (!topic.subtopics || topic.subtopics.length === 0) {
        topicIssues.push(`${label}: Add at least 1 subtopic.`);
      } else {
        let emptyTitleCount = 0;
        let missingMinsCount = 0;
        topic.subtopics.forEach((sub) => {
          if (!String(sub.title || '').trim()) emptyTitleCount += 1;
          const minsNum = Number(sub.estimated_minutes);
          if (Number.isFinite(minsNum) && minsNum > 0) {
            usedMinutes += Math.round(minsNum);
          } else {
            missingMinsCount += 1;
          }
        });
        if (emptyTitleCount > 0) {
          topicIssues.push(`${label}: ${emptyTitleCount} empty subtopic title(s).`);
        }
        if (missingMinsCount > 0) {
          topicIssues.push(`${label}: Allocate minutes (> 0) for ${missingMinsCount} subtopic(s).`);
        }
      }
    });
  }

  const budgetMinutes = Math.max(1, Math.round((Number(budgetHours) || 5) * 60));
  if (usedMinutes !== budgetMinutes) {
    const diff = usedMinutes - budgetMinutes;
    if (usedMinutes <= 0) {
      topicIssues.push(`Allocate instructional minutes to match weekly budget (0 / ${budgetMinutes} mins).`);
    } else if (diff < 0) {
      topicIssues.push(`Under weekly budget by ${Math.abs(diff)} mins (${usedMinutes} / ${budgetMinutes} mins).`);
    } else {
      topicIssues.push(`Exceeds weekly budget by ${diff} mins (${usedMinutes} / ${budgetMinutes} mins).`);
    }
  }

  // 2. TLAs & Assessments validation (matches TLAForm.jsx)
  const coveredPhases = new Set();
  let assignedAssessmentCount = 0;

  if (!tlas || tlas.length === 0) {
    tlaIssues.push(
      courseHasLab
        ? 'Add at least 1 valid TLA for each phase: Pre-class, In-class, and Post-class.'
        : 'Add at least 1 valid TLA for each phase: Asynchronous and Synchronous.'
    );
  } else {
    tlas.forEach((tla, idx) => {
      const tlaName = String(tla.tla_name || '').trim();
      const tlaDesc = String(tla.description || '').trim();
      const performedBy = String(tla.performed_by || '').trim();
      const phase = normalizeClassPhase(tla.class_phase);
      const labelPrefix = `TLA #${idx + 1}${tlaName ? ` (${tlaName})` : ''}`;

      const assList = assessmentsByTlaId.get(Number(tla.tla_id)) || [];
      const firstAss = assList[0] || null;
      const assName = String(firstAss?.name || '').trim();
      const assDetail = String(firstAss?.description || '').trim();

      const missing = [];
      if (!performedBy) missing.push('Performed By');
      if (!phase) {
        missing.push('Class Phase');
      } else if (!allowedPhases.includes(phase)) {
        missing.push(`Valid Class Phase (${allowedPhases.join(' / ')})`);
      }
      if (!tlaName) missing.push('TLA Name');
      if (!tlaDesc) missing.push('Description');

      if (assName) {
        assignedAssessmentCount += 1;
      } else if (assDetail) {
        missing.push('Assessment Name (required when Detail is provided)');
      }

      if (missing.length > 0) {
        tlaIssues.push(`${labelPrefix}: Missing ${missing.join(', ')}.`);
      } else {
        coveredPhases.add(phase);
      }
    });

    const missingPhases = allowedPhases.filter((p) => !coveredPhases.has(p));
    if (missingPhases.length > 0) {
      tlaIssues.push(`Missing valid TLA for phase(s): ${missingPhases.join(', ')}.`);
    }
  }

  if (assignedAssessmentCount < 1) {
    tlaIssues.push('Assign at least 1 assessment across your TLAs.');
  }

  // 3. References validation (matches ReferenceForm.jsx)
  const refs = (weeklyRefs || []).map((wr) => wr.reference || wr.Reference).filter(Boolean);
  const textbookCount = refs.filter(isTextbookReference).length;
  if (textbookCount < 1) {
    refIssues.push('Select at least 1 Textbook reference (OER and Online resources are optional).');
  }

  const invalidColumns = [];
  if (topicIssues.length > 0) invalidColumns.push('Topics');
  if (tlaIssues.length > 0) invalidColumns.push('TLAs');
  if (refIssues.length > 0) invalidColumns.push('References');

  return {
    isValid: invalidColumns.length === 0,
    invalidColumns,
    usedMinutes,
    budgetMinutes,
    issues: {
      topics: topicIssues,
      tlas: tlaIssues,
      references: refIssues,
    },
  };
}

/**
 * GET /api/courses/:pcId/:revNum/weekly-validation
 * Evaluates every weekly content slice (Course Orientation + all CO weeks)
 * using the exact 3-column validation rules of the Weekly Content Form.
 */
exports.getWeeklyContentValidation = async (req, res, next) => {
  try {
    const { pcId, revNum } = req.params;
    const offering = await findOfferingByPcIdAndRev(pcId, revNum, {
      include: [{ model: db.Course, as: 'course' }],
    });
    if (!offering) {
      return res.status(404).json({ message: 'Learning plan offering not found.' });
    }

    const course = offering.course || offering.Course || {};
    const {
      totalWeeklyHours,
      orientationHours,
      courseHasLab,
      allowedPhases,
    } = computeCourseScheduleMeta(course);

    const courseOutcomes = await db.CourseOutcome.findAll({
      where: { pc_offering_id: offering.pc_offering_id },
      order: [['co_id', 'ASC']],
    });
    const coIds = courseOutcomes.map((c) => Number(c.co_id));

    if (coIds.length === 0) {
      return res.json({
        pc_offering_id: offering.pc_offering_id,
        revision_number: offering.revision_number,
        allValid: false,
        totalSlices: 0,
        validSlices: 0,
        invalidSlicesCount: 0,
        courseHasLab,
        hasPreviousTerm: false,
        previousSource: null,
        unresolvedCommentCount: 0,
        groups: [],
        invalidGroups: [],
      });
    }

    const weeks = await db.Week.findAll({
      where: { co_id: { [Op.in]: coIds } },
      order: [['co_id', 'ASC'], ['week_id', 'ASC']],
    });
    const weekIds = weeks.map((w) => Number(w.week_id));

    const [subtopics, tlas, weeklyRefs, assignment] = await Promise.all([
      weekIds.length > 0
        ? db.Subtopic.findAll({
            where: { week_id: { [Op.in]: weekIds } },
            include: [{ model: db.Topic, as: 'topic', attributes: ['topic_id', 'title'] }],
            order: [['week_id', 'ASC'], ['is_orientation', 'DESC'], ['subtopic_id', 'ASC'], ['sequence_order', 'ASC']],
          })
        : [],
      weekIds.length > 0
        ? db.TeachingAndLearningActivity.findAll({
            where: { week_id: { [Op.in]: weekIds } },
            order: [['week_id', 'ASC'], ['is_orientation', 'DESC'], ['tla_id', 'ASC']],
          })
        : [],
      weekIds.length > 0
        ? db.WeeklyReference.findAll({
            where: { week_id: { [Op.in]: weekIds } },
            include: [{ model: db.Reference, as: 'reference' }],
            order: [['week_id', 'ASC'], ['is_orientation', 'DESC'], ['weekly_reference_id', 'ASC']],
          })
        : [],
      db.CourseOfferingAssignment.findOne({
        where: { pc_offering_id: offering.pc_offering_id },
        include: [{ model: db.AssignmentWorkflowLog, as: 'logs' }],
        order: [['co_assign_id', 'DESC']],
      }),
    ]);

    const tlaIds = tlas.map((t) => Number(t.tla_id)).filter(Boolean);
    const assessments = tlaIds.length > 0
      ? await db.TLAAssessment.findAll({
          where: { tla_id: { [Op.in]: tlaIds } },
          order: [['tla_id', 'ASC'], ['method_id', 'ASC']],
        })
      : [];

    const assessmentsByTlaId = new Map();
    for (const a of assessments) {
      const tid = Number(a.tla_id);
      if (!assessmentsByTlaId.has(tid)) assessmentsByTlaId.set(tid, []);
      assessmentsByTlaId.get(tid).push(a);
    }

    // Group slice records by `${week_id}_${isOrientation}`
    const subtopicsBySlice = new Map();
    for (const s of subtopics) {
      const key = `${Number(s.week_id)}_${Boolean(s.is_orientation)}`;
      if (!subtopicsBySlice.has(key)) subtopicsBySlice.set(key, []);
      subtopicsBySlice.get(key).push(s);
    }

    const tlasBySlice = new Map();
    for (const t of tlas) {
      const key = `${Number(t.week_id)}_${Boolean(t.is_orientation)}`;
      if (!tlasBySlice.has(key)) tlasBySlice.set(key, []);
      tlasBySlice.get(key).push(t);
    }

    const refsBySlice = new Map();
    for (const wr of weeklyRefs) {
      const key = `${Number(wr.week_id)}_${Boolean(wr.is_orientation)}`;
      if (!refsBySlice.has(key)) refsBySlice.set(key, []);
      refsBySlice.get(key).push(wr);
    }

    // Build 18-week schedule groups matching topicController.getWeekContext
    const groups = [];
    let currentWeekCounter = 1;
    let firstWeekObj = null;

    const regularGroups = [];
    for (let cIdx = 0; cIdx < courseOutcomes.length; cIdx++) {
      const co = courseOutcomes[cIdx];
      const cid = Number(co.co_id);
      const coNum = cIdx + 1;

      if (cIdx === 2 || currentWeekCounter === 9) {
        if (currentWeekCounter <= 9) currentWeekCounter = 10;
      }

      const coWeeks = weeks.filter((w) => Number(w.co_id) === cid);
      const evaluatedWeeks = [];

      for (let wIdx = 0; wIdx < coWeeks.length; wIdx++) {
        const w = coWeeks[wIdx];
        if (!firstWeekObj) firstWeekObj = w;

        const seqWeekNumber = currentWeekCounter++;
        const rawWeekHours = Number(w.hours) || totalWeeklyHours;
        const effectiveHours = (coNum === 1 && wIdx === 0)
          ? Math.max(1, rawWeekHours - orientationHours)
          : rawWeekHours;

        const sliceKey = `${Number(w.week_id)}_false`;
        const resSlice = validateSlice({
          subtopics: subtopicsBySlice.get(sliceKey) || [],
          tlas: tlasBySlice.get(sliceKey) || [],
          assessmentsByTlaId,
          weeklyRefs: refsBySlice.get(sliceKey) || [],
          budgetHours: effectiveHours,
          allowedPhases,
          courseHasLab,
        });

        evaluatedWeeks.push({
          week_id: Number(w.week_id),
          weekNumber: seqWeekNumber,
          weekLabel: `Week ${seqWeekNumber}`,
          isOrientation: false,
          hours: effectiveHours,
          ...resSlice,
        });
      }

      regularGroups.push({
        key: `co-${coNum}`,
        co_id: cid,
        coNumber: coNum,
        label: `CO ${coNum}`,
        isOrientation: false,
        allValid: evaluatedWeeks.length > 0 && evaluatedWeeks.every((ew) => ew.isValid),
        weeks: evaluatedWeeks,
      });
    }

    // Course Orientation slice (Week 1, is_orientation = true)
    if (firstWeekObj) {
      const orientKey = `${Number(firstWeekObj.week_id)}_true`;
      const orientResult = validateSlice({
        subtopics: subtopicsBySlice.get(orientKey) || [],
        tlas: tlasBySlice.get(orientKey) || [],
        assessmentsByTlaId,
        weeklyRefs: refsBySlice.get(orientKey) || [],
        budgetHours: orientationHours,
        allowedPhases,
        courseHasLab,
      });

      groups.push({
        key: 'orientation',
        co_id: Number(firstWeekObj.co_id),
        coNumber: 0,
        label: 'Course Orientation',
        isOrientation: true,
        allValid: orientResult.isValid,
        weeks: [
          {
            week_id: Number(firstWeekObj.week_id),
            weekNumber: 1,
            weekLabel: 'Week 1',
            isOrientation: true,
            hours: orientationHours,
            ...orientResult,
          },
        ],
      });
    }

    groups.push(...regularGroups);

    const allSlices = groups.flatMap((g) => g.weeks);
    const validSlices = allSlices.filter((s) => s.isValid).length;
    const invalidSlicesCount = allSlices.length - validSlices;

    const invalidGroups = groups
      .map((g) => ({
        key: g.key,
        coNumber: g.coNumber,
        label: g.label,
        isOrientation: g.isOrientation,
        invalidWeeks: g.weeks.filter((w) => !w.isValid),
      }))
      .filter((g) => g.invalidWeeks.length > 0);

    // Check previous term offering availability via existing lineage helper
    let previousSource = null;
    if (firstWeekObj) {
      const lineage = await resolveWeekLineageContext(firstWeekObj.week_id);
      const src = lineage?.baseOffering || lineage?.priorOfferings?.[0] || null;
      if (src) {
        previousSource = {
          pc_offering_id: src.pc_offering_id,
          revision_number: src.revision_number,
          termLabel: src.termLabel,
          status: src.status,
        };
      }
    }

    // Also compute unresolved blocking review comment count when in 'returned' stage
    let unresolvedCommentCount = 0;
    if (assignment) {
      const wf = computeWorkflowState(assignment.logs || [], offering);
      if (wf.stage === 'returned') {
        const unresolvedRows = await db.Comment.findAll({
          where: {
            co_assign_id: assignment.co_assign_id,
            resolved_status: false,
            commenter_role: { [Op.ne]: 'INDUSTRY_CONSULTANT' },
          },
          attributes: ['comment_id'],
        });
        unresolvedCommentCount = unresolvedRows.length;
      }
    }

    return res.json({
      pc_offering_id: offering.pc_offering_id,
      revision_number: offering.revision_number,
      allValid: allSlices.length > 0 && invalidSlicesCount === 0,
      totalSlices: allSlices.length,
      validSlices,
      invalidSlicesCount,
      courseHasLab,
      hasPreviousTerm: Boolean(previousSource),
      previousSource,
      unresolvedCommentCount,
      groups,
      invalidGroups,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/courses/:pcId/:revNum/import-previous-all-weeks
 * Developer/testing helper for Draft learning plans:
 * Imports Topics/Subtopics, TLAs/Assessments, and WeeklyReferences from the latest
 * previous term offering into ALL weeks (including Course Orientation Week 1) in one transaction.
 */
exports.importPreviousTermAllWeeks = async (req, res, next) => {
  try {
    const { pcId, revNum } = req.params;
    const offering = await findOfferingByPcIdAndRev(pcId, revNum, {
      include: [{ model: db.Course, as: 'course' }],
    });
    if (!offering) {
      return res.status(404).json({ message: 'Learning plan offering not found.' });
    }
    if (offering.approved_at) {
      return res.status(409).json({ message: 'Cannot import into an approved learning plan.' });
    }

    const assignment = await db.CourseOfferingAssignment.findOne({
      where: { pc_offering_id: offering.pc_offering_id },
      include: [{ model: db.AssignmentWorkflowLog, as: 'logs' }],
      order: [['co_assign_id', 'DESC']],
    });
    const wf = computeWorkflowState(assignment?.logs || [], offering);
    if (wf.stage !== 'draft') {
      return res.status(400).json({
        message: `Bulk import from previous term is only available for Draft learning plans (current stage: ${wf.stage}).`,
      });
    }

    const course = offering.course || offering.Course || {};
    const { courseHasLab } = computeCourseScheduleMeta(course);

    const firstCo = await db.CourseOutcome.findOne({
      where: { pc_offering_id: offering.pc_offering_id },
      order: [['co_id', 'ASC']],
    });
    if (!firstCo) {
      return res.status(400).json({ message: 'This learning plan has no Course Outcomes configured yet.' });
    }

    const firstWeek = await db.Week.findOne({
      where: { co_id: firstCo.co_id },
      order: [['week_id', 'ASC']],
    });
    if (!firstWeek) {
      return res.status(400).json({ message: 'This learning plan has no Weeks configured yet.' });
    }

    const lineage = await resolveWeekLineageContext(firstWeek.week_id);
    const sourceOffering = lineage?.baseOffering || lineage?.priorOfferings?.[0] || null;
    if (!sourceOffering) {
      return res.status(404).json({
        message: 'No previous term learning plan was found for this course to import from.',
      });
    }

    // Build ILO mapping: prior ILO ID -> current offering ILO ID
    const currentFlatIlos = [];
    (lineage.allOfferingCos || []).forEach((coItem, cIdx) => {
      const sortedIlos = [...(coItem.ilos || coItem.IntendedLearningOutcomes || [])].sort(
        (a, b) => Number(a.ilo_id) - Number(b.ilo_id)
      );
      sortedIlos.forEach((iloItem, iIdx) => {
        currentFlatIlos.push({
          ilo_id: Number(iloItem.ilo_id),
          coIndex: cIdx,
          iloIndex: iIdx,
          normDesc: String(iloItem.description || '').trim().toLowerCase(),
        });
      });
    });

    const priorIloToCurrentIloMap = new Map();
    (sourceOffering.courseOutcomes || []).forEach((priorCo, cIdx) => {
      const sortedPriorIlos = [...(priorCo.ilos || priorCo.IntendedLearningOutcomes || [])].sort(
        (a, b) => Number(a.ilo_id) - Number(b.ilo_id)
      );
      sortedPriorIlos.forEach((pIlo, iIdx) => {
        const pNormDesc = String(pIlo.description || '').trim().toLowerCase();
        const exactMatch = currentFlatIlos.find((c) => c.normDesc && c.normDesc === pNormDesc);
        const posMatch = currentFlatIlos.find((c) => c.coIndex === cIdx && c.iloIndex === iIdx);
        const mappedId = exactMatch ? exactMatch.ilo_id : (posMatch ? posMatch.ilo_id : null);
        if (mappedId) {
          priorIloToCurrentIloMap.set(Number(pIlo.ilo_id), mappedId);
        }
      });
    });

    const sourceWeekByNumber = new Map();
    (sourceOffering.weeks || []).forEach((sw) => {
      sourceWeekByNumber.set(Number(sw.week_number), sw);
    });

    const counts = {
      slicesImported: 0,
      topics: 0,
      subtopics: 0,
      tlas: 0,
      assessments: 0,
      references: 0,
    };

    const topicCacheByTitle = new Map();
    const existingCourseTopics = await db.Topic.findAll({
      where: { course_id: offering.course_id },
      order: [['topic_id', 'ASC']],
    });
    for (const t of existingCourseTopics) {
      const key = String(t.title || '').trim().toLowerCase();
      if (key && !topicCacheByTitle.has(key)) {
        topicCacheByTitle.set(key, Number(t.topic_id));
      }
    }

    await db.sequelize.transaction(async (t) => {
      const now = new Date();

      for (const targetWeek of lineage.orderedCurrentWeeks || []) {
        const srcWeek = sourceWeekByNumber.get(Number(targetWeek.week_number));
        if (!srcWeek) continue;

        const sliceOrientFlags = Number(targetWeek.week_number) === 1 ? [true, false] : [false];

        for (const isOrient of sliceOrientFlags) {
          const [priorSubtopics, priorTlas, priorWeeklyRefs] = await Promise.all([
            db.Subtopic.findAll({
              where: { week_id: srcWeek.week_id, is_orientation: isOrient },
              include: [{ model: db.Topic, as: 'topic' }],
              order: [['subtopic_id', 'ASC'], ['sequence_order', 'ASC']],
              transaction: t,
            }),
            db.TeachingAndLearningActivity.findAll({
              where: { week_id: srcWeek.week_id, is_orientation: isOrient },
              order: [['tla_id', 'ASC']],
              transaction: t,
            }),
            db.WeeklyReference.findAll({
              where: { week_id: srcWeek.week_id, is_orientation: isOrient },
              order: [['weekly_reference_id', 'ASC']],
              transaction: t,
            }),
          ]);

          let sliceTouched = false;

          // 1. Topics & Subtopics
          if (priorSubtopics.length > 0) {
            sliceTouched = true;
            await db.Subtopic.destroy({
              where: { week_id: targetWeek.week_id, is_orientation: isOrient },
              transaction: t,
            });

            const seenSliceTopics = new Set();
            for (const pSub of priorSubtopics) {
              const srcTopic = pSub.topic;
              const topicTitle = String(srcTopic?.title || 'Untitled Topic').trim();
              const titleKey = topicTitle.toLowerCase();

              let resolvedTopicId = topicCacheByTitle.get(titleKey);
              if (!resolvedTopicId) {
                const createdTopic = await db.Topic.create({
                  course_id: offering.course_id,
                  parent_topic_id: srcTopic ? Number(srcTopic.topic_id) : null,
                  title: topicTitle,
                  createdAt: now,
                  updatedAt: now,
                }, { transaction: t });
                resolvedTopicId = Number(createdTopic.topic_id);
                topicCacheByTitle.set(titleKey, resolvedTopicId);
              }
              seenSliceTopics.add(resolvedTopicId);

              await db.Subtopic.create({
                week_id: targetWeek.week_id,
                topic_id: resolvedTopicId,
                parent_subtopic_id: Number(pSub.subtopic_id),
                title: pSub.title,
                estimated_minutes: pSub.estimated_minutes != null ? Number(pSub.estimated_minutes) : null,
                sequence_order: pSub.sequence_order ?? 0,
                is_orientation: isOrient,
                createdAt: now,
                updatedAt: now,
              }, { transaction: t });
              counts.subtopics += 1;
            }
            counts.topics += seenSliceTopics.size;
          }

          // 2. TLAs & Assessments
          if (priorTlas.length > 0) {
            sliceTouched = true;
            const priorTlaIds = priorTlas.map((pt) => Number(pt.tla_id));
            const priorAssessments = await db.TLAAssessment.findAll({
              where: { tla_id: { [Op.in]: priorTlaIds } },
              order: [['method_id', 'ASC']],
              transaction: t,
            });

            const existingTargetTlas = await db.TeachingAndLearningActivity.findAll({
              where: { week_id: targetWeek.week_id, is_orientation: isOrient },
              attributes: ['tla_id'],
              transaction: t,
            });
            const existingTargetTlaIds = existingTargetTlas.map((et) => Number(et.tla_id));
            if (existingTargetTlaIds.length > 0) {
              await db.TLAAssessment.destroy({
                where: { tla_id: { [Op.in]: existingTargetTlaIds } },
                transaction: t,
              });
              await db.TeachingAndLearningActivity.destroy({
                where: { tla_id: { [Op.in]: existingTargetTlaIds } },
                transaction: t,
              });
            }

            for (const pTla of priorTlas) {
              const createdTla = await db.TeachingAndLearningActivity.create({
                week_id: targetWeek.week_id,
                tla_name: pTla.tla_name,
                description: pTla.description,
                performed_by: pTla.performed_by || 'S',
                class_phase: pTla.class_phase || 'inclass',
                is_lab: courseHasLab ? Boolean(pTla.is_lab) : false,
                is_orientation: isOrient,
                createdAt: now,
                updatedAt: now,
              }, { transaction: t });
              counts.tlas += 1;

              const matchingAssList = priorAssessments.filter(
                (a) => Number(a.tla_id) === Number(pTla.tla_id)
              );
              for (const pAss of matchingAssList) {
                const mappedIloId = pAss.ilo_id
                  ? priorIloToCurrentIloMap.get(Number(pAss.ilo_id)) || null
                  : null;
                await db.TLAAssessment.create({
                  tla_id: createdTla.tla_id,
                  ilo_id: mappedIloId,
                  name: pAss.name,
                  description: pAss.description,
                  period: pAss.period,
                  weight: pAss.weight,
                  min_passing: pAss.min_passing,
                  createdAt: now,
                  updatedAt: now,
                }, { transaction: t });
                counts.assessments += 1;
              }
            }
          }

          // 3. Weekly References
          if (priorWeeklyRefs.length > 0) {
            sliceTouched = true;
            await db.WeeklyReference.destroy({
              where: { week_id: targetWeek.week_id, is_orientation: isOrient },
              transaction: t,
            });

            const uniqueRefIds = [...new Set(priorWeeklyRefs.map((r) => Number(r.reference_id)).filter(Boolean))];
            for (const refId of uniqueRefIds) {
              await db.WeeklyReference.create({
                week_id: targetWeek.week_id,
                reference_id: refId,
                is_orientation: isOrient,
                createdAt: now,
                updatedAt: now,
              }, { transaction: t });
              counts.references += 1;
            }
          }

          if (sliceTouched) {
            counts.slicesImported += 1;
          }
        }
      }

      await markOfferingModified(offering.pc_offering_id, t);
    });

    return res.status(200).json({
      ok: true,
      message: `Imported previous term weekly contents from ${sourceOffering.termLabel} (Rev ${sourceOffering.revision_number}) across ${counts.slicesImported} weekly slot(s).`,
      sourceOffering: {
        pc_offering_id: sourceOffering.pc_offering_id,
        revision_number: sourceOffering.revision_number,
        termLabel: sourceOffering.termLabel,
      },
      counts,
    });
  } catch (err) {
    return next(err);
  }
};
