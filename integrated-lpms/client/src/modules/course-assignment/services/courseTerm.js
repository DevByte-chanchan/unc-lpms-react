/**
 * Course ↔ academic-term semester matching.
 *
 * A course belongs to the semester named in its own Term string
 * ("1st/2nd Semester …"); the curriculum is otherwise period-scoped, so a
 * course should only surface in the academic term whose semester matches.
 * These helpers are shared by the Courses page and the Course Assignment
 * page so both filter identically.
 */

// Semester (1|2) parsed from a free-form string ("1st/2nd Semester …").
// Returns null when it can't tell.
export const semFromText = (s) => {
  const t = String(s || '').toLowerCase();
  if (/\b(2nd|second)\b/.test(t)) return 2;
  if (/\b(1st|first)\b/.test(t)) return 1;
  return null;
};

// A course's semester comes from its own Term string; fall back to the
// numeric `semester` column when the term is blank.
export const courseSemesterOf = (c) =>
  semFromText(c && c.term) ?? (Number(c && c.semester) === 2 ? 2 : 1);

// The selected academic term's semester (period.semester is "1"/"2"/"Summer").
export const periodSemesterOf = (p) => {
  const s = String((p && p.semester) || '').toLowerCase().trim();
  return (s === '2' || s.includes('2nd') || s.includes('second')) ? 2 : 1;
};

// True when a course belongs in the given academic period (semester match).
export const courseMatchesPeriod = (course, period) =>
  courseSemesterOf(course) === periodSemesterOf(period);
