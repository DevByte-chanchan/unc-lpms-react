/**
 * Course Assignment controller.
 *
 * The Course Assignment module owns its own table (course_assignments),
 * period-scoped and starting blank each term. Every row is validated
 * against the period's Course Offerings and Faculty master lists; its status
 * MIRRORS the assigned faculty's status so the assignment reads as
 * available/unavailable exactly as its faculty does:
 *
 *   Active / On Leave / Emeritus / Inactive — the matched faculty's own status.
 *   Unassigned — course code or faculty name not matched (or no faculty yet).
 *
 * Inactive (and the manual 'Archived' from Edit → Remove) route the row to the
 * Archive, so that faculty's assignment is hidden. Emeritus stays VISIBLE in
 * the main table, flagged — the course is available for reassignment to another
 * faculty. The page re-derives this on every load.
 */
import db from '../models/index.js';
import { parseSheet, safeUnlink, pick } from '../utils/excelParser.js';
import { getPeriodId, safeWhereForPeriod } from '../utils/periodScope.js';
import { filterOneToExistingColumns, safeDestroyByPeriod, safeWhere } from '../utils/dbHelpers.js';
import { describeSequelizeError } from '../utils/uploadHelpers.js';
import { enforceLatestPeriod } from '../utils/latestPeriod.js';
import { courseSemesterOf, periodSemesterOf } from '../utils/courseSemester.js';

const { CourseAssignment, Course, Faculty, AcademicPeriod } = db;

/**
 * Normalise a person's name for fuzzy matching: drop common honorifics
 * ("Dr.", "Prof.", "Engr."…) and collapse punctuation/whitespace, so
 * "Dr. Maria Santos" still matches a Faculty row stored as "Maria Santos".
 */
function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\b(dr|prof|professor|engr|engineer|atty|mr|mrs|ms|sir|maam|ma'?am)\.?\s+/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Load the course + faculty lookup maps used to validate an assignment.
 *
 * Courses come from THIS period's curriculum catalog (the Course Offerings
 * page → Course model, keyed by course_no). Period-scoping matters: codes
 * from another term must not Verify here, and the code→course map must pick
 * the current term's row (and its year level). Faculty stays period-scoped
 * and is keyed two ways — exact (trim + lowercase) and honorific-stripped.
 */
async function loadMasterLists(period_id) {
  const period = period_id ? await AcademicPeriod.findByPk(period_id, { attributes: ['semester'] }) : null;
  const termSem = periodSemesterOf(period);
  const courses = await Course.findAll({
    // Archived catalog courses are excluded so assignments can't validate
    // against a course that's been pulled from the catalog.
    where: await safeWhere(Course, { period_id, archived: false }),
    attributes: ['course_id', 'course_no', 'course_title', 'year_lvl', 'term', 'semester'],
  });
  // Only the active term's-semester courses validate — mirrors the Course
  // Offerings page (courseMatchesPeriod), so a course tagged to a DIFFERENT
  // semester (e.g. a 2nd-sem course in a 1st-sem term) can't Verify here.
  const courseByCode = new Map(
    courses
      .filter((c) => courseSemesterOf(c) === termSem)
      .map((c) => [String(c.course_no).trim().toLowerCase(), c]),
  );

  const fWhere = await safeWhere(Faculty, { period_id });
  const facultyList = await Faculty.findAll({ where: fWhere, attributes: ['id', 'name', 'status'] });
  const facultyByName = new Map();   // exact: trim + lowercase
  const facultyByNorm = new Map();   // fallback: honorifics stripped
  for (const f of facultyList) {
    facultyByName.set(String(f.name).trim().toLowerCase(), f);
    facultyByNorm.set(normalizeName(f.name), f);
  }

  return { courseByCode, facultyByName, facultyByNorm };
}

/**
 * Resolve a course code + faculty name against the master-list maps and
 * derive { course_offering_id, faculty_id, status }.
 *
 * The status MIRRORS the assigned faculty's status in the Faculty list
 * (Active / On Leave / Emeritus / Inactive) — so an assignment reads as
 * available/unavailable exactly as its faculty does. Emeritus & Inactive are
 * archive statuses, so those assignments drop into the Archive automatically.
 *
 *   Unassigned    — the course code (catalog) or faculty name wasn't matched
 *                   (or no faculty set yet). Stays visible so it can be fixed.
 *   <faculty.status> — both matched: the faculty's own status verbatim.
 */
function resolveAssignment(courseCode, facultyName, lists) {
  const { courseByCode, facultyByName, facultyByNorm } = lists;

  const course = courseCode
    ? courseByCode.get(String(courseCode).trim().toLowerCase())
    : null;

  let faculty = null;
  if (facultyName) {
    faculty = facultyByName.get(String(facultyName).trim().toLowerCase())
      || facultyByNorm.get(normalizeName(facultyName))
      || null;
  }

  let status;
  if (!course || !faculty) {
    status = 'Unassigned';
  } else {
    status = faculty.status || 'Active';
  }
  return {
    // Catalog course id (column name kept for compatibility).
    course_offering_id: course ? course.course_id : null,
    faculty_id: faculty ? faculty.id : null,
    status,
    // Year level derived from the catalog course (the upload column, when
    // present, overrides this in the caller).
    year_level: course ? (course.year_lvl || null) : null,
  };
}

