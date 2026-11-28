/**
 * Term calendar calculations and helpers for the Current Term card.
 * Uses Asia/Manila date for timezone consistency.
 */
import { CALENDAR_ORDER } from './schoolCalendar.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const MANILA_DAY = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

/** Today in Manila as 'YYYY-MM-DD'. */
export const manilaToday = (now = Date.now()) => MANILA_DAY.format(new Date(now));

const dayOf = (v) => (v ? String(v).slice(0, 10) : '');
const toUtc = (day) => {
    const [y, m, d] = day.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
};

/** Whole days between two 'YYYY-MM-DD' dates. */
export const daysBetween = (from, to) => Math.round((toUtc(to) - toUtc(from)) / DAY_MS);

const plural = (n, word) => n + ' ' + word + (n === 1 ? '' : 's');

/** "today", "tomorrow", "in 12 days", or "done" for a past day. */
export const relativeHint = (day, today) => {
    const n = daysBetween(today, day);
    if (n === 0) return 'today';
    if (n === 1) return 'tomorrow';
    if (n > 1) return 'in ' + n + ' days';
    return 'done';
};

/** The five milestone rows on the timeline. */
export const CALENDAR_ROWS = Object.freeze(
    CALENDAR_ORDER.filter((c) => c.key !== 'start_date' && c.key !== 'end_date')
);

/** Teaching weeks: from Start of classes (or start of semester) to End of semester. */
export const termWeeks = (term) => {
    const from = dayOf(term && (term.classes_start || term.start_date));
    const end = dayOf(term && term.end_date);
    if (!from || !end || end < from) return null;
    return Math.max(1, Math.ceil(daysBetween(from, end) / 7));
};

/**
 * Semester progress summary:
 *   { phase: 'before'|'preclass'|'running'|'ended', week, weeks, daysLeft, ratio }
 */
export const termProgress = (term, today) => {
    const start = dayOf(term && term.start_date);
    const end = dayOf(term && term.end_date);
    if (!start || !end || end < start) return null;
    const span = Math.max(1, daysBetween(start, end));
    const ratio = Math.min(1, Math.max(0, daysBetween(start, today) / span));
    if (today < start) return { phase: 'before', days: daysBetween(today, start), ratio: 0 };
    if (today > end) return { phase: 'ended', ratio: 1 };
    const daysLeft = daysBetween(today, end);
    const classes = dayOf(term.classes_start);
    if (classes && today < classes) {
        return { phase: 'preclass', days: daysBetween(today, classes), daysLeft, ratio };
    }
    const from = classes || start;
    const weeks = termWeeks(term);
    const week = Math.min(weeks, Math.floor(daysBetween(from, today) / 7) + 1);
    return { phase: 'running', week, weeks, daysLeft, ratio };
};

export const progressText = (p) => {
    if (!p) return null;
    if (p.phase === 'before') {
        return { strong: p.days === 1 ? 'Starts tomorrow' : 'Starts in ' + plural(p.days, 'day') };
    }
    if (p.phase === 'ended') return { strong: 'Ended', rest: 'closes automatically' };
    const left = p.daysLeft === 0 ? 'last day' : plural(p.daysLeft, 'day') + ' left';
    if (p.phase === 'preclass') {
        return {
            strong: p.days === 1 ? 'Classes start tomorrow' : 'Classes start in ' + plural(p.days, 'day'),
            rest: left,
        };
    }
    return { strong: 'Week ' + p.week + ' of ' + p.weeks, rest: left };
};

/**
 * The timeline rows. Each has: { key, label, day, state, hint }
 * where state is 'unset' | 'done' | 'next' | 'upcoming'.
 */
export const calendarRows = (term, today) => {
    let nextTaken = false;
    return CALENDAR_ROWS.map(({ key, label }) => {
        const day = dayOf(term && term[key]);
        if (!day) return { key, label, day: '', state: 'unset', hint: '' };
        let state = 'upcoming';
        if (day < today) state = 'done';
        else if (!nextTaken) {
            state = 'next';
            nextTaken = true;
        }
        return { key, label, day, state, hint: relativeHint(day, today) };
    });
};

export const nextCalendarDate = (term, today) =>
    calendarRows(term, today).find((r) => r.state === 'next') || null;

const PLAIN_LABEL = {
    start_date: 'the start of the semester',
    end_date: 'the end of the semester',
};
const sentenceLabel = (c) => PLAIN_LABEL[c.key] || c.label;

export const calendarChecks = (term) => {
    const lines = [];
    const missing = CALENDAR_ROWS.filter(({ key }) => !dayOf(term && term[key])).map((c) => c.label);
    if (missing.length === 1) lines.push(missing[0] + " isn't set.");
    else if (missing.length > 1) lines.push('Not set: ' + missing.join(', ') + '.');

    let prev = null;
    for (const c of CALENDAR_ORDER) {
        const day = dayOf(term && term[c.key]);
        if (!day) continue;
        if (prev && day < prev.day) {
            const first = sentenceLabel(prev.c);
            lines.push(first.charAt(0).toUpperCase() + first.slice(1) + ' is after ' + sentenceLabel(c) + '.');
            break;
        }
        prev = { day, c };
    }
    return lines;
};
