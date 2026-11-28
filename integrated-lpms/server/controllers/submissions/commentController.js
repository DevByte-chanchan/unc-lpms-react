'use strict';

const { Op } = require('sequelize');
const db = require('../../models');
const { computeWorkflowState, sortLogsChronologically, normalizeAction } = require('../../utils/workflowRules');
const { createNotification } = require('../../services/notifyService');

/**
 * Unified Comments Controller (M2 Composition + M3 Submissions Management)
 * Preserves ALL M2 endpoints (/unresolved-counts, /filter/:weekId/:type, /course/:pcId/:revNum, /update-resolution)
 * AND ALL M3 endpoints (/by-course/:code, POST /by-course, /suggestions/:pcId, PUT/DELETE /suggestions/item/:id, /earlier-consultant/:pcId).
 * Enforces Dean comment visibility: unforwarded Dean comments during 'with_program_head' are hidden from Instructors.
 */

async function resolveAssignmentForOffering(pcId) {
  return db.CourseOfferingAssignment.findOne({
    where: { pc_offering_id: Number(pcId) },
    include: [
      { model: db.ProgramCourseOffering, as: 'offering' },
      { model: db.AssignmentWorkflowLog, as: 'logs' },
    ],
    order: [['co_assign_id', 'DESC']],
  });
}

function filterVisibleComments(comments, userRole, workflowStage) {
  const isInstructor = userRole === 'Instructor';
  return comments.filter((c) => {
    const role = String(c.commenter_role || '').toUpperCase();
    // Hide unforwarded Dean comments from Instructor while still in 'with_program_head' triage
    if (isInstructor && workflowStage === 'with_program_head' && role === 'DEAN') {
      return false;
    }
    return true;
  });
}

