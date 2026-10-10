/**
 * Program Head workbook parsers.
 *
 * Two different school exports land on the same upload buttons, and NEITHER is
 * a flat table:
 *
 * 1. TEACHING ASSIGNMENT (STRAP) — grouped BY FACULTY:
 *
 *      SCHOOL OF COMPUTER AND INFORMATION SCIENCES
 *      TEACHING ASSIGNMENT (AS OF Jul 15 2026)
 *      1st Sem S/Y 2026-2027
 *      0675 - ALEGRE AMY A.        Category: PART TIME B     <- faculty header
 *        Code | Course No | Course Description | Units | ... | Schedule | Room
 *        3152 | LIS214L-P7a | Organization of Information... | 3 | ...
 *        (continuation rows carry only an extra Schedule/Room for split classes)
 *      (blank row)  <- separates faculty blocks
 *
 * 2. SUBJECT OFFERINGS — grouped BY COURSE, one block per section:
 *
 *      SCHOOL OF COMPUTER AND INFORMATION SCIENCES
 *      SUBJECT OFFERINGS
 *      First Sem S/Y 2026-2027
 *
 *      CODE | COURSE NO | DESCRIPTION | UNIT(S) | TIME | DAYS | FACULTY | ROOM
 *      3065 | BIT213L-OBa | Object-Oriented Programming | 4 | 06:30PM-08:30PM | W |      | VR1
 *           | BIT213L-OBaL|                             |   | 11:00AM-02:00PM | TH| CASIMERO DANNY BOY | JH-27
 *           | BIT213L-OBaL|                             |   | 11:00AM-02:00PM | M | CASIMERO DANNY BOY | JH-23
 *
 *    Here CODE is a numeric OFFER ID, not a course code — the course code is in
 *    COURSE NO. A row with a blank CODE is a CONTINUATION of the row above it:
 *    a lab meeting when its section carries a trailing `L`, a second lecture day
 *    when the course no repeats. Lecture rows are often missing the faculty name
 *    that the lab row carries, so faculty is unioned across the whole block.
 *
 * Both parsers flatten to the SAME intermediate shape, so everything downstream
 * (extractProgramAssignments, the upload controllers) is written once:
 *
 *   { term, faculty[], offerings: [{ code, courseNo, baseCode, section,
 *                                    title, units, schedules[], facultyNames[] }] }
 *
 * Neither layers a "lead faculty" concept — the exports have none. The upload
 * turns block faculty into CONTRIBUTORS and leaves Lead Faculty empty for the
 * Program Head to set in the system.
 *
 * The code-reading rules themselves (which prefix belongs to which program, what
 * the three digits mean, which program a section belongs to) live in
 * utils/courseCodeRules.js so both upload paths read a code identically.
 */
import xlsx from 'xlsx';
import { canonicalize } from './excelParser.js';
import { semFromText } from './courseSemester.js';
import {
  OWNED_PREFIXES,
  clean,
  numericOrNull,
  splitCourseNo,
  stripLabSuffix,
  normalizeCourseNo,
  yearLevelFromCode,
  semesterFromCode,
  programFromSection,
  programCoursePrefixes,
  programKeyFromPrefixes,
  isOwnedPrefix,
  matchesPrefixes,
} from './courseCodeRules.js';

// Re-exported so existing importers keep working — these used to live here.
export { programCoursePrefixes, yearLevelFromCode, splitCourseNo };

const FACULTY_HEADER_RE = /^(\d{3,4})\s*-\s*(.+)$/; // "0675 - ALEGRE AMY A."
const isOfferingCode = (v) => typeof v === 'number' && Number.isInteger(v);

/** Add a faculty name once, never an empty one (rule 5). */
function addFacultyName(offering, name) {
  const c = clean(name);
  if (!c) return;
  if (!offering.facultyNames.includes(c)) offering.facultyNames.push(c);
}

