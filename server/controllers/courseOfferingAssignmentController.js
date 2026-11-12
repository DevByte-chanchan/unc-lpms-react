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
  looksLikeSubjectOfferings,
  parseSubjectOfferings,
  readMatrix,
  readSubjectOfferingsPdf,
  looksLikeSubjectOfferingsMatrix,
  parseSubjectOfferingsMatrix,
  extractProgramAssignments,
  filterOfferingsForProgram,
  yearLevelFromCode,
} from '../utils/teachingAssignmentParser.js';
import {
  buildOfficialCourses, compareWithOfficial, sectionsOf, nameMatches, samePeople, matchFacultyName,
} from '../utils/officialMatch.js';
import { programCoursePrefixes, programKeyFromPrefixes } from '../utils/courseCodeRules.js';
import { hasPdfMagic } from '../middleware/upload.js';
import { PdfTableError } from '../utils/pdfTable.js';
import { displayName } from '../utils/nameCase.js';
import { deliveryFor, resendFor } from '../services/assignmentDelivery.js';
import { getPeriodId, safeWhereForPeriod } from '../utils/periodScope.js';
import { filterOneToExistingColumns, safeDestroyByPeriod, safeWhere } from '../utils/dbHelpers.js';
import { describeSequelizeError } from '../utils/uploadHelpers.js';
import { enforceLatestPeriod } from '../utils/latestPeriod.js';
import { isPreviewRequest, PreviewRows, previewResponse } from '../utils/importPreview.js';
import { beginImportBatch, beginManualBatch, completeImportBatch } from './importController.js';
import { courseSemesterOf, periodSemesterOf } from '../utils/courseSemester.js';
import { offeringIndexForPeriod } from '../utils/offeringLink.js';
import { markDirty, accountsInvolved, accountsOnRow } from '../services/notices.js';
import { recordChange, recordEvent, recordListChanges, historyFor, latestChanges } from '../services/assignmentHistory.js';
import { courseKey, sameLead, stateOf, programKey as programIdKey } from '../utils/assignmentDiff.js';
import { computeTeachingLoad, maxTeachingUnits } from '../utils/teachingLoad.js';
import { findScheduleConflicts } from '../utils/scheduleConflicts.js';

const { CourseOfferingAssignment, Course, Faculty, AcademicPeriod, Program } = db;

const actorOf = (req) => (req && req.user ? req.user.id : null);

// Every write here hands the people it touched to the notice worker
// (services/notices.js): after the undo window they get ONE email listing
// their courses — or nothing, when nothing really changed for them. Never
// throws: a problem here must not fail a write that already happened.
async function tell(accountIds, periodId, req) {
  try {
    await markDirty(accountIds, { periodId, senderId: req && req.user ? req.user.id : null });
  } catch (err) {
    console.error('[assignments] could not queue notices:', err.message);
  }
}

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

  // Registrar exports write names SURNAME first ("ARCILLA JOENHEL C."); the faculty
  // list writes them first-name first. findFaculty() falls back to an order- and
  // initial-insensitive match over facultyList.
  return { courseByCode, facultyByName, facultyByNorm, facultyList, offerings };
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
    const match = findFaculty(name, lists);
    const fid = match ? match.id : ((c && c.faculty_id) || null);

    // Drop the lead (can't be its own contributor) — match by id or by name.
    if (leadId && fid && fid === leadId) continue;
    if (leadKey && norm === leadKey) continue;

    // Collapse duplicates.
    if (fid != null) { if (seenIds.has(fid)) continue; seenIds.add(fid); }
    else { if (seenNames.has(norm)) continue; seenNames.add(norm); }

    // The faculty list's own spelling when matched; otherwise normal case, not ALL CAPS.
    out.push({ faculty_id: fid, faculty_name: match ? match.name : displayName(name) });
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
/** The faculty row a name means: exact, then honorifics stripped, then any word order / initials. */
function findFaculty(name, lists) {
  if (!name) return null;
  const { facultyByName, facultyByNorm, facultyList } = lists;
  return facultyByName.get(String(name).trim().toLowerCase())
    || facultyByNorm.get(normalizeName(name))
    || (facultyList ? matchFacultyName(name, facultyList) : null)
    || null;
}

