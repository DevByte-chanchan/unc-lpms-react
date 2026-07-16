/**
 * Course Assignment controller.
 *
 * The Course Assignment module owns its own table (course_offering_assignments),
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
import {
  looksLikeTeachingAssignment,
  parseTeachingAssignment,
  extractProgramAssignments,
  programCoursePrefixes,
} from '../utils/teachingAssignmentParser.js';
import { getPeriodId, safeWhereForPeriod } from '../utils/periodScope.js';
import { filterOneToExistingColumns, safeDestroyByPeriod, safeWhere } from '../utils/dbHelpers.js';
import { describeSequelizeError } from '../utils/uploadHelpers.js';
import { enforceLatestPeriod } from '../utils/latestPeriod.js';
import { isPreviewRequest, PreviewRows, previewResponse } from '../utils/importPreview.js';
import { beginImportBatch, beginManualBatch, completeImportBatch } from './importController.js';
import { courseSemesterOf, periodSemesterOf } from '../utils/courseSemester.js';
import { offeringIndexForPeriod } from '../utils/offeringLink.js';

const { CourseOfferingAssignment, Course, Faculty, AcademicPeriod, Program } = db;

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

  // (course × program) → offering. Needs the program as well as the course:
  // one course code maps to as many offerings as there are programs offering it.
  const offerings = await offeringIndexForPeriod(period_id);

  return { courseByCode, facultyByName, facultyByNorm, offerings };
}

/**
 * Normalise the contributors (co-teachers) list for storage.
 *
 * Accepts either plain name strings or { faculty_id, faculty_name } objects and
 * returns a clean JSON array of { faculty_id, faculty_name }, where faculty_id
 * is resolved against the period's Faculty list (null if the name is unmatched).
 *
 * Two invariants are enforced here so contributors stay purely additive:
 *   • A faculty can't be BOTH lead and contributor on the same course — any
 *     contributor matching the lead (by resolved id or normalised name) is
 *     dropped.
 *   • Duplicate contributors collapse to one (matched by id, else by name).
 *
 * Note: contributors never feed into status or the row count — that's the
 * caller's job; this only shapes the stored value.
 */
function normalizeContributors(raw, leadName, leadId, lists) {
  if (!Array.isArray(raw)) return [];
  const { facultyByName, facultyByNorm } = lists;
  const leadKey = leadName ? normalizeName(leadName) : null;

  const seenIds = new Set();
  const seenNames = new Set();
  const out = [];
  for (const c of raw) {
    const rawName = typeof c === 'string' ? c : (c && c.faculty_name);
    const name = rawName ? String(rawName).trim() : '';
    if (!name) continue;

    const norm = normalizeName(name);
    // Resolve against the master list so the stored id stays authoritative;
    // fall back to a caller-supplied id only when the name is unmatched.
    const match = facultyByName.get(name.toLowerCase()) || facultyByNorm.get(norm) || null;
    const fid = match ? match.id : ((c && c.faculty_id) || null);

    // Drop the lead (can't be its own contributor) — match by id or by name.
    if (leadId && fid && fid === leadId) continue;
    if (leadKey && norm === leadKey) continue;

    // Collapse duplicates.
    if (fid != null) { if (seenIds.has(fid)) continue; seenIds.add(fid); }
    else { if (seenNames.has(norm)) continue; seenNames.add(norm); }

    out.push({ faculty_id: fid, faculty_name: name });
  }
  return out;
}

/**
 * Resolve a course code + faculty name against the master-list maps and
 * derive { course_id, faculty_id, status }.
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
function resolveAssignment(courseCode, facultyName, lists, programId = null) {
  const { courseByCode, facultyByName, facultyByNorm, offerings } = lists;

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
    course_id: course ? course.course_id : null,
    // The (course × program) offering this assignment fills. Resolved here,
    // alongside course_id, so the two can never drift apart. Null when the
    // course is unmatched, OR when this program doesn't actually offer it —
    // both are legitimate "needs reconciling" states, not errors.
    pc_offering_id: course ? offerings.get(course.course_id, programId) : null,
    program_id: programId ?? null,
    faculty_id: faculty ? faculty.id : null,
    status,
    // Year level derived from the catalog course (the upload column, when
    // present, overrides this in the caller).
    year_level: course ? (course.year_lvl || null) : null,
  };
}

/**
 * Recompute each NON-archived row against the current catalog/faculty lists
 * and persist any change to status / course_id / faculty_id /
 * year_level. The single source of truth for both the live list and the
 * explicit Re-validate. Returns a { changed, summary } report.
 */