/**
 * The worksheet matrix, as an array of arrays.
 *
 * Picks the first sheet that actually has a non-empty cell. `Sheet1` is often
 * present but empty in these exports (and may still carry a `!ref` of `A1`), so
 * "first sheet with a !ref" was not a strong enough test.
 */
export function readMatrix(filePath) {
  const workbook = xlsx.readFile(filePath, { cellDates: false });
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet || !sheet['!ref']) continue;
    const matrix = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: true });
    if (matrix.some((r) => (r || []).some((c) => clean(c) !== ''))) return matrix;
  }
  return [];
}

/* ------------------------------------------------------------------ *
 * 1. TEACHING ASSIGNMENT (STRAP) — grouped by faculty
 * ------------------------------------------------------------------ */

/**
 * Heuristic: does this matrix look like the faculty-grouped teaching
 * assignment (as opposed to SUBJECT OFFERINGS or a flat table)?
 * True when a "#### - NAME" faculty header and a "Code" column header both
 * appear near the top.
 */
export function looksLikeTeachingAssignmentMatrix(matrix) {
  let sawFacultyHeader = false;
  let sawCodeHeader = false;
  let sawTitle = false;
  const scan = Math.min(matrix.length, 30);
  for (let i = 0; i < scan; i++) {
    const a = clean((matrix[i] || [])[0]);
    if (FACULTY_HEADER_RE.test(a)) sawFacultyHeader = true;
    if (/TEACHING ASSIGNMENT/i.test(a)) sawTitle = true;
    if (clean((matrix[i] || [])[1]) === 'Code') sawCodeHeader = true;
  }
  return sawFacultyHeader && (sawCodeHeader || sawTitle);
}

export function looksLikeTeachingAssignment(filePath) {
  try { return looksLikeTeachingAssignmentMatrix(readMatrix(filePath)); } catch { return false; }
}

/**
 * Flatten the teaching-assignment workbook.
 * An offering identified by the same Code under multiple faculty blocks unions
 * them (co-teaching), so facultyNames can hold more than one.
 */
export function parseTeachingAssignmentMatrix(matrix) {
  let term = '';
  for (let i = 0; i < Math.min(matrix.length, 6); i++) {
    const a = clean((matrix[i] || [])[0]);
    if (FACULTY_HEADER_RE.test(a)) break;
    if (/S\/Y|SEM/i.test(a) && !term) term = a;
  }

  const facultySet = new Set();
  const offeringsByCode = new Map();
  const orphans = [];
  let currentName = null;
  let lastOffering = null;

  matrix.forEach((row, i) => {
    const r = row || [];
    const rowNum = i + 1;
    const a = clean(r[0]);
    const m = a.match(FACULTY_HEADER_RE);
    if (m) {
      currentName = clean(m[2]);        // "ALEGRE AMY A." (id dropped)
      facultySet.add(currentName);
      lastOffering = null;
      return;
    }
    if (clean(r[1]) === 'Code') return; // column header row

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
      addFacultyName(off, currentName);
      const sched = clean(r[9]);
      if (sched) off.schedules.push(sched);
      lastOffering = off;
    } else if (currentName && lastOffering && clean(r[9])) {
      // Continuation row: an extra schedule for the last offering.
      lastOffering.schedules.push(clean(r[9]));
    } else if (currentName && !lastOffering && clean(r[9])) {
      // A schedule with nothing above it to belong to — never invented as its
      // own offering, reported instead (rule 4).
      orphans.push({ row: rowNum, courseNo: '', reason: 'no-parent', schedule: clean(r[9]) });
    }
  });

  return {
    term,
    termSemester: semFromText(term),
    faculty: [...facultySet],
    offerings: [...offeringsByCode.values()],
    orphans,
    layout: 'teaching-assignment',
  };
}

export function parseTeachingAssignment(filePath) {
  return parseTeachingAssignmentMatrix(readMatrix(filePath));
}

