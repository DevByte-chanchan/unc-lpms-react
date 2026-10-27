'use strict';

// When the system reminds an instructor to submit their learning plan, relative to the term's
// syllabus due date. These are the defaults the plan uses until the interviews say otherwise.
// Change them here; nothing else needs to change.

// Days before the due date on which a reminder goes out, then the due date itself (0).
const BEFORE_DUE = Object.freeze([7, 3, 1, 0]);

// After the due date: a reminder every this many days overdue (3, 6, 9, ...).
const OVERDUE_EVERY_DAYS = 3;

// A reminder is skipped when the instructor was poked or reminded within this many hours,
// so a person and the system never nag the same day.
const QUIET_HOURS = 20;

// The Program Head's summary of plans not submitted goes out on this weekday (0 = Sunday ... 1 = Monday).
const DIGEST_WEEKDAY = 1;

// The school's time zone. "Today" and "the due date" are days in this zone, not in the server's.
const DEFAULT_TIMEZONE = 'Asia/Manila';

// How often the job wakes up. It is idempotent, so running more often only means a reminder goes
// out sooner after the day starts.
const CHECK_EVERY_MS = 60 * 60 * 1000;

// Reminders go out at or after this hour of the school's day, not at midnight.
const SEND_FROM_HOUR = 8;

module.exports = { BEFORE_DUE, OVERDUE_EVERY_DAYS, QUIET_HOURS, DIGEST_WEEKDAY, DEFAULT_TIMEZONE, CHECK_EVERY_MS, SEND_FROM_HOUR };
