'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { withReviewRounds } = require('./reviewRounds');

const log = (action_type, createdAt) => ({ action_type, createdAt });
const logs = [
    log('ASSIGNED', '2026-06-01T00:00:00Z'),
    log('SUBMITTED', '2026-06-10T00:00:00Z'),
    log('RETURNED', '2026-06-12T00:00:00Z'),
    log('SUBMITTED', '2026-06-20T00:00:00Z'),
    log('RETURNED', '2026-06-22T00:00:00Z'),
    log('SUBMITTED', '2026-06-30T00:00:00Z'),
];

test('each comment belongs to the submission it was written against; returned rounds are marked', () => {
    const rows = withReviewRounds(logs, [
        { id: 1, createdAt: '2026-06-11T00:00:00Z' },
        { id: 2, createdAt: '2026-06-21T00:00:00Z' },
        { id: 3, createdAt: '2026-07-01T00:00:00Z' },
        { id: 4, createdAt: '2026-06-05T00:00:00Z' }, // before any submission: round 1
    ]);
    assert.deepEqual(rows.map(r => [r.id, r.review_round, r.review_returned]), [[1, 1, true], [2, 2, true], [3, 3, false], [4, 1, true]]);
});

test('times written with different offsets still order correctly', () => {
    const rows = withReviewRounds([log('SUBMITTED', '2026-06-10 09:00:00.000 +08:00'), log('SUBMITTED', '2026-06-10 02:00:00.000 +00:00')],
        [{ id: 1, createdAt: '2026-06-10 01:30:00.000 +00:00' }]);
    assert.equal(rows[0].review_round, 1, '09:00 +08:00 is 01:00 UTC, before the comment; 02:00 UTC is after');
});