function resolveAssignment(courseCode, facultyName, lists, programId = null) {
  const { courseByCode, offerings } = lists;

  const course = courseCode
    ? courseByCode.get(String(courseCode).trim().toLowerCase())
    : null;

  let faculty = null;
  if (facultyName) {
    faculty = findFaculty(facultyName, lists);
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
  // Rows rewritten in any way (status, course, offering, faculty, year level) —
  // a faculty member uploaded later now matching a row counts, even though the
  // status may not have moved. This is what decides whether anyone is told.
  let updated = 0;
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
      updated++;
      await row.update(resolved);
    }
    summary[resolved.status] = (summary[resolved.status] || 0) + 1;
  }
  return { changed, updated, summary };
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
      const { updated } = await syncAssignmentsAgainstCatalog(rows, lists, period_id);
      // Only when a row really moved (e.g. a faculty member uploaded later now
      // matches it). A plain page load with nothing changed queues nothing.
      // The viewer didn't make this change, so it isn't signed with their name.
      if (updated > 0) await tell(await accountsInvolved(period_id), period_id, null);
    }

    if (!period_id) return res.json(rows);
    // Each row also carries the newest history entry ("Last updated").
    const latest = await latestChanges(period_id).catch((err) => { console.error('[history] latest failed:', err.message); return new Map(); });
    // Was each Lead / Contributor told about the course? (services/assignmentDelivery.js)
    const delivery = await deliveryFor(rows, period_id).catch((err) => { console.error('[delivery] failed:', err.message); return new Map(); });
    res.json(rows.map((r) => {
      const plain = typeof r.get === 'function' ? r.get({ plain: true }) : { ...r };
      return { ...plain, last_change: latest.get(courseKey(plain)) || null, delivery: delivery.get(r.id) || null };
    }));
  } catch (err) { next(err); }
}

/**
 * The row for a per-row endpoint, after the same checks the edit uses: it
 * exists, and belongs to the caller's period (when one is given). `writable`
 * also requires the current term (enforceLatestPeriod). Sends the error and
 * returns null when a check fails.
 */
async function rowForRequest(req, res, { writable }) {
  const row = await CourseOfferingAssignment.findByPk(req.params.id);
  if (!row) { res.status(404).json({ message: 'Course assignment not found' }); return null; }
  const callerPeriod = getPeriodId(req);
  if (callerPeriod && row.period_id && Number(row.period_id) !== callerPeriod) {
    res.status(403).json({ message: 'This assignment belongs to a different period; switch periods to see it.' });
    return null;
  }
  if (writable && !(await enforceLatestPeriod(res, row.period_id || callerPeriod))) return null;
  return row;
}

/** POST /:id/notify { faculty_id } — send this course's notice / invitation again to one person. */
export async function resendAssignmentNotice(req, res, next) {
  try {
    const row = await rowForRequest(req, res, { writable: true });
    if (!row) return undefined;
    const facultyId = Number(req.body && req.body.faculty_id);
    const onRow = Number(row.faculty_id) === facultyId
      || (Array.isArray(row.contributors) ? row.contributors : []).some((c) => c && Number(c.faculty_id) === facultyId);
    if (!facultyId || !onRow) return res.status(400).json({ message: 'That person is not on this course.' });
    const r = await resendFor(row, facultyId, { senderId: req.user ? req.user.id : null });
    return res.status(r.status).json({ message: r.message });
  } catch (err) { return next(err); }
}

/** GET /:id/history — every change to this course this term, newest first. */
export async function getCourseOfferingAssignmentHistory(req, res, next) {
  try {
    const row = await rowForRequest(req, res, { writable: false });
    if (!row) return undefined;
    const entries = await historyFor({ periodId: row.period_id, programId: row.program_id, courseCode: row.course_code });
    return res.json({ course_code: row.course_code, entries });
  } catch (err) { return next(err); }
}

/**
 * GET /load?period_id=&program_id= — each faculty member on the program's
 * Active / On Leave assignments, with the units they lead across the whole
 * term (a person teaching in two programs carries both), their courses as
 * Lead and Contributor, and their official sections. Warn-only: the limit
 * (MAX_TEACHING_UNITS, default 24) never blocks a save.
 */
export async function getTeachingLoad(req, res, next) {
  try {
    const period_id = getPeriodId(req);
    if (!period_id) return res.status(400).json({ message: 'period_id is required' });
    const programId = Number(req.query.program_id) || null;
    const [rows, courses] = await Promise.all([
      CourseOfferingAssignment.findAll({ where: { period_id }, raw: true }),
      Course.findAll({ where: { period_id }, attributes: ['course_id', 'course_no', 'course_title', 'credit'], raw: true }),
    ]);
    const parsed = rows.map((r) => ({ ...r, contributors: typeof r.contributors === 'string' ? JSON.parse(r.contributors) : r.contributors, sections: typeof r.sections === 'string' ? JSON.parse(r.sections) : r.sections }));
    const load = computeTeachingLoad(parsed, courses, { programId, maxUnits: maxTeachingUnits() });
    return res.json({ period_id, program_id: programId, ...load });
  } catch (err) { return next(err); }
}