/* ------------------------------------------------------------------ *
 * 2. SUBJECT OFFERINGS — grouped by course
 * ------------------------------------------------------------------ */

/** Header spellings this layout is allowed to use, per logical column. */
export const COLUMN_ALIASES = Object.freeze({
  code:        ['code', 'offercode', 'offerid'],
  courseNo:    ['courseno', 'coursenumber', 'coursecode', 'subjectcode'],
  description: ['description', 'coursedescription', 'coursetitle', 'coursename', 'title', 'subject'],
  units:       ['units', 'unit'],              // canonicalize() turns "UNIT(S)" into "units"
  time:        ['time', 'times', 'schedule'],
  days:        ['days', 'day'],
  faculty:     ['faculty', 'facultyname', 'instructor', 'instructorname', 'teacher', 'professor'],
  room:        ['room', 'rooms', 'venue'],
});

/**
 * Locate the `CODE | COURSE NO | …` header row and map each logical column to
 * its index, so a reordered or extra column can't shift the whole read.
 * Returns null when there is no such row.
 */
export function findSubjectOfferingsHeader(matrix) {
  const scan = Math.min(matrix.length, 40);
  for (let i = 0; i < scan; i++) {
    const cells = (matrix[i] || []).map((c) => canonicalize(c));
    const columns = {};
    const taken = new Set();
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      const idx = cells.findIndex((c, j) => !taken.has(j) && c && aliases.includes(c));
      if (idx >= 0) { columns[field] = idx; taken.add(idx); }
    }
    // CODE and COURSE NO together are what identify this layout: a flat sheet
    // has one or the other, never both.
    if (columns.code !== undefined && columns.courseNo !== undefined) {
      return { index: i, columns };
    }
  }
  return null;
}

/**
 * True for the SUBJECT OFFERINGS layout. Requires the absence of any STRAP
 * faculty header — STRAP has `Code` and `Course No` headers of its own, so the
 * two layouts are told apart by whether courses are grouped under faculty.
 */
export function looksLikeSubjectOfferingsMatrix(matrix) {
  if (matrix.some((r) => FACULTY_HEADER_RE.test(clean((r || [])[0])))) return false;
  return findSubjectOfferingsHeader(matrix) !== null;
}

export function looksLikeSubjectOfferings(filePath) {
  try { return looksLikeSubjectOfferingsMatrix(readMatrix(filePath)); } catch { return false; }
}

/**
 * Flatten SUBJECT OFFERINGS into the shared intermediate shape.
 *
 * One offering per (base code × section), with its lab rows and extra lecture
 * days folded in as schedules — a continuation row is NEVER emitted as an
 * offering of its own. `schedules` entries are objects here (they carry the
 * lecture/lab distinction rule 4 asks for); STRAP's stay plain strings, since
 * that export has no such distinction to make.
 */
