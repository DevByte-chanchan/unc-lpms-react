'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseTerm } = require('./offeringBackfill');

test('school year and semester are read from the course term text', () => {
    assert.deepEqual(parseTerm('1st Semester SY 2026-2027'), { schoolYear: '2026-2027', semester: '1st' });
    assert.deepEqual(parseTerm('2nd Semester SY 2025 - 2026'), { schoolYear: '2025-2026', semester: '2nd' });
    assert.deepEqual(parseTerm('Summer SY 2026-2027'), { schoolYear: '2026-2027', semester: 'Summer' });
});

test('an unreadable term yields nothing rather than a guess', () => {
    assert.deepEqual(parseTerm(''), { schoolYear: null, semester: null });
    assert.deepEqual(parseTerm(null), { schoolYear: null, semester: null });
    assert.deepEqual(parseTerm('Fall 2026'), { schoolYear: null, semester: null });
});
