'use strict';

// What changed since a return: the copy taken at return, a topic edited and a reference removed after it, a
// resubmission, then the differences. Runs on a demo plan of the test database and puts it back. (node run-tests.js)
const test = require('node:test');
const assert = require('node:assert/strict');
const { sequelize, Sequelize, PlanReturnSnapshot, AssignmentWorkflowLog } = require('../models');
const { snapshotOnReturn, planChanges } = require('./planChanges');

const select = (sql, r) => sequelize.query(sql, { replacements: r, type: Sequelize.QueryTypes.SELECT });

test('a resubmitted plan lists only what changed since the return', async (t) => {
    const [row] = await select(
        `SELECT a.co_assign_id, co.pc_offering_id, st.subtopic_id, st.title, wr.weekly_reference_id, wr.week_id, wr.reference_id, wr.is_orientation
         FROM CourseOfferingAssignments a
             INNER JOIN CourseOutcomes co ON co.pc_offering_id = a.pc_offering_id
             INNER JOIN Weeks w ON w.co_id = co.co_id
             INNER JOIN Subtopics st ON st.week_id = w.week_id
             INNER JOIN WeeklyReferences wr ON wr.week_id = w.week_id
         LIMIT 1`);
    if (!row) { t.skip('no demo plan with topics and references'); return; }
    const offeringId = row.pc_offering_id;
    const logs = [];
    const log = async (action_type, at) => logs.push((await AssignmentWorkflowLog.create({ co_assign_id: row.co_assign_id, actor_role: 'INSTRUCTOR', action_type, createdAt: at })).log_id);
    const previous = await PlanReturnSnapshot.findByPk(offeringId, { raw: true });
    try {
        await log('SUBMITTED', new Date(Date.now() - 60000));
        await PlanReturnSnapshot.destroy({ where: { offering_id: offeringId } });
        await snapshotOnReturn(offeringId, row.co_assign_id);
        // A second return in the same round keeps the first copy.
        const first = await PlanReturnSnapshot.findByPk(offeringId);
        await snapshotOnReturn(offeringId, row.co_assign_id);
        assert.equal(String((await PlanReturnSnapshot.findByPk(offeringId)).createdAt), String(first.createdAt));

        // Not resubmitted yet: nothing to show.
        assert.deepEqual((await planChanges({ offeringId, coAssignId: row.co_assign_id })).changes, []);

        await sequelize.query('UPDATE Subtopics SET title = ? WHERE subtopic_id = ?', { replacements: [`${row.title || ''} (edited)`, row.subtopic_id] });
        await sequelize.query('DELETE FROM WeeklyReferences WHERE weekly_reference_id = ?', { replacements: [row.weekly_reference_id] });
        await log('SUBMITTED', new Date(Date.now() + 60000));

        const all = await planChanges({ offeringId, coAssignId: row.co_assign_id });
        const topic = all.changes.find(c => c.key === `topics:${row.subtopic_id}`);
        assert.equal(topic.status, 'changed');
        assert.match(topic.after, /\(edited\)$/);
        assert.equal(all.changes.find(c => c.key === `references:${row.weekly_reference_id}`).status, 'removed');
        assert.equal(all.changes.length, 2);

        const refsOnly = await planChanges({ offeringId, coAssignId: row.co_assign_id, onlyReferences: true });
        assert.deepEqual(refsOnly.changes.map(c => c.kind), ['Reference']);
    } finally {
        await sequelize.query('UPDATE Subtopics SET title = ? WHERE subtopic_id = ?', { replacements: [row.title, row.subtopic_id] });
        await sequelize.query('INSERT OR IGNORE INTO WeeklyReferences (weekly_reference_id, week_id, reference_id, is_orientation, createdAt, updatedAt) VALUES (?, ?, ?, ?, datetime(\'now\'), datetime(\'now\'))',
            { replacements: [row.weekly_reference_id, row.week_id, row.reference_id, row.is_orientation] });
        await AssignmentWorkflowLog.destroy({ where: { log_id: logs } });
        await PlanReturnSnapshot.destroy({ where: { offering_id: offeringId } });
        if (previous) await PlanReturnSnapshot.create(previous);
    }
});

// The same, through the instructor's real Save calls: saving a week's topics (one title edited) and its references
// (unchanged) keeps the row ids, so only the edited topic is listed, not every row as removed and added again.
test('saving through the editor lists only the real edit', async (t) => {
    const { getAssignedTopics, assignTopicsToILO } = require('../controllers/topicController');
    const { assignReferencesToILO } = require('../controllers/iloReferenceController');
    const call = (fn, req) => new Promise((resolve) => {
        const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { resolve({ status: this.statusCode, body }); } };
        fn({ params: {}, query: {}, body: {}, ...req }, res);
    });
    const [row] = await select(
        `SELECT a.co_assign_id, co.pc_offering_id, w.week_id FROM CourseOfferingAssignments a
             INNER JOIN CourseOutcomes co ON co.pc_offering_id = a.pc_offering_id
             INNER JOIN Weeks w ON w.co_id = co.co_id
             INNER JOIN Subtopics st ON st.week_id = w.week_id AND st.is_orientation = 0 AND st.title <> ''
         LIMIT 1`);
    if (!row) { t.skip('no demo plan with titled subtopics'); return; }
    const offeringId = row.pc_offering_id;
    const original = (await call(getAssignedTopics, { params: { weekId: String(row.week_id) } })).body;
    const refIds = (await select('SELECT reference_id FROM WeeklyReferences WHERE week_id = ? AND is_orientation = 0 ORDER BY weekly_reference_id', [row.week_id])).map(r => r.reference_id);
    const logs = [];
    const log = async (at) => logs.push((await AssignmentWorkflowLog.create({ co_assign_id: row.co_assign_id, actor_role: 'INSTRUCTOR', action_type: 'SUBMITTED', createdAt: at })).log_id);
    const previous = await PlanReturnSnapshot.findByPk(offeringId, { raw: true });
    const saveTopics = (topics) => call(assignTopicsToILO, { body: { week_id: row.week_id, topics, is_orientation: false } });
    try {
        await log(new Date(Date.now() - 60000));
        await PlanReturnSnapshot.destroy({ where: { offering_id: offeringId } });
        await snapshotOnReturn(offeringId, row.co_assign_id);

        const edited = JSON.parse(JSON.stringify(original));
        const sub = edited.flatMap(tp => tp.subtopics).find(s => s.title);
        sub.title = `${sub.title} (edited)`;
        assert.equal((await saveTopics(edited)).status, 200);
        assert.equal((await call(assignReferencesToILO, { body: { week_id: row.week_id, reference_ids: refIds, is_orientation: false } })).status, 200);
        await log(new Date(Date.now() + 60000));

        const { changes } = await planChanges({ offeringId, coAssignId: row.co_assign_id });
        assert.deepEqual(changes.map(c => [c.key, c.status]), [[`topics:${sub.subtopic_id}`, 'changed']]);
    } finally {
        await saveTopics(original);
        await AssignmentWorkflowLog.destroy({ where: { log_id: logs } });
        await PlanReturnSnapshot.destroy({ where: { offering_id: offeringId } });
        if (previous) await PlanReturnSnapshot.create(previous);
    }
});