function normStr(v) {
  return String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

async function loadOfferingStructure(pcId) {
  const cos = await db.CourseOutcome.findAll({
    where: { pc_offering_id: Number(pcId) },
    order: [['co_id', 'ASC']],
  });

  const coIds = cos.map((co) => Number(co.co_id));
  if (coIds.length === 0) {
    return {
      coList: [],
      allWeeks: [],
      weekMetaById: new Map(),
      subtopicById: new Map(),
      topicById: new Map(),
      tlaById: new Map(),
      weeklyRefById: new Map(),
      refById: new Map(),
    };
  }

  const [weeks, ilos] = await Promise.all([
    db.Week.findAll({
      where: { co_id: { [Op.in]: coIds } },
      order: [['co_id', 'ASC'], ['week_id', 'ASC']],
    }),
    db.IntendedLearningOutcome.findAll({
      where: { co_id: { [Op.in]: coIds } },
      order: [['co_id', 'ASC'], ['ilo_id', 'ASC']],
    }),
  ]);

  const weekIds = weeks.map((w) => Number(w.week_id));
  const [subtopics, tlas, weeklyRefs] = weekIds.length > 0
    ? await Promise.all([
        db.Subtopic.findAll({
          where: { week_id: { [Op.in]: weekIds } },
          include: [{ model: db.Topic, as: 'topic' }],
        }),
        db.TeachingAndLearningActivity.findAll({
          where: { week_id: { [Op.in]: weekIds } },
        }),
        db.WeeklyReference.findAll({
          where: { week_id: { [Op.in]: weekIds } },
          include: [{ model: db.Reference, as: 'reference' }],
        }),
      ])
    : [[], [], []];

  const weeksByCo = new Map();
  for (const w of weeks) {
    const cid = Number(w.co_id);
    if (!weeksByCo.has(cid)) weeksByCo.set(cid, []);
    weeksByCo.get(cid).push(w);
  }

  const ilosByCo = new Map();
  for (const ilo of ilos) {
    const cid = Number(ilo.co_id);
    if (!ilosByCo.has(cid)) ilosByCo.set(cid, []);
    ilosByCo.get(cid).push(ilo);
  }

  const subtopicsByWeek = new Map();
  const subtopicById = new Map();
  const topicById = new Map();
  for (const s of subtopics) {
    const wid = Number(s.week_id);
    if (!subtopicsByWeek.has(wid)) subtopicsByWeek.set(wid, []);
    subtopicsByWeek.get(wid).push(s);
    subtopicById.set(Number(s.subtopic_id), s);
    if (s.topic) topicById.set(Number(s.topic.topic_id), s.topic);
  }

  const tlasByWeek = new Map();
  const tlaById = new Map();
  for (const t of tlas) {
    const wid = Number(t.week_id);
    if (!tlasByWeek.has(wid)) tlasByWeek.set(wid, []);
    tlasByWeek.get(wid).push(t);
    tlaById.set(Number(t.tla_id), t);
  }

  const weeklyRefsByWeek = new Map();
  const weeklyRefById = new Map();
  const refById = new Map();
  for (const wr of weeklyRefs) {
    const wid = Number(wr.week_id);
    if (!weeklyRefsByWeek.has(wid)) weeklyRefsByWeek.set(wid, []);
    weeklyRefsByWeek.get(wid).push(wr);
    weeklyRefById.set(Number(wr.weekly_reference_id), wr);
    if (wr.reference) refById.set(Number(wr.reference.reference_id), wr.reference);
  }

  const coList = [];
  const allWeeks = [];
  const weekMetaById = new Map();

  let globalWeekNo = 0;
  cos.forEach((co, coIdx) => {
    const coNo = coIdx + 1;
    const cid = Number(co.co_id);
    const sortedWeeks = weeksByCo.get(cid) || [];
    const sortedIlos = ilosByCo.get(cid) || [];

    sortedWeeks.forEach((w, wIdx) => {
      globalWeekNo += 1;
      const wid = Number(w.week_id);
      // Attach child arrays to week instance for downstream callers
      w.subtopics = subtopicsByWeek.get(wid) || [];
      w.tlas = tlasByWeek.get(wid) || [];
      w.weeklyReferences = weeklyRefsByWeek.get(wid) || [];

      const meta = {
        co_no: coNo,
        week_no_in_co: wIdx + 1,
        week_no: globalWeekNo,
        week: w,
        co,
      };
      weekMetaById.set(wid, meta);
      allWeeks.push(meta);
    });

    coList.push({ coNo, co, weeks: sortedWeeks, ilos: sortedIlos });
  });

  return { coList, allWeeks, weekMetaById, subtopicById, topicById, tlaById, weeklyRefById, refById };
}

function resolveTargetLabel(targetId, commentFor, struct) {
  if (!targetId) return null;
  const tid = Number(targetId);
  const cf = String(commentFor || '').toLowerCase();
  if (cf.includes('topic')) {
    const sub = struct.subtopicById.get(tid);
    if (sub?.title) return sub.title;
    const top = struct.topicById.get(tid);
    if (top?.title) return top.title;
  } else if (cf.includes('tla')) {
    const tla = struct.tlaById.get(tid);
    if (tla?.tla_name) return tla.tla_name;
  } else if (cf.includes('ref')) {
    const wr = struct.weeklyRefById.get(tid);
    if (wr?.reference?.title) return wr.reference.title;
    const ref = struct.refById.get(tid);
    if (ref?.title) return ref.title;
  }
  return null;
}

function buildTopicGroupsForTargets(targetIds, struct) {
  const groups = [];
  for (const tid of targetIds) {
    const sub = struct.subtopicById.get(Number(tid));
    if (sub) {
      const topId = sub.topic?.topic_id || sub.topic_id || null;
      const topTitle = sub.topic?.title || 'Topic';
      let grp = groups.find((g) => (topId && Number(g.topic_id) === Number(topId)) || g.topic_title === topTitle);
      if (!grp) {
        grp = { topic_id: topId, topic_title: topTitle, subtopics: [] };
        groups.push(grp);
      }
      if (!grp.subtopics.some((s) => Number(s.subtopic_id) === Number(sub.subtopic_id))) {
        grp.subtopics.push({ subtopic_id: sub.subtopic_id, title: sub.title });
      }
      continue;
    }
    const top = struct.topicById.get(Number(tid));
    if (top) {
      if (!groups.some((g) => Number(g.topic_id) === Number(top.topic_id))) {
        groups.push({ topic_id: top.topic_id, topic_title: top.title, subtopics: [] });
      }
    }
  }
  return groups;
}

function computeReviewRoundForComment(commentTimeMs, sortedLogs) {
  // Rounds start at 1 on first SUBMITTED and increment on each subsequent SUBMITTED
  let round = 0;
  const roundReturned = new Map();
  const roundReturnDate = new Map();
  let commentRound = 1;

  for (const log of sortedLogs) {
    const act = normalizeAction(log.action_type);
    const t = new Date(log.createdAt || 0).getTime();
    if (act === 'SUBMITTED') {
      round += 1;
      if (t <= commentTimeMs) commentRound = round;
    } else if (act === 'RETURNED' || act === 'FORWARDED') {
      const r = Math.max(1, round);
      roundReturned.set(r, true);
      if (!roundReturnDate.has(r)) roundReturnDate.set(r, log.createdAt);
    }
  }
  const finalRound = Math.max(1, commentRound);
  return {
    review_round: finalRound,
    review_returned: Boolean(roundReturned.get(finalRound)),
    return_number: finalRound,
    return_date: roundReturnDate.get(finalRound) || null,
  };
}

exports.getUnresolvedCounts = async (req, res, next) => {
  try {
    const pcId = req.params?.pcId || req.query.pcId || req.query.pc_offering_id;
    let assigns = [];

    if (pcId) {
      const a = await resolveAssignmentForOffering(pcId);
      if (a) assigns = [a];
    } else if (req.user?.user_id) {
      assigns = await db.CourseOfferingAssignment.findAll({
        where: { stakeholder_id: req.user.user_id },
        include: [
          { model: db.ProgramCourseOffering, as: 'offering' },
          { model: db.AssignmentWorkflowLog, as: 'logs' },
        ],
      });
    }

    if (assigns.length === 0) {
      return res.json({ total: 0, byType: { topics: 0, tlas: 0, references: 0, general: 0 }, byWeek: {} });
    }

    const stageByAssign = new Map();
    for (const a of assigns) {
      const wf = computeWorkflowState(a.logs || [], a.offering);
      stageByAssign.set(Number(a.co_assign_id), wf.stage);
    }

    const rawRows = await db.Comment.findAll({
      where: {
        co_assign_id: { [Op.in]: assigns.map((a) => a.co_assign_id) },
        resolved_status: false,
        commenter_role: { [Op.ne]: 'INDUSTRY_CONSULTANT' },
      },
    });

    const rows = rawRows.filter((c) => {
      const stage = stageByAssign.get(Number(c.co_assign_id)) || 'draft';
      return filterVisibleComments([c], req.user?.activeRole, stage).length > 0;
    });

    const byType = { topics: 0, tlas: 0, references: 0, general: 0 };
    const byWeek = {};

    for (const c of rows) {
      const t = String(c.comment_for || 'general').toLowerCase();
      if (t.includes('topic')) byType.topics += 1;
      else if (t.includes('tla')) byType.tlas += 1;
      else if (t.includes('ref')) byType.references += 1;
      else byType.general += 1;

      if (c.week_id) {
        const w = String(c.week_id);
        if (!byWeek[w]) byWeek[w] = { topics: 0, tlas: 0, references: 0, total: 0 };
        if (t.includes('topic')) byWeek[w].topics += 1;
        else if (t.includes('tla')) byWeek[w].tlas += 1;
        else if (t.includes('ref')) byWeek[w].references += 1;
        byWeek[w].total += 1;
      }
    }

    return res.json({ total: rows.length, byType, byWeek });
  } catch (err) {
    return next(err);
  }
};

exports.getCommentsByWeekAndType = async (req, res, next) => {
  try {
    const weekId = Number(req.params.weekId);
    const rawType = String(req.params.type || '').toLowerCase();

    const where = {
      week_id: weekId,
      commenter_role: { [Op.ne]: 'INDUSTRY_CONSULTANT' },
    };
    if (rawType && rawType !== 'all') {
      where.comment_for = { [Op.like]: `%${rawType}%` };
    }

    const rawComments = await db.Comment.findAll({
      where,
      include: [{ model: db.CommentTarget, as: 'targets' }],
      order: [['createdAt', 'DESC']],
    });

    // Fast path: skip week/assignment/target lookups entirely when this week/type has no comments
    if (rawComments.length === 0) {
      return res.json([]);
    }

    const week = await db.Week.findByPk(weekId, {
      include: [{ model: db.CourseOutcome, as: 'courseOutcome' }],
    });

    const pcId = week?.courseOutcome?.pc_offering_id || null;
    const assignment = pcId ? await resolveAssignmentForOffering(pcId) : null;
    const wf = assignment ? computeWorkflowState(assignment.logs || [], assignment.offering) : { stage: 'draft' };
    const visible = filterVisibleComments(rawComments, req.user?.activeRole, wf.stage);

    if (visible.length === 0) {
      return res.json([]);
    }

    const sortedLogs = sortLogsChronologically(assignment?.logs || []);

    // Load only this single week's relevant target lookup maps
    const needsTopics = !rawType || rawType === 'all' || rawType.includes('topic');
    const needsTlas = !rawType || rawType === 'all' || rawType.includes('tla');
    const needsRefs = !rawType || rawType === 'all' || rawType.includes('ref');

    const [weekSubtopics, weekTlas, weekRefs] = await Promise.all([
      needsTopics
        ? db.Subtopic.findAll({
            where: { week_id: weekId },
            include: [{ model: db.Topic, as: 'topic' }],
          })
        : [],
      needsTlas
        ? db.TeachingAndLearningActivity.findAll({
            where: { week_id: weekId },
          })
        : [],
      needsRefs
        ? db.WeeklyReference.findAll({
            where: { week_id: weekId },
            include: [{ model: db.Reference, as: 'reference' }],
          })
        : [],
    ]);

    const subtopicById = new Map();
    const topicById = new Map();
    for (const s of weekSubtopics) {
      subtopicById.set(Number(s.subtopic_id), s);
      if (s.topic) topicById.set(Number(s.topic.topic_id), s.topic);
    }
    const tlaById = new Map();
    for (const t of weekTlas) {
      tlaById.set(Number(t.tla_id), t);
    }
    const weeklyRefById = new Map();
    const refById = new Map();
    for (const wr of weekRefs) {
      weeklyRefById.set(Number(wr.weekly_reference_id), wr);
      if (wr.reference) refById.set(Number(wr.reference.reference_id), wr.reference);
    }
    const struct = { subtopicById, topicById, tlaById, weeklyRefById, refById };

    const enriched = visible.map((c) => {
      const json = c.toJSON();
      const targetIds = (c.targets || []).map((t) => Number(t.target_id)).filter(Boolean);
      const targetTitles = targetIds
        .map((tid) => resolveTargetLabel(tid, c.comment_for, struct))
        .filter(Boolean);
      const topicGroups = String(c.comment_for || '').toLowerCase().includes('topic')
        ? buildTopicGroupsForTargets(targetIds, struct)
        : [];
      const roundInfo = computeReviewRoundForComment(new Date(c.createdAt || 0).getTime(), sortedLogs);

      return {
        ...json,
        target_ids: targetIds,
        target_id: targetIds[0] || null,
        target_title: targetTitles[0] || null,
        target_titles: targetTitles,
        topic_groups: topicGroups,
        return_number: roundInfo.return_number,
        return_date: roundInfo.return_date || c.createdAt,
        review_round: roundInfo.review_round,
        review_returned: roundInfo.review_returned,
      };
    });

    return res.json(enriched);
  } catch (err) {
    return next(err);
  }
};

exports.getCommentsByOffering = async (req, res, next) => {
  try {
    const pcId = Number(req.params.pcId);
    const assignment = await resolveAssignmentForOffering(pcId);
    if (!assignment) return res.json({ comments: [], unresolvedCount: 0 });

    const wf = computeWorkflowState(assignment.logs || [], assignment.offering);
    const sortedLogs = sortLogsChronologically(assignment.logs || []);
    const struct = await loadOfferingStructure(pcId);

    const allComments = await db.Comment.findAll({
      where: { co_assign_id: assignment.co_assign_id },
      include: [{ model: db.CommentTarget, as: 'targets' }],
      order: [['createdAt', 'DESC']],
    });

    const visible = filterVisibleComments(allComments, req.user?.activeRole, wf.stage);
    const unresolvedCount = visible.filter(
      (c) => !c.resolved_status && String(c.commenter_role || '').toUpperCase() !== 'INDUSTRY_CONSULTANT'
    ).length;

    // Emit enriched rows (one per target when multiple targets exist so serverComments.js folds them cleanly)
    const enrichedRows = [];
    for (const c of visible) {
      const json = c.toJSON();
      const weekMeta = c.week_id ? struct.weekMetaById.get(Number(c.week_id)) : null;
      const roundInfo = computeReviewRoundForComment(new Date(c.createdAt || 0).getTime(), sortedLogs);
      const targetIds = (c.targets || []).map((t) => Number(t.target_id)).filter(Boolean);

      const cRole = String(c.commenter_role || '').toUpperCase();
      const recipientRole = cRole === 'INSTRUCTOR'
        ? 'industry-consultant'
        : (cRole === 'DEAN' && wf.stage === 'with_program_head' ? 'program_head' : 'instructor');

      const base = {
        ...json,
        recipient_role: recipientRole,
        co_no: weekMeta?.co_no || null,
        week_no_in_co: weekMeta?.week_no_in_co || null,
        week_no: weekMeta?.week_no || null,
        target_ids: targetIds,
        review_round: roundInfo.review_round,
        review_returned: roundInfo.review_returned,
      };

      if (targetIds.length <= 1) {
        const tid = targetIds[0] || null;
        enrichedRows.push({
          ...base,
          target_id: tid,
          target_title: tid ? resolveTargetLabel(tid, c.comment_for, struct) : null,
        });
      } else {
        for (const tid of targetIds) {
          enrichedRows.push({
            ...base,
            target_id: tid,
            target_title: resolveTargetLabel(tid, c.comment_for, struct),
          });
        }
      }
    }

    return res.json({
      comments: enrichedRows,
      unresolvedCount,
      stage: wf.stage,
    });
  } catch (err) {
    return next(err);
  }
};

exports.getCommentsByCourseCode = async (req, res, next) => {
  try {
    const courseCode = String(req.params.courseCode || '').trim();
    const course = await db.Course.findOne({ where: { course_no: courseCode } });
    if (!course) return res.json({ comments: [] });

    const latestOffering = await db.ProgramCourseOffering.findOne({
      where: { course_id: course.course_id },
      order: [['pc_offering_id', 'DESC']],
    });
    if (!latestOffering) return res.json({ comments: [] });

    req.params.pcId = latestOffering.pc_offering_id;
    return exports.getCommentsByOffering(req, res, next);
  } catch (err) {
    return next(err);
  }
};

exports.createComment = async (req, res, next) => {
  try {
    const pcId = Number(req.body?.pc_offering_id || req.body?.offering_id || req.body?.pcId || req.params?.pcId || 0);
    const courseCode = req.body?.course_code || req.body?.code || req.body?.courseCode;
    const message = String(req.body?.message || req.body?.text || req.body?.comment_text || req.body?.comment || '').trim();
    if (!message) return res.status(400).json({ error: 'Comment message is required.' });

    let assignment = null;
    if (pcId) {
      assignment = await resolveAssignmentForOffering(pcId);
    } else if (req.body?.co_assign_id) {
      assignment = await db.CourseOfferingAssignment.findByPk(Number(req.body.co_assign_id), {
        include: [{ model: db.ProgramCourseOffering, as: 'offering' }],
      });
    } else if (courseCode) {
      const course = await db.Course.findOne({ where: { course_no: String(courseCode).trim() } });
      if (course) {
        const off = await db.ProgramCourseOffering.findOne({
          where: { course_id: course.course_id },
          order: [['pc_offering_id', 'DESC']],
        });
        if (off) assignment = await resolveAssignmentForOffering(off.pc_offering_id);
      }
    }

    if (!assignment) {
      return res.status(404).json({ error: 'Target course assignment not found.' });
    }

    const offeringId = assignment.pc_offering_id;
    const rawFor = String(req.body?.comment_for || req.body?.section || 'general').trim().toLowerCase();
    const commentFor = rawFor.includes('topic')
      ? 'topics'
      : (rawFor.includes('tla') ? 'tlas' : (rawFor.includes('ref') ? 'references' : rawFor || 'general'));

    // Resolve week_id and target_ids from structured M3 payloads (co_index, week_index, ilo_index, target_titles)
    let resolvedWeekId = req.body?.week_id ? Number(req.body.week_id) : null;
    let resolvedTargetIds = Array.isArray(req.body?.target_ids)
      ? req.body.target_ids.map(Number).filter(Boolean)
      : (req.body?.target_id ? [Number(req.body.target_id)].filter(Boolean) : []);

    const targetTitles = Array.isArray(req.body?.target_titles)
      ? req.body.target_titles.map((t) => String(t || '').trim()).filter(Boolean)
      : [];
    const coIndex = req.body?.co_index ? Number(req.body.co_index) : null;
    const weekIndex = req.body?.week_index ? Number(req.body.week_index) : null;
    const iloIndex = req.body?.ilo_index ? Number(req.body.ilo_index) : null;

    if (!resolvedWeekId || (targetTitles.length > 0 && resolvedTargetIds.length === 0)) {
      const struct = await loadOfferingStructure(offeringId);

      // 1. Resolve week_id from co_index + week_index/ilo_index
      if (!resolvedWeekId && coIndex && struct.coList[coIndex - 1]) {
        const coEntry = struct.coList[coIndex - 1];
        if (weekIndex && coEntry.weeks[weekIndex - 1]) {
          resolvedWeekId = Number(coEntry.weeks[weekIndex - 1].week_id);
        } else if (iloIndex && coEntry.weeks.length > 0) {
          const wPos = Math.min(Math.max(iloIndex - 1, 0), coEntry.weeks.length - 1);
          resolvedWeekId = Number(coEntry.weeks[wPos].week_id);
        } else if (coEntry.weeks.length > 0) {
          resolvedWeekId = Number(coEntry.weeks[0].week_id);
        }
      }

      // 2. Library Director reference comments: find week(s) containing the referenced title
      if (!resolvedWeekId && commentFor === 'references' && targetTitles.length > 0) {
        const wantSet = new Set(targetTitles.map(normStr));
        for (const meta of struct.allWeeks) {
          const matchedWrs = (meta.week.weeklyReferences || []).filter((wr) => {
            const title = normStr(wr.reference?.title);
            if (!title) return false;
            return wantSet.has(title) || [...wantSet].some((w) => title.includes(w) || w.includes(title));
          });
          if (matchedWrs.length > 0) {
            resolvedWeekId = Number(meta.week.week_id);
            if (resolvedTargetIds.length === 0) {
              resolvedTargetIds = matchedWrs.map((wr) => Number(wr.weekly_reference_id)).filter((n) => Number.isFinite(n) && n > 0);
            }
            break;
          }
        }
      }

      // Fallback so no actionable reviewer comment is ever orphaned with week_id = null
      if (!resolvedWeekId && struct.allWeeks.length > 0) {
        resolvedWeekId = Number(struct.allWeeks[0].week.week_id);
      }

      // 3. Resolve target_titles -> target_ids inside the resolved week
      if (targetTitles.length > 0 && resolvedTargetIds.length === 0 && resolvedWeekId) {
        const weekMeta = struct.weekMetaById.get(Number(resolvedWeekId));
        const weekObj = weekMeta?.week;
        if (weekObj) {
          const wantNorms = targetTitles.map(normStr);
          if (commentFor === 'topics') {
            for (const sub of (weekObj.subtopics || [])) {
              const sNorm = normStr(sub.title);
              const tNorm = normStr(sub.topic?.title);
              if (wantNorms.some((w) => w === sNorm || w === tNorm || sNorm.includes(w) || w.includes(sNorm))) {
                resolvedTargetIds.push(Number(sub.subtopic_id));
              }
            }
          } else if (commentFor === 'tlas') {
            for (const tla of (weekObj.tlas || [])) {
              const tNorm = normStr(tla.tla_name);
              if (wantNorms.some((w) => w === tNorm || tNorm.includes(w) || w.includes(tNorm))) {
                resolvedTargetIds.push(Number(tla.tla_id));
              }
            }
          } else if (commentFor === 'references') {
            for (const wr of (weekObj.weeklyReferences || [])) {
              const rNorm = normStr(wr.reference?.title);
              if (rNorm && wantNorms.some((w) => w === rNorm || rNorm.includes(w) || w.includes(rNorm))) {
                resolvedTargetIds.push(Number(wr.weekly_reference_id));
              }
            }
          }
          resolvedTargetIds = [...new Set(resolvedTargetIds.filter((n) => Number.isFinite(n) && n > 0))];
        }
      }
    }

    const validTargetIds = [...new Set(resolvedTargetIds.map(Number).filter((n) => Number.isFinite(n) && n > 0))];
    const commenterRole = req.user?.workflowRole || 'PROGRAM_HEAD';
    const created = await db.sequelize.transaction(async (t) => {
      const comment = await db.Comment.create({
        co_assign_id: assignment.co_assign_id,
        stakeholder_id: String(req.user.user_id),
        commenter_user_id: req.user.user_id,
        commenter_name: req.user.name,
        commenter_role: commenterRole,
        message,
        resolved_status: false,
        week_id: resolvedWeekId,
        comment_for: commentFor,
      }, { transaction: t });

      if (validTargetIds.length > 0) {
        await db.CommentTarget.bulkCreate(
          validTargetIds.map((tid) => ({ comment_id: comment.comment_id, target_id: tid })),
          { transaction: t }
        );
      }
      return comment;
    });

    if (assignment.stakeholder_id && commenterRole !== 'DEAN' && commenterRole !== 'INDUSTRY_CONSULTANT') {
      const tabQuery = ['topics', 'tlas', 'references'].includes(commentFor) ? `?tab=${commentFor}` : '';
      const directLink = resolvedWeekId
        ? `/topics/form/${resolvedWeekId}/returned${tabQuery}`
        : `/courses/${assignment.pc_offering_id}/${assignment.offering?.revision_number || 1}/returned`;

      await createNotification({
        recipientUserId: assignment.stakeholder_id,
        type: 'comment',
        title: `New Review Comment from ${req.user.activeRole}`,
        message: `${req.user.name}: "${message.slice(0, 140)}"`,
        link: directLink,
        offeringId: assignment.pc_offering_id,
        commentId: created.comment_id,
        targetType: commentFor,
        targetId: resolvedWeekId || null,
        actorRole: commenterRole,
        sentByAccountId: req.user.user_id,
      });
    }

    return res.status(201).json({ comment: created, week_id: resolvedWeekId, target_ids: resolvedTargetIds });
  } catch (err) {
    return next(err);
  }
};

exports.updateResolution = async (req, res, next) => {
  try {
    const updates = [];
    if (Array.isArray(req.body?.updates)) {
      for (const u of req.body.updates) {
        updates.push({ id: Number(u.comment_id || u.id), resolved: Boolean(u.resolved_status ?? u.resolved) });
      }
    } else if (Array.isArray(req.body?.commentIds)) {
      const flag = Boolean(req.body.resolved_status ?? true);
      for (const cid of req.body.commentIds) {
        updates.push({ id: Number(cid), resolved: flag });
      }
    } else if (req.body?.comment_id || req.body?.id || req.params?.commentId) {
      const id = Number(req.body?.comment_id || req.body?.id || req.params?.commentId);
      const flag = Boolean(req.body?.resolved_status ?? req.body?.resolved ?? true);
      updates.push({ id, resolved: flag });
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No comment IDs provided for resolution update.' });
    }

    const now = new Date();
    for (const u of updates) {
      await db.Comment.update(
        { resolved_status: u.resolved, resolved_date: u.resolved ? now : null },
        { where: { comment_id: u.id } }
      );
    }

    return res.json({ ok: true, updatedCount: updates.length });
  } catch (err) {
    return next(err);
  }
};

exports.listSuggestions = async (req, res, next) => {
  try {
    const pcId = Number(req.params.pcId);
    const targetOffering = await db.ProgramCourseOffering.findByPk(pcId);
    if (!targetOffering) return res.json({ suggestions: [], earlierVersions: [] });

    // Fetch target offering + earlier sibling offerings of same course & program
    const offerings = await db.ProgramCourseOffering.findAll({
      where: {
        course_id: targetOffering.course_id,
        program_id: targetOffering.program_id,
        pc_offering_id: { [Op.lte]: pcId },
      },
      include: [
        {
          model: db.CourseOfferingAssignment,
          as: 'assignments',
          include: [
            {
              model: db.Comment,
              as: 'comments',
              where: { commenter_role: 'INDUSTRY_CONSULTANT' },
              required: false,
              include: [{ model: db.CommentTarget, as: 'targets' }],
            },
          ],
        },
      ],
      order: [['pc_offering_id', 'DESC']],
    });

    const suggestions = [];
    const earlierVersions = [];

    for (const off of offerings) {
      const isThisPlan = Number(off.pc_offering_id) === pcId;
      const offComments = (off.assignments || []).flatMap((a) => a.comments || []);
      if (offComments.length === 0) continue;

      const struct = await loadOfferingStructure(off.pc_offering_id);
      const sortedComments = [...offComments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const formattedForOff = sortedComments.map((c) => {
        const tid = c.targets?.[0]?.target_id ? Number(c.targets[0].target_id) : null;
        const targetTitle = tid ? resolveTargetLabel(tid, c.comment_for, struct) : null;
        const weekMeta = c.week_id ? struct.weekMetaById.get(Number(c.week_id)) : null;

        return {
          id: c.comment_id,
          comment_id: c.comment_id,
          offeringId: off.pc_offering_id,
          thisPlan: isThisPlan,
          name: c.commenter_name || 'Industry Consultant',
          commenterName: c.commenter_name || 'Industry Consultant',
          commenter_name: c.commenter_name || 'Industry Consultant',
          commenter_role: c.commenter_role,
          at: c.createdAt,
          createdAt: c.createdAt,
          date: c.createdAt,
          about: c.comment_for || null,
          comment_for: c.comment_for || null,
          target: targetTitle,
          targetTitle,
          weekNumber: weekMeta?.week_no || null,
          message: c.message,
          schoolYear: off.school_year || '',
          semester: off.semester || '',
          revision: off.revision_number || 1,
        };
      });

      suggestions.push(...formattedForOff);

      if (!isThisPlan) {
        earlierVersions.push({
          offeringId: off.pc_offering_id,
          schoolYear: off.school_year || '',
          semester: off.semester || '',
          revision: off.revision_number || 1,
          comments: formattedForOff,
        });
      }
    }

    return res.json({ suggestions, earlierVersions, versions: earlierVersions });
  } catch (err) {
    return next(err);
  }
};

exports.createSuggestion = async (req, res, next) => {
  try {
    const pcId = Number(req.params.pcId);
    const message = String(req.body?.message || req.body?.comment_text || req.body?.comment || '').trim();
    if (!message) return res.status(400).json({ error: 'Suggestion message is required.' });

    const assignment = await resolveAssignmentForOffering(pcId);
    if (!assignment) return res.status(404).json({ error: 'Offering assignment not found.' });

    const created = await db.Comment.create({
      co_assign_id: assignment.co_assign_id,
      stakeholder_id: String(req.user.user_id),
      commenter_user_id: req.user.user_id,
      commenter_name: req.user.name,
      commenter_role: 'INDUSTRY_CONSULTANT',
      message,
      resolved_status: false,
      week_id: req.body?.week_id ? Number(req.body.week_id) : null,
      comment_for: req.body?.comment_for || 'suggestion',
    });

    await db.AssignmentWorkflowLog.create({
      co_assign_id: assignment.co_assign_id,
      stakeholder_id: String(req.user.user_id),
      actor_user_id: req.user.user_id,
      actor_name: req.user.name,
      actor_role: 'INDUSTRY_CONSULTANT',
      action_type: 'Suggest',
      note: message.slice(0, 250),
      is_viewed: false,
    });

    return res.status(201).json({
      suggestion: {
        id: created.comment_id,
        comment_id: created.comment_id,
        thisPlan: true,
        name: created.commenter_name,
        at: created.createdAt,
        message: created.message,
      },
    });
  } catch (err) {
    return next(err);
  }
};

exports.updateSuggestion = async (req, res, next) => {
  try {
    const id = Number(req.params.commentId || req.params.id);
    const message = String(req.body?.message || req.body?.text || '').trim();
    if (!message) return res.status(400).json({ error: 'Suggestion message is required.' });

    const row = await db.Comment.findByPk(id);
    if (!row) return res.status(404).json({ error: 'Suggestion not found.' });
    if (String(row.commenter_role || '').toUpperCase() !== 'INDUSTRY_CONSULTANT') {
      return res.status(403).json({ error: 'Only industry consultant suggestions can be edited here.' });
    }
    const isOwner = Number(row.commenter_user_id) === Number(req.user?.user_id);
    const isAdmin = ['VPAA', 'Dean', 'Program Head'].includes(req.user?.activeRole);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'You can only edit your own suggestions.' });
    }

    await row.update({ message });
    return res.json({
      ok: true,
      suggestion: {
        id: row.comment_id,
        comment_id: row.comment_id,
        message: row.message,
        at: row.createdAt,
      },
    });
  } catch (err) {
    return next(err);
  }
};

exports.deleteComment = async (req, res, next) => {
  try {
    const id = Number(req.params.commentId || req.params.id);
    const row = await db.Comment.findByPk(id);
    if (!row) return res.status(404).json({ error: 'Comment not found.' });
    await row.destroy();
    return res.json({ ok: true, id });
  } catch (err) {
    return next(err);
  }
};