export function parseSubjectOfferingsMatrix(matrix) {
  const header = findSubjectOfferingsHeader(matrix);
  const empty = {
    term: '', termSemester: null, faculty: [], offerings: [], orphans: [],
    headers: [], headerRow: null, layout: 'subject-offerings',
  };
  if (!header) return empty;

  const { index: headerIndex, columns: col } = header;

  // The term is a title row above the header ("First Sem S/Y 2026-2027").
  const preamble = matrix.slice(0, headerIndex).map((r) => clean((r || [])[0])).filter(Boolean);
  const term = preamble.find((t) => /S\/Y/i.test(t))
    || preamble.find((t) => /\bsem(ester)?\b/i.test(t))
    || '';

  const offerings = new Map();   // normalized "BASECODE-BLOCK" → offering
  const orphans = [];
  const facultySet = new Set();
  let last = null;               // { key, offering } — the open CODE row

  const at = (r, field) => (col[field] === undefined ? '' : r[col[field]]);

  for (let i = headerIndex + 1; i < matrix.length; i++) {
    const r = matrix[i] || [];
    const rowNum = i + 1;                       // 1-based sheet row
    const codeCell = clean(at(r, 'code'));
    const courseNo = clean(at(r, 'courseNo'));

    // A blank row closes the current block, so a later continuation row can't
    // attach itself across the gap.
    if (!codeCell && !courseNo) { last = null; continue; }

    if (!courseNo) {
      orphans.push({ row: rowNum, code: codeCell, courseNo: '', reason: 'no-course-no' });
      continue;
    }

    const { baseCode, section: rawSection } = splitCourseNo(courseNo);
    const { section: block, isLab } = stripLabSuffix(rawSection);
    const key = normalizeCourseNo(courseNo);
    const faculty = clean(at(r, 'faculty'));
    const time = clean(at(r, 'time'));
    const days = clean(at(r, 'days'));
    const schedule = {
      type: isLab ? 'lab' : 'lecture',
      time,
      days,
      room: clean(at(r, 'room')),   // space-padded in the export (rule 5)
      faculty,
      row: rowNum,
      text: [time, days].filter(Boolean).join(' '),
    };

    if (codeCell) {
      let off = offerings.get(key);
      if (!off) {
        off = {
          code: codeCell,
          courseNo,
          baseCode,
          section: block,
          title: clean(at(r, 'description')),
          units: numericOrNull(at(r, 'units')),
          schedules: [],
          facultyNames: [],
          rows: [],
        };
        offerings.set(key, off);
      }
      if (!off.title) off.title = clean(at(r, 'description'));
      if (off.units == null) off.units = numericOrNull(at(r, 'units'));
      off.schedules.push(schedule);
      off.rows.push(rowNum);
      if (faculty) facultySet.add(faculty);
      addFacultyName(off, faculty);
      last = { key, offering: off };
      continue;
    }

    // Blank CODE: a continuation of the CODE row above it (rule 4).
    if (!last) {
      orphans.push({ row: rowNum, code: '', courseNo, reason: 'no-parent' });
      continue;
    }
    if (last.key !== key) {
      orphans.push({
        row: rowNum, code: '', courseNo, reason: 'parent-mismatch', parent: last.offering.courseNo,
      });
      continue;
    }
    last.offering.schedules.push(schedule);
    last.offering.rows.push(rowNum);
    if (faculty) facultySet.add(faculty);
    addFacultyName(last.offering, faculty);
  }

  return {
    term,
    termSemester: semFromText(term),
    faculty: [...facultySet],
    offerings: [...offerings.values()],
    orphans,
    headers: (matrix[headerIndex] || []).map((h) => clean(h)).filter(Boolean),
    headerRow: headerIndex + 1,
    layout: 'subject-offerings',
  };
}

export function parseSubjectOfferings(filePath) {
  return parseSubjectOfferingsMatrix(readMatrix(filePath));
}

/* ------------------------------------------------------------------ *
 * 3. Program attribution (rules 1 + 3) and the two flatteners
 * ------------------------------------------------------------------ */

/**
 * Keep only the offerings that belong to one program.
 *
 *   OWNED prefix (BIT, BCS, ACT, LIS …) → rule 1, the prefix decides.
 *   SHARED prefix (GEE, MATH, …)        → rule 3, the SECTION decides, because
 *                                          the code names no program at all.
 *
 * Pass an empty prefix list to keep everything. Each kept offering comes back
 * annotated with its L-stripped `block` and whether it was `shared`, so callers
 * can gate a shared row on resolving to a real catalog course.
 */
