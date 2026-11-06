'use strict';

// The rules of the automatic reminders. Pure: no database, no clock of their own. Every function that
// needs "now" takes it as an argument, so the tests can use any date without waiting for it.

const { BEFORE_DUE, OVERDUE_EVERY_DAYS, DIGEST_WEEKDAY, APPROVER_WAIT_DAYS, DEAN_WAIT_DAYS, DEFAULT_TIMEZONE, SEND_FROM_HOUR } = require('../config/reminders');

const DAY_MS = 24 * 60 * 60 * 1000;

const timezoneOf = (env = process.env) => {
    const zone = String(env.LPMS_TIMEZONE || '').trim() || DEFAULT_TIMEZONE;
    try { new Intl.DateTimeFormat('en-CA', { timeZone: zone }); return zone; } catch { return DEFAULT_TIMEZONE; }
};

// The date and hour in the school's time zone at the instant `now`: { day: 'YYYY-MM-DD', hour: 0-23, weekday: 0-6 }.
const schoolClock = (now, timeZone = DEFAULT_TIMEZONE) => {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
        timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', weekday: 'short'
    }).formatToParts(now).map(part => [part.type, part.value]));
    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
    return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), weekday };
};

// Whole days from `today` to `due` (both YYYY-MM-DD): 3 = due in three days, 0 = due today, -2 = two days overdue.
const daysUntil = (due, today) => Math.round((Date.parse(`${due}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS);

// The kind of reminder due on a day that is `days` from the due date, or null when none is due that day.
//   before-7, before-3, before-1, due, then overdue on every 3rd day past the due date.
const reminderKindFor = (days) => {
    if (!Number.isInteger(days)) return null;
    if (days >= 0) return BEFORE_DUE.includes(days) ? (days === 0 ? 'due' : `before-${days}`) : null;
    const overdue = -days;
    return overdue % OVERDUE_EVERY_DAYS === 0 ? 'overdue' : null;
};

// The words of a reminder: the course, how long is left, and what to do. No names, no personal data.
// returned: the plan came back to the instructor, so the ask is to resubmit it.
const reminderText = (courseCode, days, returned = false) => {
    const when = days > 1 ? `due in ${days} days`
        : days === 1 ? 'due tomorrow'
            : days === 0 ? 'due today'
                : `${-days} day${days === -1 ? '' : 's'} overdue`;
    return `reminder: ${returned ? 'resubmit' : 'submit'} your learning plan (${when})`;
};

// May the job send anything yet today? Not before the school day starts.
const isSendingHour = (clock) => clock.hour >= SEND_FROM_HOUR;

const isDigestDay = (clock) => clock.weekday === DIGEST_WEEKDAY;

// extras: plans with no due date (so no automatic reminders go out) and plans whose instructor cannot be reminded.
const digestText = (notSubmitted, overdue, { noDueDate = 0, noInstructor = 0 } = {}) => {
    const plans = `${notSubmitted} learning plan${notSubmitted === 1 ? '' : 's'} not submitted`;
    const parts = [plans];
    if (overdue > 0) parts.push(`${overdue} overdue`);
    if (noDueDate > 0) parts.push(`${noDueDate} with no due date, so no reminders`);
    if (noInstructor > 0) parts.push(`${noInstructor} with no active instructor`);
    return parts.join(', ');
};

// Days a plan may wait on a reviewer before they are reminded (and the gap between reminders).
const waitLimitFor = (role) => (role === 'DEAN' ? DEAN_WAIT_DAYS : APPROVER_WAIT_DAYS);

// Is today a day to remind someone whose plan has waited `days` days? On the limit and on every multiple of it.
const isWaitingTrigger = (days, role) => {
    const limit = waitLimitFor(role);
    return Number.isInteger(days) && days >= limit && days % limit === 0;
};

// A database timestamp ('2026-06-01 00:00:00.000 +00:00', or a Date) as a Date.
const asDate = (value) => (value instanceof Date ? value : new Date(String(value).replace(' ', 'T').replace(/ ([+-][0-9]{2}:[0-9]{2})$/, '$1')));

// "3 learning plans are waiting for your review, 1 for 7 days or more"; the Dean also hears of plans
// stalled with another reviewer.
const waitingText = ({ waiting, long, stalled = 0 }) => {
    const plural = (n) => `${n} learning plan${n === 1 ? '' : 's'}`;
    const parts = [];
    if (waiting > 0) parts.push(`${plural(waiting)} ${waiting === 1 ? 'is' : 'are'} waiting for your review${long > 0 ? `, ${long} for ${DEAN_WAIT_DAYS} days or more` : ''}`);
    if (stalled > 0) parts.push(`${plural(stalled)} stalled with another reviewer for ${DEAN_WAIT_DAYS} days or more`);
    return parts.join('; ');
};

module.exports = { waitLimitFor, isWaitingTrigger, asDate, waitingText, timezoneOf, schoolClock, daysUntil, reminderKindFor, reminderText, isSendingHour, isDigestDay, digestText };