/**
 * GET /offered?period_id=&program_id= — the program's course offerings this
 * term (catalog courses of the term's semester, not archived, offered by the
 * program): { offered, codes }. The Course Assignment progress strip's "of N".
 */
export async function getOfferedCourses(req, res, next) {
  try {
    const period_id = getPeriodId(req);
    const program_id = Number(req.query.program_id) || null;
    if (!period_id || !program_id) return res.status(400).json({ message: 'period_id and program_id are required' });
    const period = await AcademicPeriod.findByPk(period_id, { attributes: ['semester'] });
    const termSem = period ? periodSemesterOf(period) : null;
    const courses = (await Course.findAll({ where: await safeWhere(Course, { period_id }), attributes: ['course_id', 'course_no', 'term', 'semester', 'archived'], raw: true }))
      .filter((c) => !c.archived && (!termSem || courseSemesterOf(c) === termSem));
    const offered = new Set((await db.ProgramCourseOffering.findAll({
      where: { program_id, course_id: courses.map((c) => c.course_id) }, attributes: ['course_id'], raw: true,
    })).map((o) => Number(o.course_id)));
    const codes = courses.filter((c) => offered.has(Number(c.course_id))).map((c) => c.course_no).sort();
    return res.json({ period_id, program_id, offered: codes.length, codes });
  } catch (err) { return next(err); }
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
    const batch = await beginManualBatch('course_offering_assignments', period_id, course_code, req.user);
    const created = await CourseOfferingAssignment.create(safe);
    await completeImportBatch(batch, { added: 1 });
    await recordChange(null, created, { source: 'manual', actorId: actorOf(req) });
    // The Lead and Contributors hear about it after the undo window.
    await tell(await accountsOnRow(created), period_id, req);

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

    // date_assigned is when the CURRENT Lead was assigned: re-stamp it only
    // when the Lead really changes (re-sending the same name keeps the date),
    // and clear it when the Lead is removed.
    // Earlier Leads and their dates stay in the history.
    if (req.body.faculty_name !== undefined
        && !sameLead({ faculty_name: row.faculty_name }, { faculty_name: patch.faculty_name })) {
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

    // The OLD Lead and Contributors, before the patch lands — whoever comes
    // off the course is told too ("removed from …").
    const before = await accountsOnRow(row);
    const beforeState = stateOf(row);
    const safe = await filterOneToExistingColumns(CourseOfferingAssignment, patch);
    await row.update(safe);
    // lead_changed / contributors_changed / course_changed / removed (Archived) /
    // restored (un-archived) — or nothing, when only the year level moved.
    await recordChange(beforeState, row, { source: 'manual', actorId: actorOf(req) });
    await tell([...before, ...(await accountsOnRow(row))], row.period_id || callerPeriod, req);
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
    const people = await accountsOnRow(row);
    await CourseOfferingAssignment.destroy({ where: { id: req.params.id } });
    await recordChange(row, null, { source: 'manual', actorId: actorOf(req) });
    await tell(people, row.period_id, req);
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
    const { changed, updated, summary } = await syncAssignmentsAgainstCatalog(rows, lists, period_id);
    // Only if something really moved: the diff then tells only the people
    // whose courses actually changed, and a no-op re-validate sends nothing.
    if (updated > 0) await tell(await accountsInvolved(period_id), period_id, req);
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
    // Extracted detail with no column to live in — returned in the payload,
    // never stored (sections, schedules, the sheet's own term, orphan rows).
    let extraction = { layout: 'flat', term: null, termSemester: null, orphans: [], sections: {} };

    const isStrap = looksLikeTeachingAssignment(req.file.path);
    const isOfferings = !isStrap && looksLikeSubjectOfferings(req.file.path);

    if (isStrap || isOfferings) {
      // Raw school export — "TEACHING ASSIGNMENT" (grouped by faculty) or
      // "SUBJECT OFFERINGS" (grouped by course, one block per section). Neither
      // is a flat table and neither has a lead column. Flatten it, keep only
      // THIS program's courses (BSIT → BIT, plus shared GEE / MATH blocks whose
      // SECTION says BSIT), ONE row per course (its sections and schedules are
      // not separate rows). The teacher named in the export is the LEAD FACULTY;
      // if several teach its sections, the one with the most sections leads and
      // the others are Contributors (the Program Head can change it in Edit).
      const program = program_id ? await Program.findByPk(program_id, { attributes: ['code'] }) : null;
      const prefixes = programCoursePrefixes(program && program.code);
      const programKey = programKeyFromPrefixes(prefixes);
      const parsed = isStrap
        ? parseTeachingAssignment(req.file.path)
        : parseSubjectOfferings(req.file.path);
      const extracted = extractProgramAssignments(parsed, prefixes, { programKey });
      rows = extracted.map((e) => ({
        // Canonical keys the row loop reads via pick().
        coursecode:   e.course_code,
        coursename:   e.course_name,
        leadfaculty:  e.lead_name || '',
        contributors: e.other_names.join('; '),
        yearlevel:    e.year_level,
        // Derived, never stored — drives the rule 2 / rule 3 preview warnings.
        _meta: { semester: e.semester, shared: e.shared, sections: e.sections, sectionsByName: e.sections_by_name, leadChosen: e.other_names.length > 0 },
      }));
      headers = ['Course Code', 'Course Name', 'Lead Faculty', 'Contributors', 'Year Level'];
      extraction = {
        layout:       parsed.layout,
        term:         parsed.term || null,
        termSemester: parsed.termSemester ?? null,
        orphans:      parsed.orphans || [],
        sections:     Object.fromEntries(extracted.map((e) => [e.course_code, e.sections])),
      };
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
      const rawLead = pick(row, 'leadfaculty', 'leadfacultyname', 'lead', 'facultyname', 'facultynames', 'assignedfacultyname', 'assignedfacultynames', 'assignedfaculty', 'faculty', 'faculties', 'facultymember', 'instructorname', 'instructor', 'professor', 'teacher');
      // CONTRIBUTORS — co-teachers, semicolon/comma-separated (may be blank).
      const contributorsRaw = pick(row, 'contributors', 'contributor', 'coteachers', 'coteacher', 'cofaculty', 'contributingfaculty');
      // Names as the Faculty list spells them; an unmatched registrar name in
      // normal case ("DANNY B. CASIMERO" → "Danny B. Casimero").
      const asListed = (n) => { const m = findFaculty(n, lists); return m ? m.name : displayName(String(n).trim()); };
      const faculty_name = rawLead ? asListed(rawLead) : rawLead;
      const contributorNames = contributorsRaw
        ? String(contributorsRaw).split(/[;,]/).map((s) => s.trim()).filter(Boolean).map(asListed)
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
      // Every reason this row is worth a second look, collected so one row
      // produces one preview entry however many things are off with it.
      const issues = [];
      const meta = row._meta || null;
      // Spreadsheet YEAR LEVEL wins; otherwise keep the catalog-derived one.
      const finalYearLevel = year_level ? String(year_level).trim() : resolved.year_level;

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
        issues.push({ field: 'Status', message });
      }

      // Several teachers share the course's sections: one leads (most sections),
      // the rest contribute. Say so, so the Program Head can confirm or change it.
      if (meta && meta.leadChosen && faculty_name) {
        const counts = Object.entries(meta.sectionsByName || {})
          .map(([n, secs]) => n + ' (' + secs.length + ' section' + (secs.length === 1 ? '' : 's') + ')').join(', ');
        issues.push({ field: 'Lead Faculty', message: 'Taught by ' + counts + '. Lead set to ' + String(faculty_name).trim() + ' (most sections); change it in Edit if needed.' });
      }

      // Rule 2 — the semester digit is derived for validation only. A code that
      // disagrees with the sheet's term is KEPT and flagged, never dropped.
      if (meta && meta.semester && extraction.termSemester
          && meta.semester !== extraction.termSemester) {
        const message = 'Code "' + String(course_code).trim() + '" reads as semester ' + meta.semester
          + ' but the upload term is semester ' + extraction.termSemester + '; imported as-is.';
        warnings.push({ row: i + 2, course_code: String(course_code).trim(), faculty_name: faculty_name ? String(faculty_name).trim() : '', status: resolved.status, message });
        issues.push({ field: 'Course Code', message });
      }

      // Rule 2 — a code with no digits (GEE-LITE) has no year level of its own.
      // The catalog fills it when the course matched; otherwise say so.
      if (!finalYearLevel) {
        const message = 'No year level for "' + String(course_code).trim()
          + '" — the code carries no year digit and no catalog course matched.';
        warnings.push({ row: i + 2, course_code: String(course_code).trim(), faculty_name: faculty_name ? String(faculty_name).trim() : '', status: resolved.status, message });
        issues.push({ field: 'Year Level', message });
      }

      // Rule 3 — a shared course (GEE, MATH) was attributed to this program by
      // its SECTION alone. It counts only if the program really offers it, so
      // one that resolves to no offering is called out as unresolved here
      // rather than silently passing as a normal course.
      if (meta && meta.shared && resolved.pc_offering_id == null) {
        const message = '"' + String(course_code).trim() + '" is a shared course assigned to this program by its '
          + 'section (' + (meta.sections || []).join(', ') + '), but no matching course offering exists for this '
          + 'program in this term — it needs reconciling.';
        warnings.push({ row: i + 2, course_code: String(course_code).trim(), faculty_name: faculty_name ? String(faculty_name).trim() : '', status: resolved.status, message });
        issues.push({ field: 'Course Code', message });
      }

      if (issues.length) preview.warning(i + 2, cells, issues);
      else preview.ok(i + 2, cells);

      records.push({
        course_code:  String(course_code).trim(),
        course_name:  course_name  ? String(course_name).trim()  : null,
        faculty_name: faculty_name ? String(faculty_name).trim() : null,
        ...resolved,
        // Co-teachers (non-lead) — resolved + deduped against the lead. Never
        // affects status or the row count.
        contributors: normalizeContributors(contributorNames, faculty_name, resolved.faculty_id, lists),
        year_level: finalYearLevel,
        date_assigned: faculty_name ? new Date() : null,
        period_id,
      });
    });

    // A continuation row with nothing above it to belong to is never invented
    // as its own course (rule 4) — it is reported instead.
    for (const o of extraction.orphans) {
      warnings.push({
        row: o.row, course_code: o.courseNo || '', status: 'Unassigned',
        message: o.reason === 'no-parent'
          ? 'Row ' + o.row + ' continues a course that has no row above it — skipped.'
          : 'Row ' + o.row + ' does not match the course above it (' + (o.parent || 'unknown') + ') — skipped.',
      });
    }

    // ---------- PREVIEW: persist NOTHING and return before the snapshot ----------
    // Everything below this line writes — and this upload DESTROYS the period's
    // whole assignment list before re-inserting.
    if (isPreviewRequest(req)) {
      return previewResponse(res, {
        filename: req.file.originalname,
        headers,
        preview,
        // Sections, the sheet's own term, and skipped continuation rows — all
        // extracted, none of it storable.
        extra: { extraction },
      });
    }

    if (records.length === 0) {
      return res.status(400).json({ message: 'No valid rows found.', headers, errors });
    }

    // Photograph the period BEFORE the destroy below — this upload replaces
    // the whole assignment list, so the snapshot is the only way back.
    const batch = await beginImportBatch('course_offering_assignments', period_id, req.file.originalname, req.user);

    // Everyone on the list BEFORE it is replaced — people the new file drops
    // must be told too — and everyone on it after.
    let involved = [];
    try { involved = await accountsInvolved(period_id); } catch (err) { console.error('[assignments] could not list accounts:', err.message); }

    // The list as it stands, by course, before the destroy below wipes it —
    // what the history compares against, and where an unchanged Lead's
    // date_assigned is carried over from.
    const previous = await CourseOfferingAssignment.findAll({ where: { period_id } });
    const previousByCourse = new Map();
    const anyPreviousByCourse = new Map();
    for (const old of previous) {
      if (old.status !== 'Archived') previousByCourse.set(courseKey(old), old);
      if (!anyPreviousByCourse.has(courseKey(old)) || old.status !== 'Archived') anyPreviousByCourse.set(courseKey(old), old);
    }
    for (const rec of records) {
      // Same course, same Lead → still the same assignment: keep WHEN that Lead
      // was assigned (re-uploading must not make everyone look newly assigned).
      const old = previousByCourse.get(courseKey(rec));
      if (old && rec.faculty_name && old.date_assigned && sameLead(old, rec)) rec.date_assigned = old.date_assigned;
      // The official match (when it last matched the registrar, who teaches
      // which sections) belongs to the course, not the row: carry it across.
      const prev = anyPreviousByCourse.get(courseKey(rec));
      if (prev) {
        rec.official_confirmed_at = prev.official_confirmed_at || null;
        rec.sections = prev.sections || null;
      }
    }

    const removed = await safeDestroyByPeriod(CourseOfferingAssignment, period_id);
    const created = await CourseOfferingAssignment.bulkCreate(records);

    await completeImportBatch(batch, { inserted: created.length, replaced: removed });
    // Only the real changes: a new course (assigned), a different Lead
    // (lead_changed), different Contributors, a course that's gone (removed).
    // The same file again writes nothing.
    await recordListChanges(previous, created, { source: 'upload', actorId: actorOf(req), note: req.file.originalname });
    try { involved = [...involved, ...(await accountsInvolved(period_id))]; } catch (err) { console.error('[assignments] could not list accounts:', err.message); }
    await tell(involved, period_id, req);

    res.status(201).json({
      replaced: removed,
      inserted: created.length,
      skipped:  errors.length,
      warnings,
      errors,
      headers,
      extraction,
    });
  } catch (err) {
    res.status(400).json({ message: describeSequelizeError(err) });
  } finally {
    safeUnlink(req.file && req.file.path);
  }
}

