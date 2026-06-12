/**
 * Course (curriculum catalog) controller.
 *
 * Global (not period-scoped). Exposes the Course list for the master
 * card grid, and a per-course detail (with resolved prerequisites and
 * curriculum revisions) for the slide-out drawer. Seeds a small sample
 * curriculum on first boot so the UI has data to show.
 */
import db from '../models/index.js';
import { describeSequelizeError } from '../utils/uploadHelpers.js';
import { parseSheet, safeUnlink, pick, canonicalize } from '../utils/excelParser.js';
import { getPeriodId, safeWhereForPeriod, whereForPeriod } from '../utils/periodScope.js';
import { safeWhere } from '../utils/dbHelpers.js';
import { rankPeriod } from '../utils/periodClone.js';

const { Course, Prerequisite, ProgramCourseOffering, AcademicPeriod, CourseOffering, CourseAssignment, Program } = db;
// (curriculum schema realigned to lpms_composition sample)

// Canonicalize messy / mixed year-level inputs (from uploads or manual entry)
// to one of the four stored forms, or null (→ "Unassigned") when it can't be
// recognised. Handles words, ordinals, US class names, roman numerals, and any
// bare digit 1–4. Keeping storage canonical means the year cards bucket every
// course correctly regardless of how the source sheet spelled the level.
function normalizeYearLevel(raw) {
  const s = String(raw || '').toLowerCase().trim();
  if (!s) return null;
  if (s.includes('first')  || s.includes('1st') || s.includes('freshman'))  return 'FIRST YEAR';
  if (s.includes('second') || s.includes('2nd') || s.includes('sophomore')) return 'SECOND YEAR';
  if (s.includes('third')  || s.includes('3rd') || s.includes('junior'))    return 'THIRD YEAR';
  if (s.includes('fourth') || s.includes('4th') || s.includes('senior'))    return 'FOURTH YEAR';
  // roman numerals (check longest first, word-boundary)
  if (/\biv\b/.test(s))  return 'FOURTH YEAR';
  if (/\biii\b/.test(s)) return 'THIRD YEAR';
  if (/\bii\b/.test(s))  return 'SECOND YEAR';
  if (/\bi\b/.test(s))   return 'FIRST YEAR';
  // any bare digit 1–4 anywhere ("year 1", "y1", "1")
  const d = s.match(/[1-4]/);
  if (d) return ['FIRST YEAR', 'SECOND YEAR', 'THIRD YEAR', 'FOURTH YEAR'][Number(d[0]) - 1];
  return null;
}

// Smart fallback when the sheet has no recognizable Year Level: infer it from
// the course code's level digit — the leading digit of the code's first numeric
// group, where 1–4 maps to FIRST–FOURTH YEAR (e.g. "BIT313L" → 3 → THIRD YEAR,
// "GE1" → 1 → FIRST YEAR). Anything outside 1–4 (or no digit) → null, so the
// row still falls through to the manual "Set year levels" review step.
function inferYearLevelFromCode(courseNo) {
  const m = String(courseNo || '').match(/\d+/);
  if (!m) return null;
  const lead = Number(m[0][0]);
  if (lead >= 1 && lead <= 4) return ['FIRST YEAR', 'SECOND YEAR', 'THIRD YEAR', 'FOURTH YEAR'][lead - 1];
  return null;
}

// Resolve a free-text program cell ("BSIT", "Bachelor of Science in IT", …) to
// a Program id within the period. Tries an exact canonical match on code or
// name first, then a loose contains-match on the name. Returns null when the
// cell names a program that isn't in this period (so the caller can fall back
// to the uploader's current program / report it as unresolved).
function makeProgramResolver(programs, defaultProgramId) {
  const byKey = new Map();
  for (const pr of programs) {
    if (pr.code) byKey.set(canonicalize(pr.code), pr.id);
    if (pr.name) byKey.set(canonicalize(pr.name), pr.id);
  }
  return (raw) => {
    const k = canonicalize(raw);
    if (!k) return defaultProgramId; // no program column → uploader's program
    if (byKey.has(k)) return byKey.get(k);
    for (const pr of programs) {
      const nk = canonicalize(pr.name);
      if (nk && (nk.includes(k) || k.includes(nk))) return pr.id;
    }
    return null; // named, but not a program in this period
  };
}