/**
 * Recompute each NON-archived row against the current catalog/faculty lists
 * and persist any change to status / course_offering_id / faculty_id /
 * year_level. The single source of truth for both the live list and the
 * explicit Re-validate. Returns a { changed, summary } report.
 */
async function syncAssignmentsAgainstCatalog(rows, lists) {
  let changed = 0;
  const summary = {};
  for (const row of rows) {
    // Manual removals (Edit → Remove) stay 'Archived'; everything else is
    // re-derived from the current catalog + faculty status on every load.
    if (row.status === 'Archived') { summary.Archived = (summary.Archived || 0) + 1; continue; }
    const resolved = resolveAssignment(row.course_code, row.faculty_name, lists);
    if (row.status !== resolved.status
      || row.course_offering_id !== resolved.course_offering_id
      || row.faculty_id !== resolved.faculty_id
      || (row.year_level ?? null) !== (resolved.year_level ?? null)) {
      if (row.status !== resolved.status) changed++;
      await row.update(resolved);
    }
    summary[resolved.status] = (summary[resolved.status] || 0) + 1;
  }
  return { changed, summary };
}

export async function listCourseAssignments(req, res, next) {
  try {
    const where = await safeWhereForPeriod(CourseAssignment, req);
    const period_id = getPeriodId(req);
    // Per spec: the Course Assignment table starts blank each term —
    // no clone-on-first-use.
    const rows = await CourseAssignment.findAll({ where, order: [['course_code', 'ASC']] });

    // Live sync against the catalog: opening the page always reflects current
    // year levels + Verified/Pending/Flagged, without clicking Re-validate.
    if (period_id && rows.length > 0) {
      const lists = await loadMasterLists(period_id);
      await syncAssignmentsAgainstCatalog(rows, lists);
    }

    res.json(rows);
  } catch (err) { next(err); }
}

export async function getCourseAssignment(req, res, next) {
  try {
    const row = await CourseAssignment.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Course assignment not found' });
    res.json(row);
  } catch (err) { next(err); }
}

export async function createCourseAssignment(req, res) {
  try {
    const { course_code, course_name, faculty_name } = req.body;
    const period_id = getPeriodId(req);
    if (!course_code) return res.status(400).json({ message: 'course_code is required' });
    if (!period_id)   return res.status(400).json({ message: 'period_id is required' });
    if (!(await enforceLatestPeriod(res, period_id))) return;

    const lists = await loadMasterLists(period_id);
    const resolved = resolveAssignment(course_code, faculty_name, lists);

    const safe = await filterOneToExistingColumns(CourseAssignment, {
      course_code:  String(course_code).trim(),
      course_name:  course_name  ? String(course_name).trim()  : null,
      faculty_name: faculty_name ? String(faculty_name).trim() : null,
      ...resolved,
      year_level: req.body.year_level ? String(req.body.year_level).trim() : resolved.year_level,
      // Stamp the assignment date when a faculty (stakeholder) is assigned.
      date_assigned: faculty_name ? new Date() : null,
      period_id,
    });
    const created = await CourseAssignment.create(safe);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ message: describeSequelizeError(err) });
  }
}

export async function updateCourseAssignment(req, res) {
  try {
    const row = await CourseAssignment.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Course assignment not found' });
    const callerPeriod = getPeriodId(req);
    if (callerPeriod && row.period_id && row.period_id !== callerPeriod) {
      return res.status(403).json({ message: 'This assignment belongs to a different period; switch periods to edit it.' });
    }
    if (!(await enforceLatestPeriod(res, row.period_id || callerPeriod))) return;

    const patch = {};
    for (const k of ['course_code', 'course_name', 'faculty_name']) {
      if (req.body[k] !== undefined) patch[k] = req.body[k] === '' ? null : req.body[k];
    }

    // Re-stamp the assignment date whenever the faculty (stakeholder) is
    // (re)assigned via the edit form; clear it if the faculty is removed.
    if (req.body.faculty_name !== undefined) {
      patch.date_assigned = patch.faculty_name ? new Date() : null;
    }

    if (req.body.status !== undefined) {
      // Explicit status change (e.g. the Edit modal's "Remove" → Archived):
      // respect it and skip re-validation so the chosen status sticks.
      patch.status = req.body.status;
    } else {
      // Re-resolve + recompute the status from the (possibly new) values.
      const course_code  = patch.course_code  !== undefined ? patch.course_code  : row.course_code;
      const faculty_name = patch.faculty_name !== undefined ? patch.faculty_name : row.faculty_name;
      const lists = await loadMasterLists(row.period_id);
      Object.assign(patch, resolveAssignment(course_code, faculty_name, lists));
    }

    // An explicitly-sent year_level wins over the catalog-derived one.
    if (req.body.year_level !== undefined) {
      patch.year_level = req.body.year_level === '' ? null : String(req.body.year_level).trim();
    }

    const safe = await filterOneToExistingColumns(CourseAssignment, patch);
    await row.update(safe);
    res.json(row);
  } catch (err) {
    res.status(400).json({ message: describeSequelizeError(err) });
  }
}

