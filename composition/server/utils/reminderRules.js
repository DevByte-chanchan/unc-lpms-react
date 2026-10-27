'use strict';

// The rules of the automatic reminders. Pure: no database, no clock of their own. Every function that
// needs "now" takes it as an argument, so the tests can use any date without waiting for it.

const { BEFORE_DUE, OVERDUE_EVERY_DAYS, DIGEST_WEEKDAY, DEFAULT_TIMEZONE, SEND_FROM_HOUR } = require('../config/reminders');

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
const reminderText = (courseCode, days) => {
    const when = days > 1 ? `due in ${days} days`
        : days === 1 ? 'due tomorrow'
            : days === 0 ? 'due today'
                : `${-days} day${days === -1 ? '' : 's'} overdue`;
    return `reminder: submit your learning plan (${when})`;
};

// May the job send anything yet today? Not before the school day starts.
const isSendingHour = (clock) => clock.hour >= SEND_FROM_HOUR;

const isDigestDay = (clock) => clock.weekday === DIGEST_WEEKDAY;

const digestText = (notSubmitted, overdue) => {
    const plans = `${notSubmitted} learning plan${notSubmitted === 1 ? '' : 's'} not submitted`;
    return overdue > 0 ? `${plans}, ${overdue} overdue` : plans;
};

module.exports = { timezoneOf, schoolClock, daysUntil, reminderKindFor, reminderText, isSendingHour, isDigestDay, digestText };
