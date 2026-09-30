'use strict';

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

test('topic synchronization rejects an existing topic assigned to another ILO before mutation', async () => {
    const restores = [];
    let updated = false;
    let rolledBack = false;
    const transaction = { commit: async () => {}, rollback: async () => { rolledBack = true; } };

    replace(db.sequelize, 'transaction', async () => transaction, restores);
    replace(db.ILOTopic, 'findAll', async ({ where }) => where.topic_id
        ? [{ ilo_topic_id: 22, ilo_id: 2, topic_id: 99 }]
        : [], restores);
    replace(db.Topic, 'update', async () => { updated = true; }, restores);
    replace(db.Subtopic, 'destroy', async () => {}, restores);
    replace(db.Subtopic, 'bulkCreate', async () => {}, restores);
    replace(db.ILOTopic, 'destroy', async () => {}, restores);
    replace(db.ILOTopic, 'bulkCreate', async () => {}, restores);
    replace(db.TopicTLA, 'destroy', async () => {}, restores);

    try {
        const res = responseRecorder();
        await topicController.assignTopicsToILO({
            body: { ilo_id: 1, topics: [{ topic_id: 99, title: 'Foreign topic', subtopics: [] }] }
        }, res);

        assert.equal(res.statusCode, 403);
        assert.deepEqual(res.body, { message: 'A selected topic belongs to another learning outcome.' });
        assert.equal(updated, false);
        assert.equal(rolledBack, true);
    } finally {
        restores.reverse().forEach(restore => restore());
    }
});

test('topic synchronization preserves a topic shared with the target ILO', async () => {
    const restores = [];
    let updated = false;
    const transaction = { commit: async () => {}, rollback: async () => {} };

    replace(db.sequelize, 'transaction', async () => transaction, restores);
    replace(db.ILOTopic, 'findAll', async ({ where }) => {
        if (where.topic_id) {
            return [
                { ilo_topic_id: 21, ilo_id: 1, topic_id: 99 },
                { ilo_topic_id: 22, ilo_id: 2, topic_id: 99 }
            ];
        }
        return [{ ilo_topic_id: 21, ilo_id: 1, topic_id: 99 }];
    }, restores);
    replace(db.Topic, 'update', async () => { updated = true; }, restores);
    replace(db.Subtopic, 'destroy', async () => {}, restores);
    replace(db.Subtopic, 'bulkCreate', async () => {}, restores);
    replace(db.ILOTopic, 'destroy', async () => {}, restores);
    replace(db.ILOTopic, 'bulkCreate', async () => {}, restores);
    replace(db.TopicTLA, 'destroy', async () => {}, restores);

    try {
        const res = responseRecorder();
        await topicController.assignTopicsToILO({
            body: { ilo_id: 1, topics: [{ topic_id: 99, title: 'Shared topic', subtopics: [] }] }
        }, res);

        assert.equal(res.statusCode, 200);
        assert.equal(updated, true);
    } finally {
        restores.reverse().forEach(restore => restore());
    }
});

test('TLA synchronization rejects a foreign TLA before updating it', async () => {
    const restores = [];
    let updated = false;
    let rolledBack = false;
    const transaction = { commit: async () => {}, rollback: async () => { rolledBack = true; } };

    replace(db.sequelize, 'transaction', async () => transaction, restores);
    replace(db.ILOTopic, 'findAll', async () => [{ ilo_topic_id: 10, ilo_id: 1, topic_id: 20 }], restores);
    replace(db.Topic, 'findAll', async () => [{ topic_id: 20, title: 'Owned topic' }], restores);
    replace(db.TopicTLA, 'findOne', async () => null, restores);
    replace(db.TeachingAndLearningActivity, 'update', async () => { updated = true; }, restores);
    replace(db.TLAAssessment, 'findOne', async () => null, restores);
    replace(db.TopicTLA, 'destroy', async () => {}, restores);

    try {
        const res = responseRecorder();
        await tlaController.syncTlasToIlo({
            params: { iloId: '1' },
            body: { tlas: [{ id: 77, tlaName: 'Foreign TLA', selectedTopics: [] }], topicIdMap: {} }
        }, res);

        assert.equal(res.statusCode, 403);
        assert.deepEqual(res.body, { message: 'A selected activity belongs to another learning outcome.' });
        assert.equal(updated, false);
        assert.equal(rolledBack, true);
    } finally {
        restores.reverse().forEach(restore => restore());
    }
});

test('TLA topic bridges are derived from the target ILO instead of client-supplied ids', async () => {
    const restores = [];
    const transaction = { commit: async () => {}, rollback: async () => {} };
    let inserted = [];

    replace(db.sequelize, 'transaction', async () => transaction, restores);
    replace(db.ILOTopic, 'findAll', async () => [{ ilo_topic_id: 10, ilo_id: 1, topic_id: 20 }], restores);
    replace(db.Topic, 'findAll', async () => [{ topic_id: 20, title: 'Owned topic' }], restores);
    replace(db.TeachingAndLearningActivity, 'create', async () => ({ tla_id: 88 }), restores);
    replace(db.TLAAssessment, 'findOne', async () => null, restores);
    replace(db.TopicTLA, 'destroy', async () => {}, restores);
    replace(db.TopicTLA, 'bulkCreate', async rows => { inserted = rows; }, restores);

    try {
        const res = responseRecorder();
        await tlaController.syncTlasToIlo({
            params: { iloId: '1' },
            body: {
                tlas: [{ id: 'new', tlaName: 'Safe TLA', selectedTopics: ['Owned topic'] }],
                topicIdMap: { 'Owned topic': 999 }
            }
        }, res);

        assert.equal(res.statusCode, 200);
        assert.deepEqual(inserted, [{ tla_id: 88, ilo_topic_id: 10 }]);
    } finally {
        restores.reverse().forEach(restore => restore());
    }
});