// The course's year level is denormalized onto the Course Offerings used by
// the Industry Consultant picker (course_offerings.year_level) and onto
// existing Course Assignments (course_assignments.year_level). When the
// catalog course's year level changes, push it to those copies so every page
// reflects the new level. Matched by course code within the SAME period.
async function syncYearLevelForCourse(courseNo, periodId, yearLvl) {
  if (!courseNo || !periodId) return;
  try {
    await CourseOffering.update({ year_level: yearLvl }, { where: { code: courseNo, period_id: periodId } });
  } catch (err) {
    console.warn('[courses] year-level sync → course_offerings skipped: ' + (err && err.message));
  }
  try {
    await CourseAssignment.update({ year_level: yearLvl }, { where: { course_code: courseNo, period_id: periodId } });
  } catch (err) {
    console.warn('[courses] year-level sync → course_assignments skipped: ' + (err && err.message));
  }
}

/**
 * One-time (idempotent) backfill: re-derive year_level on every Course
 * Offering and Course Assignment from the catalog (matched by code within the
 * same period). Fixes rows that went stale before edit-time propagation
 * existed. Safe on every boot — only writes rows whose value actually changes.
 */
export async function backfillYearLevelsFromCatalog() {
  try {
    const courses = await Course.findAll({ attributes: ['course_no', 'year_lvl', 'period_id'], raw: true });
    const byKey = new Map();
    for (const c of courses) {
      if (!c.period_id || !c.course_no) continue;
      byKey.set(c.period_id + '|' + String(c.course_no).trim().toLowerCase(), c.year_lvl ?? null);
    }
    let changed = 0;

    const offerings = await CourseOffering.findAll({ attributes: ['id', 'code', 'year_level', 'period_id'] });
    for (const o of offerings) {
      if (!o.period_id || !o.code) continue;
      const want = byKey.get(o.period_id + '|' + String(o.code).trim().toLowerCase());
      if (want !== undefined && (o.year_level ?? null) !== (want ?? null)) {
        await o.update({ year_level: want }); changed++;
      }
    }

    const assignments = await CourseAssignment.findAll({ attributes: ['id', 'course_code', 'year_level', 'period_id'] });
    for (const a of assignments) {
      if (!a.period_id || !a.course_code) continue;
      const want = byKey.get(a.period_id + '|' + String(a.course_code).trim().toLowerCase());
      if (want !== undefined && (a.year_level ?? null) !== (want ?? null)) {
        await a.update({ year_level: want }); changed++;
      }
    }

    if (changed) console.log('[courses] backfilled year_level on ' + changed + ' offering/assignment row(s) from catalog.');
  } catch (err) {
    console.warn('[courses] year-level backfill skipped: ' + (err && err.message));
  }
}

// A course's semester is NOT chosen per-course — it is inherited from the
// academic term it belongs to (each period IS a single semester, e.g.
// "1st Semester 2027-2028"). This resolves the period's semester to the
// numeric 1|2 the column stores; "Summer" and anything unrecognised → 1.
const periodSemester = async (period_id) => {
  if (!period_id) return 1;
  const p = await AcademicPeriod.findByPk(period_id, { attributes: ['semester'] });
  const s = String((p && p.semester) || '').toLowerCase().trim();
  return (s === '2' || s.includes('2nd') || s.includes('second')) ? 2 : 1;
};

// The course's Term is fixed by the academic period it's created in (the Add
// Course form no longer asks for one), so derive a canonical Term string from
// the period — e.g. "1st Semester 2027-2028" — keeping semester matching intact.
const semesterOfPeriod = (p) => {
  const s = String((p && p.semester) || '').toLowerCase().trim();
  return (s === '2' || s.includes('2nd') || s.includes('second')) ? 2 : 1;
};
const termOfPeriod = (p) => {
  if (!p) return null;
  if (p.label && String(p.label).trim()) return String(p.label).trim();
  const ord = semesterOfPeriod(p) === 2 ? '2nd' : '1st';
  return (ord + ' Semester ' + (p.school_year || '')).trim() || null;
};

