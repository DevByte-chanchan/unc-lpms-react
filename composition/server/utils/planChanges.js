'use strict';

// What changed in a plan since an approver returned it. When a plan is returned, its reviewable content (course
// outcomes, ILOs, week hours, topics, activities with their assessments, weekly references) is copied into
// PlanReturnSnapshots. Once the instructor resubmits, the approvers get the differences against that copy, each
// marked when one of their own comments (made before the return) points at it, so re-review means checking only those.
//
// Items are keyed by their row id (topics:<subtopic_id>, tlas:<tla_id>, references:<weekly_reference_id>, the same
// ids CommentTargets uses). Saving a plan updates rows in place, so an untouched item keeps its key; `updatedAt` is
// not used because every save bumps it.

const { sequelize, Sequelize, PlanReturnSnapshot } = require('../models');
const { buildIloLabels } = require('./reviewRecordInputs');

const select = (sql, replacements) => sequelize.query(sql, { replacements, type: Sequelize.QueryTypes.SELECT });
const join = (...parts) => parts.filter(p => p !== null && p !== undefined && p !== false && String(p).trim() !== '').join(' · ');

// Map(key -> { kind, label, week_id, text }), in plan order.
const readPlanItems = async (offeringId) => {
    const weekLabels = await buildIloLabels(offeringId);
    const items = new Map();
    const cos = await select('SELECT co_id, co_description FROM CourseOutcomes WHERE pc_offering_id = ? ORDER BY co_id', [offeringId]);
    const coNumber = new Map(cos.map((co, i) => [co.co_id, i + 1]));
    for (const co of cos) items.set(`co:${co.co_id}`, { kind: 'Course outcome', label: `CO${coNumber.get(co.co_id)}`, week_id: null, text: co.co_description || '' });

    const ilos = await select(
        `SELECT i.ilo_id, i.co_id, i.description, i.hours, i.ied_level, i.target_students_percent, i.target_score_percent, i.assessment_tool
         FROM IntendedLearningOutcomes i INNER JOIN CourseOutcomes co ON co.co_id = i.co_id
         WHERE co.pc_offering_id = ? ORDER BY i.co_id, i.ilo_id`, [offeringId]);
    const iloCount = new Map();
    for (const i of ilos) {
        iloCount.set(i.co_id, (iloCount.get(i.co_id) || 0) + 1);
        items.set(`ilo:${i.ilo_id}`, {
            kind: 'ILO', label: `CO${coNumber.get(i.co_id)} · ILO ${iloCount.get(i.co_id)}`, week_id: null,
            text: join(i.description, i.hours != null && `${i.hours} h`, i.ied_level,
                i.target_students_percent != null && `${i.target_students_percent}% of students reach ${i.target_score_percent ?? '?'}%`, i.assessment_tool)
        });
    }

    const inPlan = 'INNER JOIN Weeks w ON w.week_id = x.week_id INNER JOIN CourseOutcomes co ON co.co_id = w.co_id WHERE co.pc_offering_id = ?';
    const weeks = await select(`SELECT w.week_id, w.hours FROM Weeks w INNER JOIN CourseOutcomes co ON co.co_id = w.co_id WHERE co.pc_offering_id = ? ORDER BY co.co_id, w.week_id`, [offeringId]);
    for (const w of weeks) items.set(`weeks:${w.week_id}`, { kind: 'Week hours', label: weekLabels.get(w.week_id) || 'Week', week_id: w.week_id, text: w.hours != null ? `${w.hours} h` : '' });

    const topics = await select(
        `SELECT x.subtopic_id, x.week_id, tp.title AS topic, x.title AS sub FROM Subtopics x INNER JOIN Topics tp ON tp.topic_id = x.topic_id ${inPlan}
         ORDER BY co.co_id, x.week_id, x.sequence_order, x.subtopic_id`, [offeringId]);
    for (const t of topics) items.set(`topics:${t.subtopic_id}`, { kind: 'Topic', label: weekLabels.get(t.week_id) || 'Week', week_id: t.week_id, text: t.sub ? `${t.topic}: ${t.sub}` : (t.topic || '') });

    const tlas = await select(
        `SELECT x.tla_id, x.week_id, x.tla_name, x.description, x.performed_by, x.class_phase, x.is_lab FROM TeachingAndLearningActivities x ${inPlan}
         ORDER BY co.co_id, x.week_id, x.tla_id`, [offeringId]);
    const assessments = await select(
        `SELECT a.tla_id, a.name, a.period, a.weight, a.min_passing FROM TLAAssessments a INNER JOIN TeachingAndLearningActivities x ON x.tla_id = a.tla_id ${inPlan}
         ORDER BY a.tla_id, a.method_id`, [offeringId]);
    const byTla = new Map();
    for (const a of assessments) byTla.set(a.tla_id, [...(byTla.get(a.tla_id) || []), `assessed by ${join(a.name, a.period, a.weight != null && `${a.weight}%`, a.min_passing != null && `pass ${a.min_passing}`)}`]);
    // Sorted as text: saving an ILO's weights deletes and re-adds its assessments, so their row order is not stable.
    for (const t of tlas) {
        items.set(`tlas:${t.tla_id}`, {
            kind: 'Activity', label: weekLabels.get(t.week_id) || 'Week', week_id: t.week_id,
            text: join(t.tla_name, t.description, t.performed_by, t.class_phase, t.is_lab ? 'lab' : null, ...(byTla.get(t.tla_id) || []).sort())
        });
    }

    const refs = await select(
        `SELECT x.weekly_reference_id, x.week_id, r.title, r.author, substr(CAST(r.publication_year AS TEXT), 1, 4) AS publication_year FROM WeeklyReferences x INNER JOIN \`References\` r ON r.reference_id = x.reference_id ${inPlan}
         ORDER BY co.co_id, x.week_id, x.weekly_reference_id`, [offeringId]);
    for (const r of refs) items.set(`references:${r.weekly_reference_id}`, { kind: 'Reference', label: weekLabels.get(r.week_id) || 'Week', week_id: r.week_id, text: join(r.title, r.author, r.publication_year) });
    return items;
};

