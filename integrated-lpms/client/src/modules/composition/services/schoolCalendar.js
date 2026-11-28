/**
 * School calendar constants for the term timeline.
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

export const CALENDAR_FIELDS = Object.freeze([
    'classes_start', 'prelim_exam', 'midterm_exam', 'semifinal_exam', 'final_exam'
]);
