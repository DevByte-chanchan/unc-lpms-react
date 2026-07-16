/**
 * Teaching-Assignment (STRAP) workbook parser.
 *
 * The Program Head can upload the school's raw "TEACHING ASSIGNMENT" export
 * (e.g. STRAP_TA_CS_126-teaching-Assignment.xls) straight into Course
 * Assignment. That file is NOT a flat table — it is grouped BY FACULTY:
 *
 *   SCHOOL OF COMPUTER AND INFORMATION SCIENCES
 *   TEACHING ASSIGNMENT (AS OF Jul 15 2026)
 *   1st Sem S/Y 2026-2027
 *   0675 - ALEGRE AMY A.        Category: PART TIME B     <- faculty header
 *     Code | Course No | Course Description | Units | ... | Schedule | Room
 *     3152 | LIS214L-P7a | Organization of Information... | 3 | ...
 *     (continuation rows carry only an extra Schedule/Room for split classes)
 *   (blank row)  <- separates faculty blocks
 *
 * This module detects that shape and flattens it into per-offering rows. It
 * layers NO "lead" concept — the export has none. Each offering carries the
 * faculty whose block it sat in; the upload turns those into CONTRIBUTORS and
 * leaves Lead Faculty empty for the Program Head to set in the system.
 */
import xlsx from 'xlsx';

const FACULTY_HEADER_RE = /^(\d{3,4})\s*-\s*(.+)$/; // "0675 - ALEGRE AMY A."
const isOfferingCode = (v) => typeof v === 'number' && Number.isInteger(v);
const clean = (v) => String(v == null ? '' : v).trim();

/** Split "BIT314L-OBb" -> { baseCode: "BIT314L", section: "OBb" }. */
function splitCourseNo(courseNo) {
  const s = clean(courseNo);
  const dash = s.lastIndexOf('-');
  if (dash <= 0) return { baseCode: s, section: '' };
  return { baseCode: s.slice(0, dash), section: s.slice(dash + 1) };
}

function readMatrix(filePath) {
  const workbook = xlsx.readFile(filePath, { cellDates: false });
  // Pick the first sheet that actually has rows (Sheet1 is often empty).
  const sheetName = workbook.SheetNames.find((n) => workbook.Sheets[n] && workbook.Sheets[n]['!ref'])
    || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: true });
}

/**
 * Heuristic: does this workbook look like the faculty-grouped teaching
 * assignment (as opposed to a flat Course-Code/Lead-Faculty table)?
 * True when a "#### - NAME" faculty header and a "Code" column header both
 * appear near the top.
 */
export function looksLikeTeachingAssignment(filePath) {
  let matrix;
  try { matrix = readMatrix(filePath); } catch { return false; }
  let sawFacultyHeader = false;
  let sawCodeHeader = false;
  let sawTitle = false;
  const scan = Math.min(matrix.length, 30);
  for (let i = 0; i < scan; i++) {
    const a = clean(matrix[i][0]);
    if (FACULTY_HEADER_RE.test(a)) sawFacultyHeader = true;
    if (/TEACHING ASSIGNMENT/i.test(a)) sawTitle = true;
    if (clean(matrix[i][1]) === 'Code') sawCodeHeader = true;
  }
  return sawFacultyHeader && (sawCodeHeader || sawTitle);
}

/**
 * Flatten the teaching-assignment workbook.
 * Returns { term, faculty[], offerings[] } where each offering is
 *   { code, courseNo, baseCode, section, title, units, schedules[],
 *     facultyNames[] }  — facultyNames are the block faculty (no id prefix).
 * An offering identified by the same Code under multiple faculty blocks unions
 * them (co-teaching), so facultyNames can hold more than one.
 */