export function filterOfferingsForProgram(offerings, options = {}) {
  const pfx = (options.prefixes || []).map((p) => String(p).toUpperCase());
  const owned = options.ownedPrefixes || OWNED_PREFIXES;
  const programKey = options.programKey !== undefined
    ? options.programKey
    : programKeyFromPrefixes(pfx);
  const keepAll = pfx.length === 0;

  const kept = [];
  for (const o of offerings || []) {
    const baseCode = clean(o.baseCode);
    if (!baseCode) continue;
    const { section: block } = stripLabSuffix(o.section || '');
    const shared = !isOwnedPrefix(baseCode, owned);

    if (!keepAll) {
      if (shared) {
        if (!programKey) continue;
        if (programFromSection(block) !== programKey) continue;
      } else if (!matchesPrefixes(baseCode, pfx)) {
        // BCS111L and BIT111L are both "Introduction to Computing" and belong
        // to different programs — a shared title never merges them.
        continue;
      }
    }
    kept.push({ ...o, baseCode, block, shared });
  }
  return kept;
}

/**
 * Group filtered offerings by base course. Sections are merged (lab suffixes
 * already stripped), faculty unioned, schedules concatenated.
 */
function groupByBaseCourse(offerings) {
  const groups = new Map();
  for (const o of offerings) {
    const key = o.baseCode.toUpperCase();
    let g = groups.get(key);
    if (!g) {
      g = {
        course_code: o.baseCode,
        course_name: clean(o.title),
        units: null,
        names: [],
        sections: new Set(),
        schedules: [],
        shared: o.shared,
        codes: [],
      };
      groups.set(key, g);
    }
    if (!g.course_name) g.course_name = clean(o.title);
    if (g.units == null) g.units = numericOrNull(o.units);
    if (o.block) g.sections.add(o.block);
    if (o.code) g.codes.push(String(o.code));
    for (const n of o.facultyNames || []) {
      const c = clean(n);                            // never an empty name
      if (c && !g.names.includes(c)) g.names.push(c);
    }
    for (const s of o.schedules || []) g.schedules.push(s);
  }
  return [...groups.values()];
}

/**
 * Turn a parsed workbook into flat, program-filtered rows ready for the Course
 * Assignment upload — ONE row per base course (sections merged), faculty
 * gathered as contributor names, no lead.
 *
 *   { course_code, course_name, contributor_names[], year_level, sections[] }
 *
 * Plus derived fields that have NO column and are never stored — `semester`,
 * `shared`, `schedules` — which the controller turns into preview warnings.
 *
 * `prefixes` (from programCoursePrefixes) keeps only this program's courses.
 * Pass an empty/undefined prefixes list to keep everything.
 */
export function extractProgramAssignments(parsed, prefixes, options = {}) {
  const kept = filterOfferingsForProgram(parsed.offerings, { ...options, prefixes });
  return groupByBaseCourse(kept).map((g) => ({
    course_code: g.course_code,
    course_name: g.course_name,
    contributor_names: g.names,
    year_level: yearLevelFromCode(g.course_code) || null,
    sections: [...g.sections],
    // ---- derived for validation / preview only; nothing below is stored ----
    semester: semesterFromCode(g.course_code),
    shared: g.shared,
    schedules: g.schedules,
  }));
}

/**
 * Turn a parsed SUBJECT OFFERINGS workbook into canonical-keyed rows for the
 * Course Offerings upload, so the controller's existing pick()-driven row loop
 * reads them exactly as it reads a flat sheet.
 *
 * One row per base course. `course_offerings` has a single `instructor_name`
 * column, so the first named faculty takes it and the rest ride along in
 * `_meta.extraFaculty` for the response — they have nowhere to be stored.
 */
export function offeringRowsFromSubjectOfferings(parsed, options = {}) {
  const kept = filterOfferingsForProgram(parsed.offerings, options);
  return groupByBaseCourse(kept).map((g) => ({
    // Canonical header keys — what pick() looks for.
    code:       g.course_code,
    courseno:   g.course_code,
    description: g.course_name,
    units:      g.units,
    term:       parsed.term || null,
    yearlevel:  yearLevelFromCode(g.course_code) || null,
    instructor: g.names[0] || null,
    _meta: {
      sections:      [...g.sections],
      faculty:       g.names,
      extraFaculty:  g.names.slice(1),
      offerCodes:    g.codes,
      semester:      semesterFromCode(g.course_code),
      shared:        g.shared,
      schedules:     g.schedules,
    },
  }));
}