/**
 * POST /compare-official — compare this program's pre-assignment with the
 * registrar's SUBJECT OFFERINGS export (the official assignment, out at the end
 * of enrollment). multipart: file, period_id, program_id; ?preview=1 for the
 * dry run. utils/officialMatch.js does the comparison:
 *
 *   confirmed    Lead + Contributors = the official set
 *   differs      Accept → the official set (adds / removes people; a Lead who
 *                isn't official must be replaced by one picked from the set)
 *   not_offered  keep (default) or archive
 *   new          Accept → added with the official faculty as Contributors, Lead empty
 *
 * The commit takes `decisions` (JSON): [{ course_code, action, lead_name? }],
 * action accept | skip for differs / new, keep | archive for not_offered. It
 * re-parses the file itself (never trusts the client's copy of the
 * suggestions) and writes everything as ONE undoable batch. Confirmed and
 * updated courses get official_confirmed_at = now and their `sections`; the
 * history records official_confirmed / official_updated (source official_match).
 */
export async function compareOfficialOfferings(req, res) {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
  const period_id = getPeriodId(req);
  if (!period_id) { safeUnlink(req.file.path); return res.status(400).json({ message: 'period_id is required.' }); }
  if (!(await enforceLatestPeriod(res, period_id))) { safeUnlink(req.file.path); return undefined; }

  try {
    const program_id = req.body && req.body.program_id ? Number(req.body.program_id) : null;
    const program = program_id ? await Program.findByPk(program_id, { attributes: ['id', 'code'] }) : null;
    if (!program) return res.status(400).json({ message: 'Pick the program to compare (program_id).' });
    // A spreadsheet, or the same export as a PDF: both become one matrix.
    const isPdf = hasPdfMagic(req.file.path);
    if (!isPdf && /\.pdf$/i.test(req.file.originalname || '')) {
      return res.status(400).json({ message: "This file is named .pdf but isn't a PDF." });
    }
    const matrix = isPdf ? await readSubjectOfferingsPdf(req.file.path) : readMatrix(req.file.path);
    if (!looksLikeSubjectOfferingsMatrix(matrix)) {
      return res.status(400).json({
        message: isPdf
          ? "This PDF isn't the registrar's SUBJECT OFFERINGS (a table with CODE | COURSE NO | … | FACULTY). If it's the Program of Study, upload it in Course Offerings instead."
          : "This isn't the registrar's SUBJECT OFFERINGS export (CODE | COURSE NO | … | FACULTY). Download it from the registrar and try again.",
      });
    }

    // The same reading the Course Assignment upload uses, filtered to the program.
    const prefixes = programCoursePrefixes(program.code);
    const progKey = programKeyFromPrefixes(prefixes);
    const parsed = parseSubjectOfferingsMatrix(matrix);
    if (isPdf && parsed.offerings.length && !parsed.faculty.length) {
      return res.status(400).json({ message: "This PDF has no FACULTY names in the table. If its columns were cut off onto another page, print it again with \"Fit to page width\" (landscape) and upload that." });
    }
    const extracted = extractProgramAssignments(parsed, prefixes, { programKey: progKey });
    const offerings = filterOfferingsForProgram(parsed.offerings, { prefixes, programKey: progKey });
    const facultyList = await Faculty.findAll({ where: await safeWhere(Faculty, { period_id }), attributes: ['id', 'name', 'status'] });
    const official = buildOfficialCourses(extracted, offerings, facultyList);
    const officialOf = (code) => official.find((c) => String(c.course_code).toUpperCase() === String(code).toUpperCase()) || null;

    const programRows = (await CourseOfferingAssignment.findAll({ where: { period_id } }))
      .filter((r) => programIdKey(r.program_id) === programIdKey(program.id));
    const live = programRows.filter((r) => r.status !== 'Archived');
    const comparison = compareWithOfficial(live.map((r) => r.get({ plain: true })), official);

    const counts = { confirmed: 0, differs: 0, not_offered: 0, new: 0 };
    comparison.forEach((r) => { counts[r.case] += 1; });

    // Same person, same day, overlapping times — across the WHOLE file (they may
    // also teach in another program), reported when one side is this program's.
    // Information only: never blocks Apply.
    const programCourseNos = new Set(offerings.map((o) => o.courseNo));
    let schedule_conflicts = [];
    try {
      schedule_conflicts = findScheduleConflicts(parsed.offerings, {
        relevant: (o) => programCourseNos.has(o.courseNo),
        nameOf: (n) => { const f = matchFacultyName(n, facultyList); return displayName(f ? f.name : n); },
      });
    } catch (err) {
      console.error('[compare] schedule conflicts skipped:', err.message);
    }

    if (isPreviewRequest(req)) {
      // A file for the other semester would make every course "not offered".
      const period = await AcademicPeriod.findByPk(period_id, { attributes: ['label', 'semester'] });
      const termSem = period ? periodSemesterOf(period) : null;
      const term_mismatch = (parsed.termSemester && termSem && Number(parsed.termSemester) !== termSem)
        ? 'This file is for "' + parsed.term + '" but the current term is ' + period.label + '.'
        : null;
      return res.json({
        preview: true,
        filename: req.file.originalname,
        term_mismatch,
        term: parsed.term || null,
        program: program.code,
        counts,
        // Registrar names that matched no one in this term's faculty list.
        unmatched: [...new Set(official.flatMap((c) => c.people.filter((p) => !p.matched).map((p) => p.registrar_name)))],
        schedule_conflicts,
        rows: comparison,
      });
    }

    // ---------- COMMIT ----------
    let decisions = req.body && req.body.decisions;
    try { decisions = typeof decisions === 'string' ? JSON.parse(decisions) : decisions; } catch { decisions = null; }
    const decisionBy = new Map((Array.isArray(decisions) ? decisions : [])
      .filter((d) => d && d.course_code)
      .map((d) => [String(d.course_code).trim().toUpperCase(), d]));
    const decide = (row) => decisionBy.get(String(row.course_code).toUpperCase()) || {};

    // Validate everything BEFORE the batch: a Lead pick must be someone official.
    const errors = [];
    const plan = [];
    for (const row of comparison) {
      const d = decide(row);
      if (row.case === 'confirmed') { plan.push({ row, op: 'confirm' }); continue; }
      if (row.case === 'not_offered') { if (d.action === 'archive') plan.push({ row, op: 'archive' }); continue; }
      if (d.action !== 'accept') continue;   // differs / new: skipped unless accepted
      if (row.no_official_faculty) continue; // nobody named by the registrar yet: nothing to apply
      const officialPeople = (officialOf(row.course_code) || { people: [] }).people;
      let lead = row.proposed ? row.proposed.lead : null;
      if (d.lead_name) {
        const pick = officialPeople.find((p) => nameMatches(p.faculty_name, d.lead_name) || nameMatches(p.registrar_name, d.lead_name));
        if (!pick) { errors.push({ course_code: row.course_code, message: d.lead_name + ' is not teaching ' + row.course_code + ' in the official list.' }); continue; }
        lead = { faculty_id: pick.faculty_id, faculty_name: pick.faculty_name };
      }
      if (row.case === 'differs' && !lead) {
        errors.push({ course_code: row.course_code, message: 'Pick a Lead for ' + row.course_code + ' from the official faculty.' });
        continue;
      }
      plan.push({ row, op: row.case === 'new' ? 'add' : 'update', lead, people: officialPeople });
    }
    if (errors.length) {
      return res.status(400).json({ message: errors.map((e) => e.message).join(' '), errors });
    }

    // One snapshot for the whole compare, so one Undo takes it all back.
    const batch = await beginImportBatch('course_offering_assignments', period_id, req.file.originalname, req.user);
    const lists = await loadMasterLists(period_id);
    const now = new Date();
    const opts = { source: 'official_match', actorId: actorOf(req), note: req.file.originalname };
    const byId = new Map(programRows.map((r) => [r.id, r]));
    const touched = [];
    const applied = { confirmed: 0, updated: 0, added: 0, archived: 0 };

    // People already on a row, as { faculty_id, faculty_name } — whose spelling wins.
    const peopleOn = (r) => (r ? [
      ...(r.faculty_name ? [{ faculty_id: r.faculty_id, faculty_name: r.faculty_name }] : []),
      ...(Array.isArray(r.contributors) ? r.contributors : []),
    ] : []);
    // `sections` under the names the table shows (the row's own spelling, not the registrar's).
    const sectionsFor = (code, r) => sectionsOf(officialOf(code)).map((s) => {
      const same = peopleOn(r).find((a) => samePeople(a, s));
      return same ? { ...s, faculty_name: same.faculty_name, faculty_id: same.faculty_id ?? s.faculty_id } : s;
    });

    for (const step of plan) {
      const { row } = step;
      const existing = row.assignment_id ? byId.get(row.assignment_id) : null;
      const sections = sectionsFor(row.course_code, existing);

      if (step.op === 'confirm') {
        const wasConfirmed = !!existing.official_confirmed_at;
        await existing.update({ official_confirmed_at: now, sections });
        if (!wasConfirmed) await recordEvent(existing, 'official_confirmed', opts);
        applied.confirmed += 1;
        continue;
      }
      if (step.op === 'archive') {
        touched.push(...(await accountsOnRow(existing)));
        const before = stateOf(existing);
        await existing.update({ status: 'Archived' });
        await recordChange(before, existing, opts);
        applied.archived += 1;
        continue;
      }

      // An archived row for the course comes back, rather than colliding with it.
      const target = existing || programRows.find((r) => r.status === 'Archived'
        && String(r.course_code).toUpperCase() === String(row.course_code).toUpperCase()) || null;
      // Someone already on the course keeps the spelling they have; only new
      // people come in as the faculty list (or, unmatched, the registrar) writes them.
      const already = peopleOn(target);
      const spelled = (p) => (already.find((a) => samePeople(a, p)) || p).faculty_name;
      // update / add: the Lead, and everyone else official as Contributors.
      const leadName = step.lead ? spelled(step.lead) : null;
      const contributorNames = step.people
        .filter((p) => !(step.lead && samePeople(step.lead, p)))
        .map(spelled);
      const resolved = resolveAssignment(row.course_code, leadName, lists, program.id);
      if (resolved.year_level == null) delete resolved.year_level;
      const fields = {
        faculty_name: leadName,
        ...resolved,
        contributors: normalizeContributors(contributorNames, leadName, resolved.faculty_id, lists),
        official_confirmed_at: now,
        sections: sectionsFor(row.course_code, target),
      };

      if (target) {
        if (!sameLead(target, { faculty_name: leadName })) fields.date_assigned = leadName ? now : null;
        touched.push(...(await accountsOnRow(target)));
        const before = stateOf(target);
        await target.update(await filterOneToExistingColumns(CourseOfferingAssignment, fields));
        await recordChange(before, target, { ...opts, action: 'official_updated' });
        touched.push(...(await accountsOnRow(target)));
        applied[existing ? 'updated' : 'added'] += 1;
      } else {
        const off = officialOf(row.course_code);
        const created = await CourseOfferingAssignment.create(await filterOneToExistingColumns(CourseOfferingAssignment, {
          course_code: String(row.course_code).trim(),
          course_name: row.course_name || (off && off.course_name) || null,
          year_level: yearLevelFromCode(row.course_code) || null,
          ...fields,
          date_assigned: leadName ? now : null,
          period_id,
        }));
        await recordChange(null, created, { ...opts, action: 'official_updated', note: 'Added from the official Subject Offerings (' + req.file.originalname + ')' });
        touched.push(...(await accountsOnRow(created)));
        applied.added += 1;
      }
    }

    await completeImportBatch(batch, { ...applied, source: 'official_match' });
    await tell(touched, period_id, req);
    return res.status(201).json({ applied, skipped: comparison.length - plan.length, counts });
  } catch (err) {
    if (err instanceof PdfTableError) return res.status(err.status).json({ message: err.message });
    return res.status(400).json({ message: describeSequelizeError(err) });
  } finally {
    safeUnlink(req.file && req.file.path);
  }
}