export async function listCourses(req, res, next) {
  try {
    const period_id = getPeriodId(req);
    // archived filter: default (omitted) → only active courses; 'only' → just
    // the archived ones (for the "View Archived" view); 'all' → both.
    const archivedParam = String((req.query && req.query.archived) || '').toLowerCase();
    const base = whereForPeriod(req);
    if (archivedParam === 'only') base.archived = true;
    else if (archivedParam !== 'all') base.archived = false;
    const where = await safeWhere(Course, base);
    const order = [['course_no', 'ASC']];
    let rows = await Course.findAll({ where, order });

    // Each academic term keeps its OWN curriculum — a new sem/term does NOT
    // inherit the previous term's courses. Courses appear only when created
    // or uploaded for the selected term.
    //
    // The one exception is a one-time migration: legacy courses created
    // before period-scoping carry no period_id. They are adopted into the
    // first term opened so the pre-existing catalog isn't lost. This fires
    // at most once (it reassigns period_id), and is NOT a previous-term
    // carry-forward — only truly un-scoped rows qualify.
    if (period_id && rows.length === 0 && archivedParam !== 'only' && archivedParam !== 'all') {
      const [adopted] = await Course.update({ period_id }, { where: { period_id: null } });
      if (adopted > 0) {
        console.log('[courses] adopted ' + adopted + ' legacy (un-scoped) courses into period ' + period_id);
        rows = await Course.findAll({ where, order });
      }
    }

    res.json(rows);
  } catch (err) { next(err); }
}

/**
 * Prerequisite options — the courses offered in the PREVIOUS semester, across
 * ALL programs. A prerequisite is taken in an earlier term, so the picker on
 * the Add/Edit Course form must source from last semester (the immediate prior
 * period that has courses), not the current term. The `courses` catalog isn't
 * program-scoped, so a period's courses already span every (SCIS) program.
 */
export async function listPrereqOptions(req, res, next) {
  try {
    const period_id = getPeriodId(req);
    const periods = await AcademicPeriod.findAll({ raw: true });
    const current = periods.find((p) => Number(p.id) === Number(period_id)) || null;
    const currentRank = current ? rankPeriod(current) : Infinity;
    // Prior periods, most-recent first; walk back to the first that has courses.
    const priors = periods
      .filter((p) => Number(p.id) !== Number(period_id) && rankPeriod(p) < currentRank)
      .sort((a, b) => rankPeriod(b) - rankPeriod(a));
    for (const p of priors) {
      const rows = await Course.findAll({
        where: await safeWhere(Course, { period_id: p.id, archived: false }),
        attributes: ['course_no', 'course_title', 'year_lvl', 'term'],
        order: [['course_no', 'ASC']],
        raw: true,
      });
      if (rows.length > 0) {
        const seen = new Set();
        const courses = [];
        for (const r of rows) {
          const k = String(r.course_no || '').trim().toLowerCase();
          if (!k || seen.has(k)) continue;
          seen.add(k);
          courses.push(r);
        }
        return res.json({ period: { id: p.id, label: p.label }, courses });
      }
    }
    return res.json({ period: null, courses: [] });
  } catch (err) { next(err); }
}

export async function getCourse(req, res, next) {
  try {
    const row = await Course.findByPk(req.params.id, {
      include: [
        { model: Course, as: 'prerequisites', through: { attributes: [] }, attributes: ['course_id', 'course_no', 'course_title'] },
        { model: ProgramCourseOffering, as: 'revisions', attributes: ['pc_offering_id', 'revision_number', 'course_description'] },
      ],
      order: [[{ model: ProgramCourseOffering, as: 'revisions' }, 'revision_number', 'ASC']],
    });
    if (!row) return res.status(404).json({ message: 'Course not found' });
    res.json(row);
  } catch (err) { next(err); }
}

// The Prerequisites form field is now free text ("BIT201, BIT202"). These split
// it into individual codes / normalize it back to a stored string. Accepts an
// array too (legacy callers).
const parsePrereqCodes = (raw) =>
  (Array.isArray(raw) ? raw : String(raw || '').split(/[,;|/\n]+/))
    .map((s) => String(s || '').trim())
    .filter(Boolean);
const prereqTextOf = (raw) => {
  const codes = parsePrereqCodes(raw);
  return codes.length ? codes.join(', ') : null;
};