async function syncAssignmentsAgainstCatalog(rows, lists, periodId = null) {
  let changed = 0;
  const summary = {};
  for (const row of rows) {
    // NEVER rewrite a row against another period's catalog. `lists` is built for
    // ONE period; a row from a different one would be re-resolved to that
    // period's course and offering and then SAVED — which is exactly how
    // period-3 assignments ended up holding period-5 courses, and how the
    // globally-unique offering link came to block the Course Assignment upload
    // (see repairCrossPeriodAssignments in utils/rebuildOfferings.js).
    //
    // The caller already filters by period. This does not trust it to: that
    // filter runs through safeWhere, which silently drops a clause whose column
    // it cannot resolve, and when it did exactly that, this loop is what turned
    // a widened SELECT into permanent data corruption.
    if (periodId && row.period_id && Number(row.period_id) !== Number(periodId)) continue;

    // Manual removals (Edit → Remove) stay 'Archived'; everything else is
    // re-derived from the current catalog + faculty status on every load.
    if (row.status === 'Archived') { summary.Archived = (summary.Archived || 0) + 1; continue; }
    // Re-resolve against the row's OWN program — each assignment belongs to one.
    const resolved = resolveAssignment(row.course_code, row.faculty_name, lists, row.program_id ?? null);
    if (row.status !== resolved.status
      || row.course_id !== resolved.course_id
      || (row.pc_offering_id ?? null) !== (resolved.pc_offering_id ?? null)
      || row.faculty_id !== resolved.faculty_id
      || (row.year_level ?? null) !== (resolved.year_level ?? null)) {
      if (row.status !== resolved.status) changed++;
      await row.update(resolved);
    }
    summary[resolved.status] = (summary[resolved.status] || 0) + 1;
  }
  return { changed, summary };
}

export async function listCourseOfferingAssignments(req, res, next) {
  try {
    const where = await safeWhereForPeriod(CourseOfferingAssignment, req);
    const period_id = getPeriodId(req);
    // Per spec: the Course Assignment table starts blank each term —
    // no clone-on-first-use.
    const rows = await CourseOfferingAssignment.findAll({ where, order: [['course_code', 'ASC']] });

    // Live sync against the catalog: opening the page always reflects current
    // year levels + Verified/Pending/Flagged, without clicking Re-validate.
    if (period_id && rows.length > 0) {
      const lists = await loadMasterLists(period_id);
      await syncAssignmentsAgainstCatalog(rows, lists, period_id);
    }

    res.json(rows);
  } catch (err) { next(err); }
}

export async function getCourseOfferingAssignment(req, res, next) {
  try {
    const row = await CourseOfferingAssignment.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Course assignment not found' });
    res.json(row);
  } catch (err) { next(err); }
}

