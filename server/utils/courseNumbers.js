/**
 * Course numbers — every value implied by a course's LEC / LAB units and its
 * hours per week. The Program of Study gives LEC, LAB, TOTAL and Hrs/Week;
 * everything else here is worked out, never typed in and never stored.
 *
 * The one place that does this arithmetic: the PDF parser and its checks, the
 * upload preview, the course API (and through it the course cards and detail
 * page) and later the syllabus module all call it.
 *
 *   courseNumbers({ lec, lab, totalUnits, hrsPerWeek, nonCredit })
 *   fromCourse(course)       the same numbers, read back from the stored
 *                            `credit` ("2 LEC, 1 LAB") and `contact_hrs`
 *                            ("2 Hrs Lec, 3 Hrs Lab") strings; null if they don't parse
 *   formatCredit / formatContactHrs   the stored formats, written by the upload
 *
 * Hours: one lecture unit is one hour a week, so a course with a lab spends
 * `lec` hours in lecture and the rest of its weekly hours in the lab. A course
 * with no lab spends ALL its hours in lecture; NSTP's 3 units / 4 hrs is what the
 * PDF says, and the PDF is the authority, so the hours are kept as given.
 *
 * A non-credit course (SOCARTS, "(2)" in the PDF) carries 0 credit units but
 * its hours still count towards every hour total.
 */
import { WEEKS_PER_SEMESTER, EXAM_WEEKS } from './courseCodeRules.js';

export { WEEKS_PER_SEMESTER, EXAM_WEEKS };

/** Expected lab hours per week for one lab unit. */
export const LAB_HOURS_PER_UNIT = 3;

const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const round2 = (n) => Math.round(n * 100) / 100;

/**
 * @returns null when LEC or Hrs/Week is unknown; otherwise
 * { lec, lab, non_credit, credit_units, total_units, hrs_per_week,
 *   lec_hrs_week, lab_hrs_week, hrs_per_lab_unit,
 *   contact_hrs_semester, lec_hrs_semester, lab_hrs_semester,
 *   instructional_hrs, weeks_per_semester, exam_weeks }
 */
export function courseNumbers({ lec, lab, totalUnits, hrsPerWeek, nonCredit = false } = {}) {
  const L = num(lec);
  const B = num(lab) ?? 0;
  const H = num(hrsPerWeek);
  if (L === null || H === null) return null;
  const nc = !!nonCredit;
  const hasLab = B > 0;
  const labHrs = hasLab ? Math.max(0, H - L) : 0;
  const lecHrs = hasLab ? Math.min(L, H) : H;
  return {
    lec: L,
    lab: B,
    non_credit: nc,
    credit_units: nc ? 0 : L + B,
    // What the PDF's TOTAL column said (null when not given). Kept so the row
    // check can compare it with lec + lab.
    total_units: num(totalUnits),
    hrs_per_week: H,
    lec_hrs_week: lecHrs,
    lab_hrs_week: labHrs,
    hrs_per_lab_unit: hasLab ? round2(labHrs / B) : null,
    contact_hrs_semester: H * WEEKS_PER_SEMESTER,
    lec_hrs_semester: lecHrs * WEEKS_PER_SEMESTER,
    lab_hrs_semester: labHrs * WEEKS_PER_SEMESTER,
    instructional_hrs: H * (WEEKS_PER_SEMESTER - EXAM_WEEKS),
    weeks_per_semester: WEEKS_PER_SEMESTER,
    exam_weeks: EXAM_WEEKS,
  };
}

/** "2 LEC, 1 LAB"; a non-credit course keeps its units in brackets: "(2) LEC, 0 LAB". */
export function formatCredit({ lec, lab, nonCredit = false }) {
  const L = num(lec) ?? 0;
  const B = num(lab) ?? 0;
  return (nonCredit ? '(' + L + ')' : String(L)) + ' LEC, ' + B + ' LAB';
}

/** "2 Hrs Lec, 3 Hrs Lab", or "3 Hrs Lec" for a course without a lab. */
export function formatContactHrs({ lec, lab, hrsPerWeek }) {
  const n = courseNumbers({ lec, lab, hrsPerWeek });
  if (!n) return null;
  return n.lab > 0
    ? n.lec_hrs_week + ' Hrs Lec, ' + n.lab_hrs_week + ' Hrs Lab'
    : n.lec_hrs_week + ' Hrs Lec';
}

const CREDIT_RE = /^\s*(\(?)\s*(\d+(?:\.\d+)?)\s*\)?\s*LEC\s*(?:,\s*(\d+(?:\.\d+)?)\s*LAB)?\s*$/i;
const HOURS_RE = /^\s*(\d+(?:\.\d+)?)\s*Hrs?\s*Lec\s*(?:,\s*(\d+(?:\.\d+)?)\s*Hrs?\s*Lab)?\s*$/i;

/** The numbers for a stored course, or null when its strings aren't in the fixed format. */
export function fromCourse(course) {
  if (!course) return null;
  const c = String(course.credit || '').match(CREDIT_RE);
  const h = String(course.contact_hrs || '').match(HOURS_RE);
  if (!c || !h) return null;
  const nonCredit = c[1] === '(';
  const lec = Number(c[2]);
  const lab = c[3] !== undefined ? Number(c[3]) : 0;
  const hrsPerWeek = Number(h[1]) + (h[2] !== undefined ? Number(h[2]) : 0);
  return courseNumbers({ lec, lab, hrsPerWeek, nonCredit });
}