// Replace a course's prerequisite links from a list of course CODES, resolved
// against other courses in the SAME period (case-insensitive). Always rewrites
// from scratch so removals take effect. A course can't require itself. Codes
// that don't match a catalog course are skipped here but preserved in the
// course's free-text `prerequisites_text` column.
async function setCoursePrerequisites(course, codes) {
  if (!course || !course.course_id) return;
  const wanted = new Set(
    (Array.isArray(codes) ? codes : [])
      .map((c) => String(c || '').trim().toLowerCase())
      .filter(Boolean)
  );
  await Prerequisite.destroy({ where: { course_id: course.course_id } });
  if (wanted.size === 0) return;
  const peers = await Course.findAll({
    where: await safeWhere(Course, { period_id: course.period_id }),
    attributes: ['course_id', 'course_no'],
    raw: true,
  });
  const rows = [];
  for (const p of peers) {
    if (p.course_id === course.course_id) continue; // no self-prerequisite
    if (wanted.has(String(p.course_no).trim().toLowerCase())) {
      rows.push({ course_id: course.course_id, course_prerequisite_id: p.course_id });
    }
  }
  if (rows.length) await Prerequisite.bulkCreate(rows);
}

export async function createCourse(req, res) {
  try {
    const { course_no, course_title, credit, contact_hrs, classification, cmo, year_lvl, term } = req.body;
    if (!course_no || !course_title) return res.status(400).json({ message: 'course_no and course_title are required' });
    const period_id = getPeriodId(req);
    // Term + semester are inherited from the academic period the course is
    // created in — the form no longer collects a Term. Derive both from it.
    const period = period_id ? await AcademicPeriod.findByPk(period_id, { attributes: ['semester', 'label', 'school_year'] }) : null;
    const semester = semesterOfPeriod(period);
    const resolvedTerm = (term && String(term).trim()) || termOfPeriod(period);
    const created = await Course.create({ course_no, course_title, credit: credit || null, contact_hrs, classification, cmo, year_lvl: normalizeYearLevel(year_lvl), prerequisites_text: prereqTextOf(req.body.prerequisites), term: resolvedTerm, semester, period_id });
    if (req.body.prerequisites !== undefined) await setCoursePrerequisites(created, parsePrereqCodes(req.body.prerequisites));
    res.status(201).json(created);
  } catch (err) { res.status(400).json({ message: describeSequelizeError(err) }); }
}

export async function updateCourse(req, res) {
  try {
    const row = await Course.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Course not found' });
    // The offerings/assignments reference the ORIGINAL code, so capture it
    // before the update for the year-level sync below.
    const origCourseNo = row.course_no;
    const patch = {};
    for (const k of ['course_no', 'course_title', 'credit', 'contact_hrs', 'classification', 'cmo', 'year_lvl', 'term']) {
      if (req.body[k] !== undefined) patch[k] = req.body[k] === '' ? null : req.body[k];
    }
    // Canonicalize the year level so storage stays consistent with imports.
    if (patch.year_lvl !== undefined) patch.year_lvl = normalizeYearLevel(patch.year_lvl);
    // Archive / restore — a course can be hidden from the catalog and every
    // page that reads it, then brought back later.
    if (req.body.archived !== undefined) patch.archived = !!req.body.archived;
    // Free-text prerequisites — store the typed string verbatim.
    if (req.body.prerequisites !== undefined) patch.prerequisites_text = prereqTextOf(req.body.prerequisites);
    // semester is inherited from the term, not editable per-course.
    await row.update(patch);

    // Propagate a year-level change to the denormalized copies so the
    // Industry Consultant picker and Course Assignments stay in sync.
    if (patch.year_lvl !== undefined) {
      await syncYearLevelForCourse(origCourseNo, row.period_id, patch.year_lvl);
    }

    // Prerequisites — only rewrite the resolvable links when the field was sent
    // (the raw text was already stored above for codes that don't resolve).
    if (req.body.prerequisites !== undefined) {
      await setCoursePrerequisites(row, parsePrereqCodes(req.body.prerequisites));
    }

    res.json(row);
  } catch (err) { res.status(400).json({ message: describeSequelizeError(err) }); }
}

/**
 * Bulk-upload curriculum Courses from a spreadsheet.
 *
 * The source format is unknown / varies per user, so each field is
 * matched against a list of likely column-name aliases (canonicalized:
 * lower-cased, non-alphanumerics stripped). Only Course No. and Course
 * Title are required; everything else is optional.
 *
 * Rows are UPSERTED by course_no (case-insensitive): an existing course
 * is updated in place, a new one is created — so re-uploading an updated
 * sheet won't create duplicates.
 *
 * One optional column builds the rest of the curriculum:
 *   • Prerequisites — other course codes (comma/; / | separated), resolved
 *                     against every course in the file + the DB, then
 *                     linked (duplicates ignored).
 *
 * Course offering revisions are intentionally NOT written here — they are
 * owned/fetched from a separate module.
 *
 * Returns a per-file summary.
 */