export async function createCourseOfferingAssignment(req, res) {
  try {
    const { course_code, course_name, faculty_name, contributors } = req.body;
    const period_id = getPeriodId(req);
    if (!course_code) return res.status(400).json({ message: 'course_code is required' });
    if (!period_id)   return res.status(400).json({ message: 'period_id is required' });
    if (!(await enforceLatestPeriod(res, period_id))) return;

    // Which program this assignment is for — an offering is (course × program),
    // so without it a course code can't identify a single offering.
    const program_id = req.body.program_id ? Number(req.body.program_id) : null;

    const lists = await loadMasterLists(period_id);
    const resolved = resolveAssignment(course_code, faculty_name, lists, program_id);

    const safe = await filterOneToExistingColumns(CourseOfferingAssignment, {
      course_code:  String(course_code).trim(),
      course_name:  course_name  ? String(course_name).trim()  : null,
      faculty_name: faculty_name ? String(faculty_name).trim() : null,
      ...resolved,
      // Co-teachers (non-lead) — deduped against the lead. Never touches status.
      contributors: normalizeContributors(contributors, faculty_name, resolved.faculty_id, lists),
      year_level: req.body.year_level ? String(req.body.year_level).trim() : resolved.year_level,
      // Stamp the assignment date when a faculty (stakeholder) is assigned.
      date_assigned: faculty_name ? new Date() : null,
      period_id,
    });
    // Snapshot first, so a row added by hand is undoable the same way an
    // uploaded one is.
    const batch = await beginManualBatch('course_offering_assignments', period_id, course_code);
    const created = await CourseOfferingAssignment.create(safe);
    await completeImportBatch(batch, { added: 1 });

    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ message: describeSequelizeError(err) });
  }
}

export async function updateCourseOfferingAssignment(req, res) {
  try {
    const row = await CourseOfferingAssignment.findByPk(req.params.id);
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

    // The effective lead after this patch (used both to recompute status and to
    // keep contributors deduped against the lead).
    const effectiveLead = patch.faculty_name !== undefined ? patch.faculty_name : row.faculty_name;
    let leadId = row.faculty_id;
    let listsCache = null;
    const getLists = async () => (listsCache ||= await loadMasterLists(row.period_id));

    if (req.body.status !== undefined) {
      // Explicit status change (e.g. the Edit modal's "Remove" → Archived):
      // respect it and skip re-validation so the chosen status sticks.
      patch.status = req.body.status;
    } else {
      // Re-resolve + recompute the status from the (possibly new) values.
      const course_code = patch.course_code !== undefined ? patch.course_code : row.course_code;
      // The row keeps its own program — editing a course code re-resolves the
      // offering within that same program.
      const resolved = resolveAssignment(course_code, effectiveLead, await getLists(), row.program_id ?? null);
      leadId = resolved.faculty_id;
      Object.assign(patch, resolved);
    }

    // Contributors are independent of status and the row count:
    //   • sent          → normalise + dedupe against the (effective) lead.
    //   • NOT sent, lead changed → keep existing, but drop anyone who just
    //     became the lead (preserve the can't-be-both invariant).
    //   • NOT sent, lead unchanged → leave untouched (don't wipe to []).
    if (req.body.contributors !== undefined) {
      patch.contributors = normalizeContributors(req.body.contributors, effectiveLead, leadId, await getLists());
    } else if (patch.faculty_name !== undefined && Array.isArray(row.contributors) && row.contributors.length) {
      patch.contributors = normalizeContributors(row.contributors, effectiveLead, leadId, await getLists());
    }

    // An explicitly-sent year_level wins over the catalog-derived one.
    if (req.body.year_level !== undefined) {
      patch.year_level = req.body.year_level === '' ? null : String(req.body.year_level).trim();
    }

    const safe = await filterOneToExistingColumns(CourseOfferingAssignment, patch);
    await row.update(safe);
    res.json(row);
  } catch (err) {
    res.status(400).json({ message: describeSequelizeError(err) });
  }
}

