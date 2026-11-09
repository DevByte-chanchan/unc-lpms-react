'use strict';

// Weekly planner: topics, TLAs and assessments belong to a week. A request may not reach another plan's
// rows through ids it sends, and refusals are decided before any transaction opens.
const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../models');
const topicController = require('../controllers/topicController');
const tlaController = require('../controllers/tlaController');

const responseRecorder = () => ({
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
});

const replace = (object, key, value, restores) => {
    const original = object[key];
    object[key] = value;
    restores.push(() => { object[key] = original; });
};

const WEEK = { week_id: 5, co_id: 1 };

test('topic synchronization refuses a topic used by another plan before opening a transaction', async () => {
    const restores = [];
    let opened = false;
    let updated = false;
    replace(db.Week, 'findByPk', async () => WEEK, restores);
    replace(db.sequelize, 'query', async () => [{ topic_id: 99 }], restores);
    replace(db.sequelize, 'transaction', async () => { opened = true; return { commit: async () => {}, rollback: async () => {} }; }, restores);
    replace(db.Topic, 'update', async () => { updated = true; }, restores);
    try {
        const res = responseRecorder();
        await topicController.assignTopicsToILO({ body: { week_id: 5, topics: [{ topic_id: 99, title: 'Foreign topic', subtopics: [] }] }, query: {} }, res);
        assert.equal(res.statusCode, 403);
        assert.deepEqual(res.body, { message: 'A selected topic belongs to another learning plan.' });
        assert.equal(updated, false);
        assert.equal(opened, false);
    } finally {
        restores.reverse().forEach(restore => restore());
    }
});

test('topic synchronization accepts a topic this plan already uses (a continued topic)', async () => {
    const restores = [];
    let committed = false;
    replace(db.Week, 'findByPk', async () => WEEK, restores);
    replace(db.sequelize, 'query', async () => [], restores);
    replace(db.sequelize, 'transaction', async () => ({ commit: async () => { committed = true; }, rollback: async () => {} }), restores);
    replace(db.Topic, 'update', async () => {}, restores);
    replace(db.Subtopic, 'findAll', async () => [], restores);
    replace(db.Subtopic, 'create', async () => ({ subtopic_id: 1 }), restores);
    replace(db.Subtopic, 'destroy', async () => {}, restores);
    try {
        const res = responseRecorder();
        await topicController.assignTopicsToILO({ body: { week_id: 5, topics: [{ topic_id: 99, title: 'Own topic', subtopics: [] }] }, query: {} }, res);
        assert.equal(res.statusCode, 200);
        assert.equal(committed, true);
    } finally {
        restores.reverse().forEach(restore => restore());
    }
});

test('TLA synchronization never updates a TLA of another week: its id is treated as a new activity', async () => {
    const restores = [];
    let updated = false;
    let created = false;
    replace(db.Week, 'findByPk', async () => WEEK, restores);
    replace(db.IntendedLearningOutcome, 'findAll', async () => [{ ilo_id: 3 }], restores);
    replace(db.CourseOutcome, 'findByPk', async () => null, restores);
    replace(db.sequelize, 'transaction', async () => ({ commit: async () => {}, rollback: async () => {} }), restores);
    replace(db.TeachingAndLearningActivity, 'findAll', async () => [], restores);
    replace(db.TeachingAndLearningActivity, 'update', async () => { updated = true; }, restores);
    replace(db.TeachingAndLearningActivity, 'create', async () => { created = true; return { tla_id: 500 }; }, restores);
    replace(db.TLAAssessment, 'findOne', async () => null, restores);
    try {
        const res = responseRecorder();
        await tlaController.syncTlasToIlo({ params: { weekId: '5' }, body: { tlas: [{ id: 77, tlaName: 'Foreign TLA' }] }, query: {} }, res);
        assert.equal(res.statusCode, 200);
        assert.equal(updated, false);
        assert.equal(created, true);
    } finally {
        restores.reverse().forEach(restore => restore());
    }
});

test('TLA synchronization refuses an assessment naming an ILO of another course outcome, before any write', async () => {
    const restores = [];
    let opened = false;
    replace(db.Week, 'findByPk', async () => WEEK, restores);
    replace(db.IntendedLearningOutcome, 'findAll', async () => [{ ilo_id: 3 }], restores);
    replace(db.sequelize, 'transaction', async () => { opened = true; return { commit: async () => {}, rollback: async () => {} }; }, restores);
    try {
        const res = responseRecorder();
        await tlaController.syncTlasToIlo({
            params: { weekId: '5' },
            body: { tlas: [{ id: 1, tlaName: 'Quiz', assessmentType: 'Quiz', assessmentPeriod: 'p', assessmentWeight: '20', assessmentIloId: 42 }] },
            query: {}
        }, res);
        assert.equal(res.statusCode, 400);
        assert.match(res.body.message, /not part of this week's course outcome/);
        assert.equal(opened, false);
    } finally {
        restores.reverse().forEach(restore => restore());
    }
});