// Canonical course_no key for case/space-insensitive matching (upsert,
// overrides, skip list). Mirrors how existing rows are indexed.
const courseKey = (no) => String(no || '').trim().toLowerCase();

// Parse a sheet's rows into normalized course field objects WITHOUT touching
// the DB. Keeps BOTH the raw and the canonicalized year level so the preview
// step can surface rows whose year level wasn't recognized. Only Course No. and
// Course Title are required; rows missing either are reported in `errors`.
function parseCourseRows(rows) {
  const trim = (v) => (v != null && String(v).trim() !== '' ? String(v).trim() : null);
  const parsed = [];
  const errors = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const course_no    = pick(row, 'courseno', 'coursenumber', 'coursecode', 'code', 'courseid', 'subjectcode', 'catalogno', 'catalognumber', 'subject');
    const course_title = pick(row, 'coursetitle', 'title', 'coursename', 'descriptivetitle', 'subjecttitle', 'descriptiontitle', 'description', 'name');
    if (!course_no || !course_title) {
      errors.push({ row: i + 2, message: 'Missing Course No. or Course Title — skipped.' });
      continue;
    }
    const codeStr = String(course_no).trim();
    const rawYear = pick(row, 'yearlevel', 'yearlvl', 'year', 'level', 'yr', 'yearstanding', 'standing');
    // Year level: prefer the (recognized) column; otherwise infer from the
    // course code's level digit so well-coded sheets need no manual review.
    const normYear = normalizeYearLevel(rawYear);
    const inferredYear = normYear ? null : inferYearLevelFromCode(codeStr);
    parsed.push({
      rowNum:         i + 2,
      course_no:      codeStr,
      course_title:   String(course_title).trim(),
      credit:         trim(pick(row, 'credit', 'credits', 'creditunits', 'creditunit', 'units', 'unit', 'noofunits', 'totalunits', 'lecladbcredit')),
      contact_hrs:    trim(pick(row, 'contacthours', 'contacthrs', 'contacthour', 'contact', 'hours', 'hrs', 'hoursperweek', 'hrsperweek', 'lechours')),
      classification: trim(pick(row, 'classification', 'classif', 'category', 'coursecategory', 'type', 'coursetype', 'courseclassification')),
      cmo:            trim(pick(row, 'cmo', 'cmono', 'cmonumber', 'cmoref', 'memo', 'chedmemo', 'chedmemono', 'ched')),
      term:           trim(pick(row, 'term', 'semester', 'sem', 'schoolyear', 'sy', 'termsemester')),
      program_raw:    trim(pick(row, 'program', 'programcode', 'prog', 'programname', 'programtitle', 'curriculum', 'degreeprogram', 'degree', 'major', 'majorprogram')),
      year_lvl_raw:   trim(rawYear),
      year_lvl:       normYear || inferredYear,
      year_inferred:  !normYear && !!inferredYear,
      prereqRaw:      pick(row, 'prerequisites', 'prerequisite', 'prereq', 'prereqs', 'prerequisitecode', 'prerequisitecodes', 'prerequisiteno', 'prerequisitecourses'),
    });
  }
  return { parsed, errors };
}

