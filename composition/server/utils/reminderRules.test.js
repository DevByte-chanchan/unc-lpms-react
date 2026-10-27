'use strict';

// The rules of the automatic reminders and of the term deadline, with no database and no real clock.
const test = require('node:test');
const assert = require('node:assert/strict');
const rules = require('./reminderRules');
const { validateDeadline } = require('./deadlineValidation');
const config = require('../config/reminders');

test('a reminder is due 7, 3 and 1 days before the due date, and on the day', () => {
    assert.equal(rules.reminderKindFor(7), 'before-7');
    assert.equal(rules.reminderKindFor(3), 'before-3');
    assert.equal(rules.reminderKindFor(1), 'before-1');
    assert.equal(rules.reminderKindFor(0), 'due');
});

test('no reminder on the other days before the due date', () => {
    for (const days of [30, 14, 8, 6, 5, 4, 2]) assert.equal(rules.reminderKindFor(days), null, `${days} days before`);
});

test('after the due date a reminder goes out on every third overdue day', () => {
    for (const overdue of [3, 6, 9, 30]) assert.equal(rules.reminderKindFor(-overdue), 'overdue', `${overdue} days overdue`);
    for (const overdue of [1, 2, 4, 5, 7]) assert.equal(rules.reminderKindFor(-overdue), null, `${overdue} days overdue`);
});

test('a missing or fractional number of days gets no reminder', () => {
    for (const days of [null, undefined, NaN, 2.5, '3']) assert.equal(rules.reminderKindFor(days), null, String(days));
});

test('the schedule comes from the configuration, in one place', () => {
    assert.deepEqual([...config.BEFORE_DUE], [7, 3, 1, 0]);
    assert.equal(config.OVERDUE_EVERY_DAYS, 3);
});

test('daysUntil counts whole calendar days, across month and year ends', () => {
    assert.equal(rules.daysUntil('2026-11-05', '2026-11-02'), 3);
    assert.equal(rules.daysUntil('2026-11-02', '2026-11-02'), 0);
    assert.equal(rules.daysUntil('2026-10-30', '2026-11-02'), -3);
    assert.equal(rules.daysUntil('2027-01-02', '2026-12-31'), 2);
    assert.equal(rules.daysUntil('2028-03-01', '2028-02-28'), 2, '2028 is a leap year');
});

test("the school's day is read in its own time zone, not the server's", () => {
    const instant = new Date('2026-11-01T17:30:00Z'); // 1:30 AM on 2 November in Manila
    assert.deepEqual(rules.schoolClock(instant, 'Asia/Manila'), { day: '2026-11-02', hour: 1, weekday: 1 });
    assert.deepEqual(rules.schoolClock(instant, 'UTC'), { day: '2026-11-01', hour: 17, weekday: 0 });
});

test('nothing is sent before the school day starts, and the digest is on Mondays', () => {
    assert.equal(rules.isSendingHour({ hour: 7 }), false);
    assert.equal(rules.isSendingHour({ hour: 8 }), true);
    assert.equal(rules.isSendingHour({ hour: 23 }), true);
    assert.equal(rules.isDigestDay({ weekday: 1 }), true);
    assert.equal(rules.isDigestDay({ weekday: 2 }), false);
});

test('an unknown time zone falls back to Asia/Manila instead of failing', () => {
    assert.equal(rules.timezoneOf({ LPMS_TIMEZONE: 'Not/AZone' }), 'Asia/Manila');
    assert.equal(rules.timezoneOf({}), 'Asia/Manila');
    assert.equal(rules.timezoneOf({ LPMS_TIMEZONE: 'UTC' }), 'UTC');
});

test('the reminder text says how long is left, with no names or personal data', () => {
    assert.match(rules.reminderText('BIT313L', 7), /due in 7 days/);
    assert.match(rules.reminderText('BIT313L', 1), /due tomorrow/);
    assert.match(rules.reminderText('BIT313L', 0), /due today/);
    assert.match(rules.reminderText('BIT313L', -3), /3 days overdue/);
    assert.match(rules.reminderText('BIT313L', -1), /1 day overdue/);
    assert.equal(rules.digestText(4, 0), '4 learning plans not submitted');
    assert.equal(rules.digestText(1, 1), '1 learning plan not submitted, 1 overdue');
});

// ---- the due date a Program Head or Dean sets ----

const good = { program_id: 3, school_year: '2026-2027', semester: '1st', syllabus_due: '2026-11-15' };

test('a valid deadline is accepted and normalised', () => {
    const result = validateDeadline({ ...good, program_id: '3', syllabus_due: ' 2026-11-15 ' });
    assert.equal(result.ok, true);
    assert.deepEqual(result.values, good);
});

test('each field is checked', () => {
    assert.ok(validateDeadline({ ...good, school_year: '2026-2028' }).errors.school_year);
    assert.ok(validateDeadline({ ...good, school_year: '26-27' }).errors.school_year);
    assert.ok(validateDeadline({ ...good, semester: 'Fall' }).errors.semester);
    assert.ok(validateDeadline({ ...good, program_id: 'x' }).errors.program_id);
    assert.ok(validateDeadline({ ...good, program_id: 0 }).errors.program_id);
    for (const bad of ['15/11/2026', '2026-02-30', '2026-13-01', 'soon', '']) assert.ok(validateDeadline({ ...good, syllabus_due: bad }).errors.syllabus_due, bad);
});

test('the due date must fall in or near the school year', () => {
    assert.ok(validateDeadline({ ...good, syllabus_due: '2020-01-01' }).errors.syllabus_due);
    assert.ok(validateDeadline({ ...good, syllabus_due: '2031-01-01' }).errors.syllabus_due);
    assert.equal(validateDeadline({ ...good, semester: '2nd', syllabus_due: '2027-03-01' }).ok, true);
});

test('missing or non-object input is refused without throwing', () => {
    for (const input of [null, undefined, 'x', 5, []]) assert.equal(validateDeadline(input).ok, false);
});