export function parseTeachingAssignment(filePath) {
  const matrix = readMatrix(filePath);

  let term = '';
  for (let i = 0; i < Math.min(matrix.length, 6); i++) {
    const a = clean(matrix[i][0]);
    if (FACULTY_HEADER_RE.test(a)) break;
    if (/S\/Y|SEM/i.test(a) && !term) term = a;
  }

  const facultySet = new Set();
  const offeringsByCode = new Map();
  let currentName = null;
  let lastOffering = null;

  for (const r of matrix) {
    const a = clean(r[0]);
    const m = a.match(FACULTY_HEADER_RE);
    if (m) {
      currentName = clean(m[2]);        // "ALEGRE AMY A." (id dropped)
      facultySet.add(currentName);
      lastOffering = null;
      continue;
    }
    if (clean(r[1]) === 'Code') continue; // column header row

    if (isOfferingCode(r[1]) && currentName) {
      const code = String(r[1]);
      let off = offeringsByCode.get(code);
      if (!off) {
        const { baseCode, section } = splitCourseNo(r[2]);
        off = {
          code,
          courseNo: clean(r[2]),
          baseCode,
          section,
          title: clean(r[3]),
          units: clean(r[4]),
          schedules: [],
          facultyNames: [],
        };
        offeringsByCode.set(code, off);
      }
      if (!off.facultyNames.includes(currentName)) off.facultyNames.push(currentName);
      const sched = clean(r[9]);
      if (sched) off.schedules.push(sched);
      lastOffering = off;
    } else if (currentName && lastOffering && clean(r[9])) {
      // Continuation row: an extra schedule for the last offering.
      lastOffering.schedules.push(clean(r[9]));
    }
  }

  return {
    term,
    faculty: [...facultySet],
    offerings: [...offeringsByCode.values()],
  };
}

/**
 * Course-code prefixes that belong to a program, derived from its code:
 *   BSIT -> ["BSIT", "BIT"]   (BS Information Technology -> BIT courses)
 *   BSCS -> ["BSCS", "BCS"]   (BS Computer Science       -> BCS courses)
 * The "BS"→"B" collapse matches the school's course-numbering convention. The
 * program's own code is kept as a candidate too, so a program whose courses are
 * prefixed with its full code still matches.
 */
export function programCoursePrefixes(programCode) {
  const c = String(programCode || '').toUpperCase().trim();
  const set = new Set();
  if (c) {
    set.add(c);
    if (c.startsWith('BS') && c.length > 2) set.add('B' + c.slice(2));
    if (c.startsWith('AB') && c.length > 2) set.add(c.slice(1));
  }
  return [...set];
}

/** THIRD YEAR from a code like "BIT314L" (the first digit after the letters). */
export function yearLevelFromCode(baseCode) {
  const m = String(baseCode || '').match(/[A-Za-z]+(\d)/);
  if (!m) return '';
  const n = Number(m[1]);
  return { 1: 'FIRST YEAR', 2: 'SECOND YEAR', 3: 'THIRD YEAR', 4: 'FOURTH YEAR' }[n] || '';
}

/**
 * Turn a parsed teaching-assignment into flat, program-filtered rows ready for
 * the Course Assignment upload — ONE row per base course (sections merged),
 * faculty gathered as contributor names, no lead.
 *
 *   { course_code, course_name, contributor_names[], year_level, sections[] }
 *
 * `prefixes` (from programCoursePrefixes) keeps only this program's courses.
 * Pass an empty/undefined prefixes list to keep everything.
 */
export function extractProgramAssignments(parsed, prefixes) {
  const pfx = (prefixes || []).map((p) => p.toUpperCase());
  const keep = (baseCode) =>
    pfx.length === 0 || pfx.some((p) => String(baseCode).toUpperCase().startsWith(p));

  const groups = new Map(); // BASECODE -> { course_code, course_name, names:Set, sections:Set }
  for (const o of parsed.offerings) {
    if (!keep(o.baseCode)) continue;
    const key = o.baseCode.toUpperCase();
    let g = groups.get(key);
    if (!g) {
      g = { course_code: o.baseCode, course_name: o.title, names: new Set(), sections: new Set() };
      groups.set(key, g);
    }
    if (!g.course_name && o.title) g.course_name = o.title;
    if (o.section) g.sections.add(o.section);
    o.facultyNames.forEach((n) => g.names.add(n));
  }

  return [...groups.values()].map((g) => ({
    course_code: g.course_code,
    course_name: g.course_name,
    contributor_names: [...g.names],
    year_level: yearLevelFromCode(g.course_code),
    sections: [...g.sections],
  }));
}
