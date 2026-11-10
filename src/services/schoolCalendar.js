/**
 * School calendar rules on the client — the term form's live validation. Mirrors
 * server/utils/schoolCalendar.js (the server re-checks on save and is the source
 * of truth); keep the two in step.
 */

export const CALENDAR_ORDER = Object.freeze([
  { key: 'start_date',     label: 'Start of semester' },
  { key: 'classes_start',  label: 'Start of classes' },
  { key: 'prelim_exam',    label: 'Prelim exam' },
  { key: 'midterm_exam',   label: 'Midterm exam' },
  { key: 'semifinal_exam', label: 'Semi-final exam' },
  { key: 'final_exam',     label: 'Final exam' },
  { key: 'end_date',       label: 'End of semester' },
]);

/** Every date field on a term form, blank. */
export const BLANK_TERM_DATES = Object.freeze({
  start_date: '', end_date: '',
  classes_start: '', prelim_exam: '', midterm_exam: '', semifinal_exam: '', final_exam: '',
});

/** The term's date fields as form values ('YYYY-MM-DD' or ''). */
export const termDatesOf = (p) => {
  const out = {};
  for (const k of Object.keys(BLANK_TERM_DATES)) out[k] = p && p[k] ? String(p[k]).slice(0, 10) : '';
  return out;
};

/** The form's date fields for the API ('' → null). */
export const termDatesPayload = (buf) => {
  const out = {};
  for (const k of Object.keys(BLANK_TERM_DATES)) out[k] = (buf && buf[k]) || null;
  return out;
};

/** { key, message } for the first pair of dates out of order, else null. Blank fields are skipped. */
export function calendarOrderIssue(values) {
  const v = values || {};
  let prev = null;
  for (const { key, label } of CALENDAR_ORDER) {
    const day = v[key] ? String(v[key]).slice(0, 10) : '';
    if (!day) continue;
    if (prev && day < prev.day) return { key, message: label + ' must be on or after ' + prev.label + '.' };
    prev = { day, label };
  }
  return null;
}