export async function deleteCourseAssignment(req, res, next) {
  try {
    const row = await CourseAssignment.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Course assignment not found' });
    if (!(await enforceLatestPeriod(res, row.period_id))) return;
    await CourseAssignment.destroy({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) { next(err); }
}

/**
 * Re-validate every (non-archived) assignment in a period against the
 * CURRENT catalog + faculty list, and persist the recomputed
 * status / course_offering_id / faculty_id. Useful after the course
 * source changes (e.g. switching to the catalog) so stale "Verified"
 * rows whose course no longer exists drop to "Pending Match", and vice
 * versa. Returns a before/after summary.
 */
export async function revalidateCourseAssignments(req, res) {
  try {
    const period_id = getPeriodId(req);
    if (!period_id) return res.status(400).json({ message: 'period_id is required' });

    const where = await safeWhereForPeriod(CourseAssignment, req);
    const rows = await CourseAssignment.findAll({ where });
    const lists = await loadMasterLists(period_id);
    const { changed, summary } = await syncAssignmentsAgainstCatalog(rows, lists);
    res.json({ total: rows.length, changed, summary });
  } catch (err) {
    res.status(400).json({ message: describeSequelizeError(err) });
  }
}

export async function uploadCourseAssignments(req, res) {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
  const period_id = getPeriodId(req);
  if (!period_id) return res.status(400).json({ message: 'period_id is required (pass in form body).' });
  if (!(await enforceLatestPeriod(res, period_id))) {
    safeUnlink(req.file && req.file.path);
    return;
  }

  try {
    const { rows, headers } = parseSheet(req.file.path);
    const lists = await loadMasterLists(period_id);

    const records  = [];
    const errors   = [];
    const warnings = [];

    rows.forEach((row, i) => {
      const course_code  = pick(row, 'courseid', 'coursecode', 'code', 'courseno', 'coursenumber', 'subjectcode');
      const course_name  = pick(row, 'coursename', 'courseoffering', 'coursetitle', 'coursedescription', 'description', 'title', 'subjectname', 'name');
      const faculty_name = pick(row, 'facultyname', 'facultynames', 'assignedfacultyname', 'assignedfacultynames', 'assignedfaculty', 'faculty', 'faculties', 'facultymember', 'instructorname', 'instructor', 'professor', 'teacher');
      const year_level   = pick(row, 'yearlevel', 'yearlvl', 'yearlevelofcourse', 'year', 'level', 'yr');
      if (!course_code) {
        errors.push({ row: i + 2, message: 'Missing Course ID — skipped.' });
        return;
      }
      const resolved = resolveAssignment(course_code, faculty_name, lists);
      // Surface every row that isn't a clean Active assignment: unmatched rows
      // (Unassigned) need fixing; an Inactive faculty lands straight in the
      // Archive; an Emeritus faculty stays visible so the course can be
      // reassigned; On Leave just needs awareness.
      if (resolved.status !== 'Active') {
        let message;
        if (resolved.status === 'Unassigned') {
          message = "Course or faculty not found in this period's Course Offerings / Faculty lists.";
        } else if (resolved.status === 'Emeritus') {
          message = 'Assigned faculty is Emeritus — the course is available for reassignment.';
        } else if (resolved.status === 'Inactive') {
          message = 'Assigned faculty is Inactive — the assignment moves to the Archive.';
        } else {
          message = 'Assigned faculty is ' + resolved.status + '.';
        }
        warnings.push({
          row: i + 2,
          course_code:  String(course_code).trim(),
          faculty_name: faculty_name ? String(faculty_name).trim() : '',
          status: resolved.status,
          message,
        });
      }
      records.push({
        course_code:  String(course_code).trim(),
        course_name:  course_name  ? String(course_name).trim()  : null,
        faculty_name: faculty_name ? String(faculty_name).trim() : null,
        ...resolved,
        // Spreadsheet YEAR LEVEL wins; otherwise keep the catalog-derived one.
        year_level: year_level ? String(year_level).trim() : resolved.year_level,
        date_assigned: faculty_name ? new Date() : null,
        period_id,
      });
    });

    if (records.length === 0) {
      return res.status(400).json({ message: 'No valid rows found.', headers, errors });
    }

    const removed = await safeDestroyByPeriod(CourseAssignment, period_id);
    const created = await CourseAssignment.bulkCreate(records);

    res.status(201).json({
      replaced: removed,
      inserted: created.length,
      skipped:  errors.length,
      warnings,
      errors,
      headers,
    });
  } catch (err) {
    res.status(400).json({ message: describeSequelizeError(err) });
  } finally {
    safeUnlink(req.file && req.file.path);
  }
}
