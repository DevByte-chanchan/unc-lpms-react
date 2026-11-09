'use strict';

// What a review record is built from besides the workflow log: the comments, the label of the week each
// one refers to (CO2 · Week 5), and the title of each reference, topic or activity it points at. For an approved
// plan these are frozen when the Dean approves (ReviewRecordSnapshots), so a later rename or renumbering
// cannot change what was approved. Plans still under review are always read live.

const { sequelize, Sequelize, Comment, ReviewRecordSnapshot } = require('../models');
const { assignmentChain } = require('./effectiveLogs');

const select = (sql, replacements = []) =>
    sequelize.query(sql, { replacements, type: Sequelize.QueryTypes.SELECT });

// Comments sit on a week (weekly planner). Label: CO n and the week's number across the plan, the
// same running count the planner shows. Map(week_id -> 'CO2 · Week 5').
const buildIloLabels = async (offeringId) => {
    const rows = await select(
        `SELECT co.co_id, w.week_id
         FROM CourseOutcomes co
             INNER JOIN Weeks w ON w.co_id = co.co_id
         WHERE co.pc_offering_id = ?
         ORDER BY co.co_id ASC, w.week_id ASC;`, [offeringId]);
    const labels = new Map();
    const coNumbers = new Map();
    let weekNumber = 0;
    for (const row of rows) {
        if (!coNumbers.has(row.co_id)) coNumbers.set(row.co_id, coNumbers.size + 1);
        weekNumber += 1;
        labels.set(row.week_id, `CO${coNumbers.get(row.co_id)} · Week ${weekNumber}`);
    }
    return labels;
};

// CommentTargets.target_id: a weekly reference, a subtopic, or a TLA.
const TITLE_SQL = {
    references: 'SELECT wr.weekly_reference_id AS id, r.title FROM WeeklyReferences wr INNER JOIN `References` r ON r.reference_id = wr.reference_id WHERE wr.weekly_reference_id IN',
    topics: "SELECT st.subtopic_id AS id, CASE WHEN st.title IS NULL OR st.title = '' THEN tp.title ELSE tp.title || ': ' || st.title END AS title FROM Subtopics st INNER JOIN Topics tp ON tp.topic_id = st.topic_id WHERE st.subtopic_id IN",
    tlas: 'SELECT tla_id AS id, tla_name AS title FROM TeachingAndLearningActivities WHERE tla_id IN',
};

const buildTargetTitles = async (comments) => {
    const targets = new Map();
    const ids = comments.map(comment => comment.comment_id);
    if (ids.length === 0) return targets;
    const rows = await select(`SELECT comment_id, target_id FROM CommentTargets WHERE comment_id IN (${ids.map(() => '?').join(', ')});`, ids);
    const byType = new Map();
    for (const comment of comments) {
        if (!TITLE_SQL[comment.comment_for]) continue;
        const wanted = rows.filter(row => row.comment_id === comment.comment_id).map(row => row.target_id);
        if (wanted.length) byType.set(comment.comment_id, { type: comment.comment_for, ids: wanted });
    }
    for (const type of Object.keys(TITLE_SQL)) {
        const all = [...new Set([...byType.values()].filter(entry => entry.type === type).flatMap(entry => entry.ids))];
        if (all.length === 0) continue;
        const titles = new Map((await select(`${TITLE_SQL[type]} (${all.map(() => '?').join(', ')});`, all)).map(row => [row.id, row.title]));
        for (const [commentId, entry] of byType) {
            if (entry.type !== type) continue;
            targets.set(commentId, entry.ids.map(id => titles.get(id)).filter(Boolean));
        }
    }
    return targets;
};

// The offering whose approval this plan's record is: itself, or the approved one it was carried over from.
const approvedOrigin = async (offeringId) => {
    const seen = new Set();
    let current = Number(offeringId);
    while (current && !seen.has(current)) {
        seen.add(current);
        const [row] = await select('SELECT pc_offering_id, approved_at, carried_from_offering_id FROM ProgramCourseOfferings WHERE pc_offering_id = ?', [current]);
        if (!row) return null;
        if (!row.carried_from_offering_id) return row.approved_at != null ? Number(row.pc_offering_id) : null;
        current = Number(row.carried_from_offering_id);
    }
    return null;
};

// Takes the snapshot of an approved offering if none exists yet. Never overwrites: the first one is the truth.
const freezeReviewRecord = async (offeringId) => {
    if (await ReviewRecordSnapshot.findByPk(offeringId)) return false;
    const [assignment] = await select('SELECT co_assign_id FROM CourseOfferingAssignments WHERE pc_offering_id = ? LIMIT 1', [offeringId]);
    if (!assignment) return false;
    const chain = await assignmentChain(sequelize, assignment.co_assign_id);
    const comments = await Comment.findAll({ where: { co_assign_id: chain }, order: [['createdAt', 'ASC'], ['comment_id', 'ASC']], raw: true });
    const offeringIds = (await select(`SELECT pc_offering_id FROM CourseOfferingAssignments WHERE co_assign_id IN (${chain.map(() => '?').join(', ')})`, chain)).map(r => r.pc_offering_id);
    const iloLabels = new Map();
    for (const id of offeringIds) for (const [iloId, label] of await buildIloLabels(id)) iloLabels.set(iloId, label);
    const targetTitles = await buildTargetTitles(comments);
    await ReviewRecordSnapshot.create({ offering_id: offeringId, payload: JSON.stringify({ comments, iloLabels: [...iloLabels], targetTitles: [...targetTitles] }) });
    return true;
};

const loadSnapshot = async (offeringId) => {
    const row = await ReviewRecordSnapshot.findByPk(offeringId, { raw: true });
    if (!row) return null;
    const data = JSON.parse(row.payload);
    return { comments: data.comments, iloLabels: new Map(data.iloLabels), targetTitles: new Map(data.targetTitles) };
};

module.exports = { buildIloLabels, buildTargetTitles, approvedOrigin, freezeReviewRecord, loadSnapshot };
