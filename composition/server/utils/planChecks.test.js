'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { runChecks, weeklyHours } = require('./planChecks');

const week = (number, hours = 5, topics = 3) => ({ number, hours, topics });
const good = {
    contactHrs: '2 Hrs Lec, 3 Hrs Lab',
    cos: [
        // 16 teaching weeks: a semester is 18 with the exams.
        { id: 1, label: 'CO1', weeks: Array.from({ length: 8 }, (_, i) => week(i + 1)), ilos: 2, assessments: 3 },
        { id: 2, label: 'CO2', weeks: Array.from({ length: 8 }, (_, i) => week(i + 9)), ilos: 1, assessments: 1 },
    ],
    periods: ['p', 'm', 's', 'f'],
};
const byKey = (checks) => Object.fromEntries(checks.map(c => [c.key, c]));

test('weekly contact hours are read from the course', () => {
    assert.equal(weeklyHours('2 Hrs Lec, 3 Hrs Lab'), 5);
    assert.equal(weeklyHours('3 Hrs Lec, 0 Hrs Lab'), 3);
    assert.equal(weeklyHours(''), null);
});

test('a complete plan passes every check', () => {
    const checks = runChecks(good);
    assert.deepEqual(checks.map(c => c.ok), [true, true, true, true]);
    assert.match(byKey(checks).hours.detail, /80 of 80 hours in all/);
    assert.match(byKey(checks).weeks.detail, /^16 teaching weeks\./);
});

test('each problem is named: hours, empty weeks, uncovered outcomes, missing exam periods', () => {
    const checks = byKey(runChecks({
        ...good,
        cos: [
            { id: 1, label: 'CO1', weeks: [week(1), week(2, 3), week(3, null, 0)], ilos: 2, assessments: 0 },
            { id: 2, label: 'CO2', weeks: [], ilos: 0, assessments: 0 },
        ],
        periods: ['p', 'm'],
    }));
    assert.equal(checks.hours.ok, false);
    assert.match(checks.hours.detail, /week 2 \(3 h\), week 3 \(no hours\)/);
    assert.match(checks.hours.detail, /8 of 80 hours in all/);
    assert.match(checks.weeks.detail, /3 weeks; a semester has 16 teaching weeks/);
    assert.match(checks.weeks.detail, /without topics: week 3/);
    assert.match(checks.coverage.detail, /CO1: no assessment;/);
    assert.match(checks.coverage.detail, /CO2: no week, no ILO, no assessment\./);
    assert.match(checks.periods.detail, /Semi-final, Final/);
});