export async function uploadCourses(req, res) {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
  try {
    const { rows, headers } = parseSheet(req.file.path);
    const period_id = getPeriodId(req);
    // The program a row belongs to is resolved from a Program column in the
    // sheet (by code/name); rows without one fall back to the program the
    // uploader is currently viewing (programId from the request).
    const defaultProgramId = Number((req.query && req.query.programId) || (req.body && req.body.programId)) || null;

    const isPreview = ['1', 'true', 'yes'].includes(
      String((req.query && req.query.preview) || (req.body && req.body.preview) || '').toLowerCase()
    );

    const { parsed, errors } = parseCourseRows(rows);

    // Genuinely empty / wrong-shaped file — same guidance for preview & commit.
    if (parsed.length === 0) {
      return res.status(400).json({
        message: 'No valid course rows found. Your sheet needs a Course No. column (e.g. "Course No.", "Code", "Subject Code") and a Course Title column (e.g. "Course Title", "Description").',
        headers,
        errors,
      });
    }

    // Program index for THIS period, plus a resolver that maps a row's program
    // cell → program id (falling back to the uploader's current program).
    const programs = period_id
      ? await Program.findAll({ where: await safeWhere(Program, { period_id }), attributes: ['id', 'code', 'name'], raw: true })
      : [];
    const codeById = new Map(programs.map((pr) => [pr.id, pr.code]));
    const resolveProgramId = makeProgramResolver(programs, defaultProgramId);
    // Program cells that name a program NOT in this period (couldn't resolve).
    const unresolvedPrograms = new Set();
    for (const p of parsed) {
      if (p.program_raw && resolveProgramId(p.program_raw) === null) unresolvedPrograms.add(p.program_raw);
    }
    const inferredYearCount = parsed.filter((p) => p.year_inferred).length;

    // ---------- PREVIEW: persist NOTHING; surface unrecognized year levels ----------
    if (isPreview) {
      const unassigned = parsed
        .filter((p) => p.year_lvl === null)
        .map((p) => ({
          row:            p.rowNum,
          course_no:      p.course_no,
          course_title:   p.course_title,
          raw_year_level: p.year_lvl_raw,
          credit:         p.credit,
          contact_hrs:    p.contact_hrs,
          classification: p.classification,
          cmo:            p.cmo,
          term:           p.term,
          prerequisites:  p.prereqRaw || null,
        }));
      return res.json({
        detectedColumns: headers,
        total: parsed.length,
        recognizedCount: parsed.length - unassigned.length,
        inferredYearCount,        // year levels inferred from the course code
        programColumnPresent: parsed.some((p) => p.program_raw),
        unresolvedPrograms: Array.from(unresolvedPrograms),
        unassigned,
      });
    }

    // ---------- COMMIT: apply popup resolutions, then upsert ----------
    // Resolution inputs arrive as JSON strings in the multipart body.
    let overrides = {};
    try { overrides = req.body.yearLevelOverrides ? JSON.parse(req.body.yearLevelOverrides) : {}; }
    catch { overrides = {}; }
    let skipList = [];
    try { skipList = req.body.skipCodes ? JSON.parse(req.body.skipCodes) : []; }
    catch { skipList = []; }
    const skipSet = new Set((Array.isArray(skipList) ? skipList : []).map(courseKey));
    // Map override course_no (case/space-insensitive) → canonical year level.
    const overrideByKey = new Map();
    Object.entries(overrides || {}).forEach(([code, yl]) => {
      const norm = normalizeYearLevel(yl);
      if (norm) overrideByKey.set(courseKey(code), norm);
    });

    // Index existing courses (in THIS period) by canonical course_no for
    // upsert — re-uploading updates the term's own rows, never another
    // term's copy.
    const existing = await Course.findAll({ where: { period_id }, attributes: ['course_id', 'course_no'] });
    const byNo = new Map(existing.map((c) => [courseKey(c.course_no), c.course_id]));

    // Every row in this upload belongs to the selected term, so they all
    // share that term's semester.
    const semester = await periodSemester(period_id);

    let inserted = 0;
    let updated = 0;
    let notImported = 0;     // "Don't import" rows from the popup
    let assignedViaPopup = 0; // rows whose year level came from the popup
    const rowExtras = []; // { course_id, ownKey, prereqRaw }
    // Per-year distribution of the upserted rows, so the frontend can show
    // where each course landed (and how many couldn't be matched to a year).
    const yearTally = { 'FIRST YEAR': 0, 'SECOND YEAR': 0, 'THIRD YEAR': 0, 'FOURTH YEAR': 0, unassigned: 0 };
    // Per-program distribution of the upserted rows (by program code), plus an
    // "Unassigned" bucket for rows we couldn't tie to a program.
    const programTally = {};

    for (const p of parsed) {
      const key = courseKey(p.course_no);

      // "Don't import" → never insert or update this course.
      if (skipSet.has(key)) { notImported++; continue; }

      // Use the parsed (recognized/inferred) year level; otherwise a popup
      // override if one was supplied for this course.
      let year_lvl = p.year_lvl;
      if (year_lvl === null && overrideByKey.has(key)) {
        year_lvl = overrideByKey.get(key);
        assignedViaPopup++;
      }

      const program_id = resolveProgramId(p.program_raw);

      const fields = {
        course_no:      p.course_no,
        course_title:   p.course_title,
        credit:         p.credit,
        contact_hrs:    p.contact_hrs,
        classification: p.classification,
        cmo:            p.cmo,
        term:           p.term,
        year_lvl,
        program_id,
        // Semester is inherited from the term (not read from the sheet).
        semester,
      };

      // Tally where this row landed by program (code, or "Unassigned").
      const progLabel = (program_id != null && codeById.get(program_id)) || 'Unassigned';
      programTally[progLabel] = (programTally[progLabel] || 0) + 1;

      let id = byNo.get(key);
      if (id) {
        await Course.update(fields, { where: { course_id: id } });
        updated++;
      } else {
        const created = await Course.create({ ...fields, period_id });
        id = created.course_id;
        byNo.set(key, id);
        inserted++;
      }

      // Tally where this upserted row landed by year level.
      if (yearTally[fields.year_lvl] !== undefined) yearTally[fields.year_lvl]++;
      else yearTally.unassigned++;

      rowExtras.push({ course_id: id, ownKey: key, prereqRaw: p.prereqRaw });
    }

    // --- Prerequisites: codes resolve against the full file + existing DB ---
    let prerequisitesLinked = 0;
    const unresolvedPrereqs = new Set();
    for (const ex of rowExtras) {
      if (!ex.prereqRaw) continue;
      const codes = String(ex.prereqRaw).split(/[,;|/]+/).map((s) => s.trim()).filter(Boolean);
      for (const code of codes) {
        const pid = byNo.get(courseKey(code));
        if (!pid) { unresolvedPrereqs.add(code); continue; }
        if (pid === ex.course_id) continue; // a course can't require itself
        const [, created] = await Prerequisite.findOrCreate({
          where: { course_id: ex.course_id, course_prerequisite_id: pid },
          defaults: { course_id: ex.course_id, course_prerequisite_id: pid },
        });
        if (created) prerequisitesLinked++;
      }
    }

    res.status(201).json({
      inserted, updated,
      skipped: errors.length,    // rows skipped for missing Course No./Title
      notImported,               // "Don't import" rows from the popup
      assignedViaPopup,          // rows whose year level was set in the popup
      inferredYearCount,         // year levels inferred from the course code
      errors, headers,
      prerequisitesLinked,
      unresolvedPrereqs: Array.from(unresolvedPrereqs),
      // Per-year distribution of the upserted rows — drives the frontend
      // summary so the user can see how courses routed.
      yearBreakdown: { ...yearTally },
      // Per-program distribution (by code) + any program names in the sheet we
      // couldn't match to a program in this period.
      programBreakdown: { ...programTally },
      unresolvedPrograms: Array.from(unresolvedPrograms),
    });
  } catch (err) {
    res.status(400).json({ message: describeSequelizeError(err) });
  } finally {
    safeUnlink(req.file && req.file.path);
  }
}

