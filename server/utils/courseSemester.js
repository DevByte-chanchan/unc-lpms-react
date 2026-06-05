/**
 * Backend mirror of src/services/courseTerm.js.
 *
 * A course belongs to the semester named in its own Term string
 * ("1st/2nd Semester …"), falling back to the numeric `semester` column. A
 * period's semester comes from AcademicPeriod.semester. These let server-side
 * catalog reads scope to the ACTIVE term's semester — so a course tagged to a
 * different semester doesn't surface (or Verify) where it shouldn't, keeping
 * Course Assignment / the Consultant picker consistent with the Course
 * Offerings page.
 */
export const semFromText = (s) => {
  const t = String(s || '').toLowerCase();
  if (/\b(2nd|second)\b/.test(t)) return 2;
  if (/\b(1st|first)\b/.test(t)) return 1;
  return null;
};

export const courseSemesterOf = (c) =>
  semFromText(c && c.term) ?? (Number(c && c.semester) === 2 ? 2 : 1);

export const periodSemesterOf = (p) => {
  const s = String((p && p.semester) || '').toLowerCase().trim();
  return (s === '2' || s.includes('2nd') || s.includes('second')) ? 2 : 1;
};