export async function deleteCourseOfferingAssignment(req, res, next) {
  try {
    const row = await CourseOfferingAssignment.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Course assignment not found' });
    if (!(await enforceLatestPeriod(res, row.period_id))) return;
    await CourseOfferingAssignment.destroy({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) { next(err); }
}

/**
 * Re-validate every (non-archived) assignment in a period against the
 * CURRENT catalog + faculty list, and persist the recomputed
 * status / course_id / faculty_id. Useful after the course
 * source changes (e.g. switching to the catalog) so stale "Verified"
 * rows whose course no longer exists drop to "Pending Match", and vice
 * versa. Returns a before/after summary.
 */
export async function revalidateCourseOfferingAssignments(req, res) {
  try {
    const period_id = getPeriodId(req);
    if (!period_id) return res.status(400).json({ message: 'period_id is required' });

    const where = await safeWhereForPeriod(CourseOfferingAssignment, req);
    const rows = await CourseOfferingAssignment.findAll({ where });
    const lists = await loadMasterLists(period_id);
    const { changed, summary } = await syncAssignmentsAgainstCatalog(rows, lists, period_id);
    res.json({ total: rows.length, changed, summary });
  } catch (err) {
    res.status(400).json({ message: describeSequelizeError(err) });
  }
}

export async function uploadCourseOfferingAssignments(req, res) {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
  const period_id = getPeriodId(req);
  if (!period_id) return res.status(400).json({ message: 'period_id is required (pass in form body).' });
  if (!(await enforceLatestPeriod(res, period_id))) {
    safeUnlink(req.file && req.file.path);
    return;
  }

  try {
    // The program these assignments are for. It comes from the Program Head
    // doing the upload (the page knows which program is selected), NOT from the
    // sheet — an offering is (course × program), so the course code alone can't
    // pick one out. Without it every row resolves to a course but to no
    // offering, and lands as unmatched for reconciliation.
    const program_id = req.body && req.body.program_id ? Number(req.body.program_id) : null;

    let rows;
    let headers;
    if (looksLikeTeachingAssignment(req.file.path)) {
      // Raw school "TEACHING ASSIGNMENT" export (grouped by faculty, no lead
      // column). Flatten it, keep only THIS program's courses (BSIT → BIT …),
      // and bring each course's faculty in as CONTRIBUTORS with the lead left
      // empty — the Program Head designates the lead afterwards, in the system.
      const program = program_id ? await Program.findByPk(program_id, { attributes: ['code'] }) : null;
      const prefixes = programCoursePrefixes(program && program.code);
      const parsed = parseTeachingAssignment(req.file.path);
      const extracted = extractProgramAssignments(parsed, prefixes);
      rows = extracted.map((e) => ({
        // Canonical keys the row loop reads via pick(); omitting a leadfaculty
        // key is what leaves Lead Faculty unset.
        coursecode:   e.course_code,
        coursename:   e.course_name,
        contributors: e.contributor_names.join('; '),
        yearlevel:    e.year_level,
      }));
      headers = ['Course Code', 'Course Name', 'Lead Faculty', 'Contributors', 'Year Level'];
    } else {
      ({ rows, headers } = parseSheet(req.file.path));
    }

    const lists = await loadMasterLists(period_id);

    const records  = [];
    const errors   = [];
    const warnings = [];
    // Every sheet row, valid or not, in sheet order — this is what the preview
    // table renders. Built in the SAME pass as `records` so the two can't drift.
    //
    // NB: resolution depends on `program_id` above, which arrives in the request
    // body — NOT the sheet. The client must send the same program_id on the
    // preview as on the commit, or every row resolves to no offering here and
    // then imports cleanly, and the preview would be lying in the worst
    // direction: warning about problems the real import won't have.
    const preview = new PreviewRows();

    // An offering has exactly ONE assignment (UNIQUE on program_course_offering_id),
    // so two sheet rows naming the same course are two rows fighting over one slot.
    // Caught here, the second one is a red row saying which row already claimed it.
    // Left to the database it was an unreadable 400 —
    //   Duplicate value for ca_offering_unique ("117")
    // — that killed the whole import and named a constraint no user has heard of.
    // First row in the sheet wins; the rest are reported and skipped.
    const offeringClaimedBy = new Map();   // pc_offering_id → sheet row number

    rows.forEach((row, i) => {
      const course_code  = pick(row, 'courseid', 'coursecode', 'code', 'courseno', 'coursenumber', 'subjectcode');
      const course_name  = pick(row, 'coursename', 'courseoffering', 'coursetitle', 'coursedescription', 'description', 'title', 'subjectname', 'name');
      // LEAD FACULTY is the assignment's lead (signatory); accept the older
      // "Assigned Faculty" wording too so legacy sheets still import.
      const faculty_name = pick(row, 'leadfaculty', 'leadfacultyname', 'lead', 'facultyname', 'facultynames', 'assignedfacultyname', 'assignedfacultynames', 'assignedfaculty', 'faculty', 'faculties', 'facultymember', 'instructorname', 'instructor', 'professor', 'teacher');
      // CONTRIBUTORS — co-teachers, semicolon/comma-separated (may be blank).
      const contributorsRaw = pick(row, 'contributors', 'contributor', 'coteachers', 'coteacher', 'cofaculty', 'contributingfaculty');
      const contributorNames = contributorsRaw
        ? String(contributorsRaw).split(/[;,]/).map((s) => s.trim()).filter(Boolean)
        : [];
      const year_level   = pick(row, 'yearlevel', 'yearlvl', 'yearlevelofcourse', 'year', 'level', 'yr');

      const cells = {
        'Course Code':  course_code ? String(course_code).trim() : '',
        'Course Name':  course_name ? String(course_name).trim() : '',
        'Lead Faculty': faculty_name ? String(faculty_name).trim() : '',
        Contributors:   contributorNames.length ? contributorNames.join(', ') : '',
        'Year Level':   year_level ? String(year_level).trim() : '',
      };

      if (!course_code) {
        errors.push({ row: i + 2, message: 'Missing Course ID — skipped.' });
        preview.error(i + 2, cells, [
          { field: 'Course Code', message: 'Missing COURSE ID — this row will be skipped.' },
        ]);
        return;
      }
      const resolved = resolveAssignment(course_code, faculty_name, lists, program_id);

      // Two rows, one offering — see offeringClaimedBy above. Unmatched rows
      // (pc_offering_id null) are exempt: they hold no slot, and MySQL allows any
      // number of NULLs in a unique index.
      if (resolved.pc_offering_id != null) {
        const claimedBy = offeringClaimedBy.get(resolved.pc_offering_id);
        if (claimedBy) {
          const message = 'This course is already assigned on row ' + claimedBy
            + ' — a course can only be assigned once. This row will be skipped.';
          errors.push({ row: i + 2, message });
          cells.Status = 'Duplicate';
          preview.error(i + 2, cells, [{ field: 'Course Code', message }]);
          return;
        }
        offeringClaimedBy.set(resolved.pc_offering_id, i + 2);
      }

      // The row's resolved state, so the preview can show WHERE it landed rather
      // than just whether it parsed.
      cells.Status = resolved.status;
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
        // Same reason, same wording — a row that isn't cleanly Active still
        // imports, so it is a warning, never an error.
        preview.warning(i + 2, cells, [{ field: 'Status', message }]);
      } else {
        preview.ok(i + 2, cells);
      }
      records.push({
        course_code:  String(course_code).trim(),
        course_name:  course_name  ? String(course_name).trim()  : null,
        faculty_name: faculty_name ? String(faculty_name).trim() : null,
        ...resolved,
        // Co-teachers (non-lead) — resolved + deduped against the lead. Never
        // affects status or the row count.
        contributors: normalizeContributors(contributorNames, faculty_name, resolved.faculty_id, lists),
        // Spreadsheet YEAR LEVEL wins; otherwise keep the catalog-derived one.
        year_level: year_level ? String(year_level).trim() : resolved.year_level,
        date_assigned: faculty_name ? new Date() : null,
        period_id,
      });
    });

    // ---------- PREVIEW: persist NOTHING and return before the snapshot ----------
    // Everything below this line writes — and this upload DESTROYS the period's
    // whole assignment list before re-inserting.
    if (isPreviewRequest(req)) {
      return previewResponse(res, {
        filename: req.file.originalname,
        headers,
        preview,
      });
    }

    if (records.length === 0) {
      return res.status(400).json({ message: 'No valid rows found.', headers, errors });
    }

    // Photograph the period BEFORE the destroy below — this upload replaces
    // the whole assignment list, so the snapshot is the only way back.
    const batch = await beginImportBatch('course_offering_assignments', period_id, req.file.originalname);

    const removed = await safeDestroyByPeriod(CourseOfferingAssignment, period_id);
    const created = await CourseOfferingAssignment.bulkCreate(records);

    await completeImportBatch(batch, { inserted: created.length, replaced: removed });

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