export async function deleteCourse(req, res, next) {
  try {
    const n = await Course.destroy({ where: { course_id: req.params.id } });
    if (!n) return res.status(404).json({ message: 'Course not found' });
    res.status(204).end();
  } catch (err) { next(err); }
}

/**
 * Seed a small sample curriculum the first time the table is empty so
 * the new UI has prerequisites + revisions to demonstrate. Safe to call
 * on every boot — it no-ops once any course exists.
 */
export async function seedCurriculumIfEmpty() {
  const count = await Course.count();
  if (count > 0) return;

  // Mirrors the lpms_composition sample data.
  const courses = await Course.bulkCreate([
    { course_no: 'BIT313L', course_title: 'Human and Computer Interaction',     credit: '2 LEC, 1 LAB', contact_hrs: '2 Hrs Lec, 3 Hrs Lab', classification: 'Professional Courses', cmo: 'CMO No. 25 S. 2015', year_lvl: 'THIRD YEAR',  term: '1st Semester SY 2025-2026' },
    { course_no: 'BIT302',  course_title: 'Web Development II',                 credit: '2 LEC, 1 LAB', contact_hrs: '2 Hrs Lec, 3 Hrs Lab', classification: 'Professional Courses', cmo: 'CMO No. 12 S. 2018', year_lvl: 'SECOND YEAR', term: '2nd Semester SY 2024-2025' },
    { course_no: 'BIT201',  course_title: 'Database Systems',                   credit: '2 LEC, 1 LAB', contact_hrs: '2 Hrs Lec, 3 Hrs Lab', classification: 'Core Courses',         cmo: 'CMO No. 8 S. 2017',  year_lvl: 'SECOND YEAR', term: '1st Semester SY 2024-2025' },
    { course_no: 'BIT202',  course_title: 'Software Engineering',               credit: '3 LEC, 0 LAB', contact_hrs: '3 Hrs Lec, 0 Hrs Lab', classification: 'Core Courses',         cmo: 'CMO No. 9 S. 2017',  year_lvl: 'THIRD YEAR',  term: '2nd Semester SY 2024-2025' },
    { course_no: 'BIT203',  course_title: 'Mobile Application Development',     credit: '2 LEC, 1 LAB', contact_hrs: '2 Hrs Lec, 3 Hrs Lab', classification: 'Elective',             cmo: 'CMO No. 14 S. 2019', year_lvl: 'THIRD YEAR',  term: '1st Semester SY 2025-2026' },
    { course_no: 'BIT204',  course_title: 'Network Security',                   credit: '2 LEC, 1 LAB', contact_hrs: '2 Hrs Lec, 3 Hrs Lab', classification: 'Professional Courses', cmo: 'CMO No. 20 S. 2020', year_lvl: 'THIRD YEAR',  term: '1st Semester SY 2025-2026' },
    { course_no: 'BIT205',  course_title: 'Data Structures and Algorithms',     credit: '2 LEC, 1 LAB', contact_hrs: '2 Hrs Lec, 3 Hrs Lab', classification: 'Core Courses',         cmo: 'CMO No. 7 S. 2016',  year_lvl: 'SECOND YEAR', term: '2nd Semester SY 2024-2025' },
    { course_no: 'BIT206',  course_title: 'Introduction to Artificial Intelligence', credit: '3 LEC, 0 LAB', contact_hrs: '3 Hrs Lec, 0 Hrs Lab', classification: 'Elective',       cmo: 'CMO No. 22 S. 2021', year_lvl: 'THIRD YEAR',  term: '2nd Semester SY 2025-2026' },
    { course_no: 'BIT207',  course_title: 'Web Security and Performance',       credit: '2 LEC, 1 LAB', contact_hrs: '2 Hrs Lec, 3 Hrs Lab', classification: 'Elective',             cmo: 'CMO No. 18 S. 2019', year_lvl: 'THIRD YEAR',  term: '1st Semester SY 2025-2026' },
  ], { returning: true });

  const byNo = {};
  courses.forEach((c) => { byNo[c.course_no] = c.course_id; });

  // A few plausible prerequisites to demonstrate the chips (most courses
  // have none → "No prerequisites required.").
  await Prerequisite.bulkCreate([
    { course_id: byNo['BIT302'], course_prerequisite_id: byNo['BIT201'] }, // Web Dev II ← Database Systems
    { course_id: byNo['BIT207'], course_prerequisite_id: byNo['BIT302'] }, // Web Security ← Web Dev II
    { course_id: byNo['BIT202'], course_prerequisite_id: byNo['BIT205'] }, // Software Eng ← Data Structures
  ]);

  // Course offerings (descriptions) — mirrors ProgramCourseOfferings sample.
  await ProgramCourseOffering.bulkCreate([
    { course_id: byNo['BIT313L'], revision_number: 1, program_id: 1, dept_id: 3, course_description: 'This course explores the principles and practices of Human-Computer Interaction (HCI), focusing on human factors, usability, and interface design.' },
    { course_id: byNo['BIT302'],  revision_number: 1, program_id: 1, dept_id: 3, course_description: 'Advanced web development topics and frameworks.' },
    { course_id: byNo['BIT201'],  revision_number: 1, program_id: 1, dept_id: 3, course_description: 'Database design, normalization, and SQL.' },
    { course_id: byNo['BIT202'],  revision_number: 1, program_id: 2, dept_id: 3, course_description: 'Software development lifecycle and best practices.' },
    { course_id: byNo['BIT203'],  revision_number: 1, program_id: 1, dept_id: 3, course_description: 'Mobile app design and deployment.' },
    { course_id: byNo['BIT204'],  revision_number: 1, program_id: 2, dept_id: 3, course_description: 'Principles of network security and defense.' },
    { course_id: byNo['BIT205'],  revision_number: 1, program_id: 1, dept_id: 3, course_description: 'Core algorithms and data structure implementations.' },
    { course_id: byNo['BIT207'],  revision_number: 1, program_id: 1, dept_id: 3, course_description: 'Web performance, caching, and security practices.' },
  ]);

  // eslint-disable-next-line no-console
  console.log('[curriculum] seeded ' + courses.length + ' sample courses (lpms_composition shape).');
}