const latestSubmission = async (coAssignId) => (await select(
    "SELECT MAX(createdAt) AS at FROM AssignmentWorkflowLogs WHERE co_assign_id = ? AND action_type = 'SUBMITTED'", [coAssignId]))[0]?.at || null;

// Called after a RETURNED action. Parallel returns in one review round (Director and Program Head) keep the first
// copy: the plan cannot have changed in between, the instructor has not resubmitted.
const snapshotOnReturn = async (offeringId, coAssignId) => {
    const existing = await PlanReturnSnapshot.findByPk(offeringId);
    const submitted = await latestSubmission(coAssignId);
    if (existing && submitted && new Date(existing.createdAt) > new Date(submitted)) return existing;
    const payload = JSON.stringify([...(await readPlanItems(offeringId))]);
    if (existing) await existing.destroy();
    return PlanReturnSnapshot.create({ offering_id: offeringId, payload });
};

// { since, changes: [{ key, kind, label, status: added|removed|changed, before, after, yours }] }, or
// { since: null, changes: [] } when the plan was never returned or has not been resubmitted since.
// onlyReferences: the Director of Libraries reviews the references only.
const planChanges = async ({ offeringId, coAssignId, userId, onlyReferences = false }) => {
    const snapshot = await PlanReturnSnapshot.findByPk(offeringId);
    const submitted = await latestSubmission(coAssignId);
    if (!snapshot || !submitted || new Date(submitted) < new Date(snapshot.createdAt)) return { since: null, changes: [] };
    const before = new Map(JSON.parse(snapshot.payload));
    const after = await readPlanItems(offeringId);

    // The viewer's own comments from before the return: on an item (its targets), or on a whole week.
    const mine = userId ? await select(
        `SELECT c.comment_id, c.week_id, c.comment_for, ct.target_id FROM Comments c LEFT JOIN CommentTargets ct ON ct.comment_id = c.comment_id
         WHERE c.co_assign_id = ? AND c.commenter_user_id = ? AND c.createdAt <= ?`, [coAssignId, userId, snapshot.createdAt]) : [];
    const myKeys = new Set(mine.filter(c => c.target_id != null).map(c => `${c.comment_for}:${c.target_id}`));
    const myWeeks = new Set(mine.filter(c => c.target_id == null && c.week_id != null).map(c => c.week_id));

    const changes = [];
    const add = (key, status, was, now) => {
        const item = now || was;
        if (onlyReferences && item.kind !== 'Reference') return;
        changes.push({ key, kind: item.kind, label: item.label, status, before: was?.text ?? null, after: now?.text ?? null,
            yours: myKeys.has(key) || (item.week_id != null && myWeeks.has(item.week_id)) });
    };
    for (const [key, now] of after) {
        const was = before.get(key);
        if (!was) add(key, 'added', null, now);
        else if (was.text !== now.text) add(key, 'changed', was, now);
    }
    for (const [key, was] of before) if (!after.has(key)) add(key, 'removed', was, null);
    return { since: snapshot.createdAt, resubmitted: submitted, changes };
};

module.exports = { readPlanItems, snapshotOnReturn, planChanges };
