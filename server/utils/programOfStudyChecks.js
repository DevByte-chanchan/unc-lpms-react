/**
 * Checks the system works out from a parsed Program of Study. They are preview
 * warnings, never a hard stop: the PDF is the authority, so its numbers are
 * imported as printed even when a check disagrees with them.
 *
 *   row total        lec + lab must equal the TOTAL column
 *   lab-hour ratio   a lab unit is 3 hours a week
 *   lecture-only     a course with no lab should meet LEC hours a week (note only)
 *   semester totals  the rows add up to that semester's Total row
 *   program total    all years add up to "TOTAL NUMBER OF UNITS" (only when
 *                    every year level has been uploaded)
 *   prerequisites    each code exists in the PDF and comes from an earlier semester
 *
 * Input is one or more parsed files (utils/programOfStudyParser.js), so the two
 * halves of a program (1st–2nd year, 3rd–4th year) are checked as one.
 */
import { courseNumbers, LAB_HOURS_PER_UNIT } from './courseNumbers.js';
import { isStandingRequirement, yearLabel, semesterLabel } from './programOfStudyParser.js';
import { yearLevelFromCode } from './courseCodeRules.js';

const key = (code) => String(code || '').trim().toUpperCase();
const order = (c) => (c.year - 1) * 3 + (c.semester - 1);
const where = (c) => yearLabel(c.year) + ' · ' + semesterLabel(c.semester);

/** Numbers for one parsed row. */
export const numbersOfRow = (c) => courseNumbers({
  lec: c.lec, lab: c.lab, totalUnits: c.total, hrsPerWeek: c.hrs, nonCredit: c.nonCredit,
});

const yearOfCode = (code) => {
  const y = yearLevelFromCode(code);
  const m = String(y || '').match(/^(FIRST|SECOND|THIRD|FOURTH)/);
  return m ? ({ FIRST: 1, SECOND: 2, THIRD: 3, FOURTH: 4 })[m[1]] : null;
};

/**
 * @param files     parsed Program of Study files
 * @param prefixes  the program's own code prefixes (BSIT → ['BSIT', 'BIT']):
 *                  a missing prerequisite with another prefix is General Education
 * @param programCode for wording only ("isn't a BSIT course")
 * @returns { rows: Map(CODE → [{ field, level, message }]), semesters: [...], years: [...],
 *            program: { checked, expected, actual, ok, message } }
 */
export function checkProgramOfStudy(files, { prefixes = [], programCode = 'program' } = {}) {
  const courses = files.flatMap((f) => f.courses);
  const byCode = new Map(courses.map((c) => [key(c.code), c]));
  const covered = new Set(files.flatMap((f) => f.years_covered || []));
  const rows = new Map();
  const add = (c, field, level, message) => {
    const k = key(c.code);
    if (!rows.has(k)) rows.set(k, []);
    rows.get(k).push({ field, level, message });
  };
  const owned = (code) => prefixes.some((p) => key(code).startsWith(key(p)));

  for (const c of courses) {
    const n = numbersOfRow(c);
    if (c.total !== null && c.lec + c.lab !== c.total) {
      add(c, 'Units', 'warning', c.code + ': ' + c.lec + ' + ' + c.lab + ' ≠ ' + c.total + ' in the PDF.');
    }
    if (n && n.lab > 0 && n.hrs_per_lab_unit !== LAB_HOURS_PER_UNIT) {
      add(c, 'Hours', 'warning', c.code + ': ' + n.lab + ' lab unit' + (n.lab === 1 ? '' : 's') + ' but '
        + n.lab_hrs_week + ' lab hour' + (n.lab_hrs_week === 1 ? '' : 's') + '/week (expected '
        + (n.lab * LAB_HOURS_PER_UNIT) + '). Check the PDF.');
    }
    if (n && n.lab === 0 && c.hrs !== null && c.hrs !== c.lec) {
      add(c, 'Hours', 'info', c.code + ': ' + c.lec + ' unit' + (c.lec === 1 ? '' : 's') + ' but ' + c.hrs
        + ' hrs/week. Kept as printed.');
    }
    for (const p of c.prerequisites || []) {
      if (isStandingRequirement(p)) continue;
      const pre = byCode.get(key(p));
      if (!pre) {
        if (!owned(p)) {
          add(c, 'Prerequisites', 'info', c.code + ' lists ' + p + ', which isn\'t a ' + programCode + ' course (General Education). OK.');
        } else {
          const y = yearOfCode(p);
          // Its year level isn't in the files uploaded: nothing to check it against.
          if (y && !covered.has(y)) continue;
          add(c, 'Prerequisites', 'warning', c.code + ' lists ' + p + ', which isn\'t in the Program of Study.');
        }
        continue;
      }
      if (order(pre) >= order(c)) {
        add(c, 'Prerequisites', 'warning', c.code + ': prerequisite ' + pre.code + ' is in ' + where(pre)
          + ', not an earlier semester.');
      }
    }
  }

  const semesters = [];
  const years = [];
  for (const f of files) {
    for (const y of f.years) {
      const yt = { year: y.year, label: yearLabel(y.year), courses: 0, units: 0, hrs: 0 };
      for (const s of y.semesters) {
        const sum = { lec: 0, lab: 0, total: 0, hrs: 0 };
        for (const c of s.courses) {
          if (!c.nonCredit) { sum.lec += c.lec; sum.lab += c.lab; sum.total += (c.total ?? c.lec + c.lab); }
          sum.hrs += c.hrs || 0;
        }
        const issues = [];
        if (s.totals) {
          for (const [k, label] of [['lec', 'LEC'], ['lab', 'LAB'], ['total', 'TOTAL'], ['hrs', 'Hrs/Week']]) {
            if (s.totals[k] !== null && s.totals[k] !== undefined && s.totals[k] !== sum[k]) {
              issues.push(label + ' adds up to ' + sum[k] + ', but the Total row says ' + s.totals[k] + '.');
            }
          }
        } else {
          issues.push('No Total row was found to check against.');
        }
        semesters.push({ year: y.year, semester: s.semester, label: yearLabel(y.year) + ' · ' + semesterLabel(s.semester), sum, totals: s.totals, ok: issues.length === 0, issues });
        yt.courses += s.courses.length;
        yt.units += sum.total;
        yt.hrs += sum.hrs;
      }
      years.push(yt);
    }
  }

  const expected = files.map((f) => f.programTotal).find((v) => v !== null && v !== undefined) ?? null;
  const allYears = covered.size > 0 && [1, 2, 3, 4].every((y) => covered.has(y));
  const actual = years.reduce((n, y) => n + y.units, 0);
  let program;
  if (!allYears) {
    program = { checked: false, expected, actual, ok: null, message: 'Program total checked only when all years are uploaded.' };
  } else if (expected === null) {
    program = { checked: false, expected, actual, ok: null, message: 'The PDF has no TOTAL NUMBER OF UNITS line to check against.' };
  } else {
    program = {
      checked: true, expected, actual, ok: expected === actual,
      message: expected === actual
        ? 'Program total: ' + actual + ' units, matching the PDF.'
        : 'Program total: the years add up to ' + actual + ' units, but the PDF says ' + expected + '.',
    };
  }
  return { rows, semesters, years, program };
}
