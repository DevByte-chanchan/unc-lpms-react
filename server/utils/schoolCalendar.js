/**
 * The term's school calendar: which dates it has and the order they must fall
 * in. Pure: no database, no imports (tests/schoolCalendar.test.js).
 *
 * Dates are calendar days, 'YYYY-MM-DD' strings (what DATEONLY columns hold).
 */

/** The term's calendar, in the order the dates must fall. */
export const CALENDAR_ORDER = Object.freeze([
  { key: 'start_date',     label: 'Start of semester' },
  { key: 'classes_start',  label: 'Start of classes' },
  { key: 'prelim_exam',    label: 'Prelim exam' },
  { key: 'midterm_exam',   label: 'Midterm exam' },
  { key: 'semifinal_exam', label: 'Semi-final exam' },
  { key: 'final_exam',     label: 'Final exam' },
  { key: 'end_date',       label: 'End of semester' },
]);

export const CALENDAR_FIELDS = Object.freeze(['classes_start', 'prelim_exam', 'midterm_exam', 'semifinal_exam', 'final_exam']);

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 'YYYY-MM-DD' for a DATEONLY value (string or Date), else null. */
export function ymd(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const s = value.slice(0, 10);
    return YMD.test(s) ? s : null;
  }
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** A real calendar day? ('2026-02-30' is not.) */
export function isValidDay(s) {
  const m = YMD.exec(String(s || ''));
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toISOString().slice(0, 10) === s;
}

/**
 * null when the calendar is in order, else a message naming the two fields:
 *   start_date ≤ classes_start ≤ prelim ≤ midterm ≤ semifinal ≤ final ≤ end_date
 * Blank fields are skipped (each present date is compared with the nearest
 * present one before it).
 */
export function calendarOrderError(values) {
  const v = values || {};
  let prev = null;
  for (const { key, label } of CALENDAR_ORDER) {
    const raw = v[key];
    if (raw === undefined || raw === null || raw === '') continue;
    const day = ymd(raw);
    if (!day || !isValidDay(day)) return `${label} is not a valid date.`;
    if (prev && day < prev.day) return `${label} must be on or after ${prev.label}.`;
    prev = { day, label };
  }
  return null;
}