/**
 * Collapse continuation rows in a FLAT sheet (one parsed by excelParser's
 * parseSheet, where row 1 is the header).
 *
 * Two fixes apply here as well as to the grouped layouts:
 *   • When a COURSE NO column exists it is the real course code — CODE is the
 *     numeric offer id. The returned row's `code` key is overwritten with the
 *     base code so the controller stores `BIT111L`, not `3009`.
 *   • A row with a blank CODE but a COURSE NO belongs to the row above it, and
 *     contributes its faculty and schedule rather than a second course row.
 */
export function collapseFlatOfferingRows(rows, headers) {
  const canonHeaders = (headers || []).map((h) => canonicalize(h));
  const hasCode = canonHeaders.includes('code');
  const hasCourseNo = canonHeaders.some((h) => COLUMN_ALIASES.courseNo.includes(h));

  const firstOf = (row, aliases) => {
    for (const a of aliases) {
      const v = row[a];
      if (v !== null && v !== undefined && String(v).trim() !== '') return String(v).trim();
    }
    return '';
  };

  const out = [];
  const orphans = [];
  let last = null;

  rows.forEach((row, i) => {
    const rowNum = i + 2;                                   // header is row 1
    const codeCell = firstOf(row, ['code']);
    const courseNoCell = firstOf(row, COLUMN_ALIASES.courseNo);
    const faculty = firstOf(row, COLUMN_ALIASES.faculty);
    const source = hasCourseNo && courseNoCell ? courseNoCell : codeCell;
    const { baseCode, section: rawSection } = splitCourseNo(source);
    const { section: block, isLab } = stripLabSuffix(rawSection);
    const key = normalizeCourseNo(source);

    const schedule = {
      type: isLab ? 'lab' : 'lecture',
      time: firstOf(row, COLUMN_ALIASES.time),
      days: firstOf(row, COLUMN_ALIASES.days),
      room: firstOf(row, COLUMN_ALIASES.room),
      faculty,
      row: rowNum,
    };

    // Only a sheet that HAS a CODE column can have continuation rows; without
    // one, every row would look like a continuation.
    if (hasCode && !codeCell && courseNoCell) {
      if (!last) { orphans.push({ row: rowNum, courseNo: courseNoCell, reason: 'no-parent' }); return; }
      if (last._key !== key) {
        orphans.push({ row: rowNum, courseNo: courseNoCell, reason: 'parent-mismatch', parent: last._meta.courseNo });
        return;
      }
      if (faculty && !last._meta.faculty.includes(faculty)) last._meta.faculty.push(faculty);
      last._meta.schedules.push(schedule);
      if (block && !last._meta.sections.includes(block)) last._meta.sections.push(block);
      return;
    }

    if (!source) { orphans.push({ row: rowNum, courseNo: '', reason: 'no-course-no' }); return; }

    const outRow = {
      ...row,
      code: baseCode || codeCell,
      _key: key,
      _meta: {
        courseNo:  source,
        sections:  block ? [block] : [],
        faculty:   faculty ? [faculty] : [],
        schedules: [schedule],
        semester:  semesterFromCode(baseCode || codeCell),
        shared:    !isOwnedPrefix(baseCode || codeCell),
      },
    };
    out.push(outRow);
    last = outRow;
  });

  // Lecture rows often leave FACULTY blank where the lab row below carries the
  // name, so the collapsed row's instructor is the block's first named faculty
  // — resolved only now that every continuation row has been folded in.
  for (const row of out) {
    row.instructor = row._meta.faculty[0] || null;
  }

  return { rows: out, orphans };
}
