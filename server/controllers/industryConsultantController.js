import { Op } from 'sequelize';
import db from '../models/index.js';
import { parseSheet, safeUnlink, pick } from '../utils/excelParser.js';
import { getPeriodId, safeWhereForPeriod } from '../utils/periodScope.js';
import { filterOneToExistingColumns, safeDestroyByPeriod, safeWhere } from '../utils/dbHelpers.js';
import { describeSequelizeError } from '../utils/uploadHelpers.js';
import { enforceLatestPeriod } from '../utils/latestPeriod.js';
import { isPreviewRequest, PreviewRows, previewResponse } from '../utils/importPreview.js';
import { beginImportBatch, beginManualBatch, completeImportBatch } from './importController.js';

const { IndustryConsultant, Course, ConsultantCourse, Faculty } = db;

/**
 * Normalise a person's name for fuzzy matching against the Faculty list —
 * drop common honorifics ("Dr.", "Prof.", "Engr."…) and collapse
 * punctuation/whitespace, so "Dr. Maria Santos" still matches a Faculty row
 * stored as "Maria Santos". Mirrors the Course Assignment controller.
 */
function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\b(dr|prof|professor|engr|engineer|atty|mr|mrs|ms|sir|maam|ma'?am)\.?\s+/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Map a matched Faculty member's status → the consultant's two-value status.
 * Only an ACTIVE faculty makes the consultant Active; every other faculty
 * status (On Leave / Emeritus / Inactive) makes the consultant Unavailable
 * (which archives the row). Callers only reach this with a real match.
 */
function consultantStatusForFaculty(facultyStatus) {
  return String(facultyStatus || '').trim().toLowerCase() === 'active' ? 'Active' : 'Unavailable';
}

/**
 * Build the period's Faculty lookup, keyed two ways — exact (trim+lowercase)
 * and honorific-stripped — so a consultant name resolves the same way the
 * Course Assignment page resolves its faculty.
 */
async function loadFacultyMap(period_id) {
  const fWhere = await safeWhere(Faculty, { period_id });
  const facultyList = await Faculty.findAll({ where: fWhere, attributes: ['id', 'name', 'status'] });
  const byName = new Map();
  const byNorm = new Map();
  for (const f of facultyList) {
    byName.set(String(f.name).trim().toLowerCase(), f);
    byNorm.set(normalizeName(f.name), f);
  }
  return { byName, byNorm };
}

// Resolve a consultant name against the Faculty map (exact, then normalised).
// Returns the Faculty row or null (null = "not in the Faculty list").
function matchFaculty(name, facultyMap) {
  if (!name) return null;
  return facultyMap.byName.get(String(name).trim().toLowerCase())
    || facultyMap.byNorm.get(normalizeName(name))
    || null;
}

/**
 * Re-derive each NON-overridden consultant's status from the matched Faculty
 * member and persist any change — so the consultant list stays linked to the
 * Faculty list on every load. A row the Program Head manually set
 * (status_overridden) is left untouched. An unmatched name is set blank.
 */
async function syncConsultantStatuses(rows, facultyMap) {
  for (const row of rows) {
    if (row.status_overridden) continue;
    const faculty = matchFaculty(row.name, facultyMap);
    const derived = faculty ? consultantStatusForFaculty(faculty.status) : null;
    if ((row.status || null) !== (derived || null)) {
      await row.update({ status: derived });
    }
  }
}

// Serialize a consultant row with the derived `in_faculty_list` flag the
// frontend uses to show the "name not in Faculty list" note in the Manage form.
function withFacultyFlag(row, facultyMap) {
  const json = row.toJSON();
  json.in_faculty_list = !!matchFaculty(row.name, facultyMap);
  return json;
}

/**
 * Find course codes already assigned to OTHER consultants in the same
 * period. A course offering can only be held by one consultant at a
 * time (exclusion rule), so the UI hides taken courses from the picker
 * and this is the server-side belt-and-suspenders check for races.
 *
 * Returns: [{ code, consultantId, consultantName }, ...]
 */
async function findCrossConsultantConflicts({ consultantId, periodId, codes }) {
  const requested = (Array.isArray(codes) ? codes : [])
    .map((c) => String(c).trim()).filter(Boolean);
  if (requested.length === 0) return [];

  const peers = await IndustryConsultant.findAll({
    where: { period_id: periodId, id: { [Op.ne]: consultantId } },
    attributes: ['id', 'name'],
    include: [{ model: ConsultantCourse, as: 'courseLinks', attributes: ['course_code'] }],
  });

  const requestedLower = new Set(requested.map((c) => c.toLowerCase()));
  const conflicts = [];
  for (const peer of peers) {
    for (const link of (peer.courseLinks || [])) {
      const code = link.course_code;
      if (code && requestedLower.has(String(code).toLowerCase())) {
        conflicts.push({ code, consultantId: peer.id, consultantName: peer.name });
      }
    }
  }
  return conflicts;
}

// Include used everywhere a consultant is returned so the frontend
// always gets the full list of assigned courses. The catalog's column names
// are aliased to the { id, code, title } shape the page already consumes.
const coursesInclude = {
  model: Course,
  as: 'courses',
  through: { attributes: [] },
  attributes: [['course_id', 'id'], ['course_no', 'code'], ['course_title', 'title']],
};

/**
 * Load the period's catalog courses keyed by lower-cased code — the same
 * lookup the picker's options are built from, so a code that the Program Head
 * can choose is a code that resolves here.
 */
async function loadCourseMap(periodId) {
  const where = await safeWhere(Course, { period_id: periodId });
  const courses = await Course.findAll({ where, attributes: ['course_id', 'course_no'] });
  return new Map(courses.map((c) => [String(c.course_no).toLowerCase(), c]));
}

/**
 * Replace a consultant's assigned-course links with `codes`.
 * Each code is resolved against the period's catalog; an unmatched code is
 * still stored (with a null FK) so the raw value is not lost.
 */
async function syncConsultantCourses(consultantId, periodId, codes) {
  const list = Array.isArray(codes)
    ? [...new Set(codes.map((c) => String(c).trim()).filter(Boolean))]
    : [];

  await ConsultantCourse.destroy({ where: { consultant_id: consultantId } });
  if (list.length === 0) return;

  const byCode = await loadCourseMap(periodId);

  const joinRows = list.map((code) => {
    const c = byCode.get(code.toLowerCase());
    return {
      consultant_id: consultantId,
      course_id: c ? c.course_id : null,
      course_code: c ? c.course_no : code,
    };
  });
  await ConsultantCourse.bulkCreate(joinRows);
}

export async function listConsultants(req, res, next) {
  try {
    const where = await safeWhereForPeriod(IndustryConsultant, req);
    const period_id = getPeriodId(req);
    const rows = await IndustryConsultant.findAll({
      where,
      order: [['name', 'ASC']],
      include: [coursesInclude],
    });
    // Per OVPAA spec: Industry Consultant table starts blank in every
    // new term. No clone-on-first-use here.
    //
    // Live link to the Faculty list: each non-overridden consultant's status
    // is re-derived from its matched faculty (Active → Active; any other
    // faculty status → Unavailable; unmatched → blank) on every load, so the
    // page reflects the current Faculty statuses without a manual re-sync.
    const facultyMap = period_id
      ? await loadFacultyMap(period_id)
      : { byName: new Map(), byNorm: new Map() };
    if (period_id && rows.length > 0) {
      await syncConsultantStatuses(rows, facultyMap);
    }
    res.json(rows.map((r) => withFacultyFlag(r, facultyMap)));
  } catch (err) { next(err); }
}

export async function getConsultant(req, res, next) {
  try {
    const row = await IndustryConsultant.findByPk(req.params.id, {
      include: [coursesInclude],
    });
    if (!row) return res.status(404).json({ message: 'Consultant not found' });
    const facultyMap = row.period_id
      ? await loadFacultyMap(row.period_id)
      : { byName: new Map(), byNorm: new Map() };
    res.json(withFacultyFlag(row, facultyMap));
  } catch (err) { next(err); }
}

export async function createConsultant(req, res) {
  try {
    const { name, assigned_course_code, assigned_course_codes } = req.body;
    const period_id = getPeriodId(req);
    if (!name)      return res.status(400).json({ message: 'name is required' });
    if (!period_id) return res.status(400).json({ message: 'period_id is required' });
    if (!(await enforceLatestPeriod(res, period_id))) return;
    // Status is auto-linked to the Faculty list (not taken from the request):
    // a matched faculty drives Active/Unavailable; an unmatched name stays
    // blank until the Program Head sets it in the Manage form.
    const facultyMap = await loadFacultyMap(period_id);
    const faculty = matchFaculty(name, facultyMap);
    const derivedStatus = faculty ? consultantStatusForFaculty(faculty.status) : null;
    const safe = await filterOneToExistingColumns(IndustryConsultant, {
      name, status: derivedStatus, status_overridden: false, assigned_course_code, period_id,
    });
    // Snapshot first, so a row added by hand is undoable the same way an
    // uploaded one is. Covers consultant_courses too, so undo also drops the
    // course links created below.
    const batch = await beginManualBatch('industry_consultants', period_id, name);

    const created = await IndustryConsultant.create(safe);
    if (Array.isArray(assigned_course_codes)) {
      await syncConsultantCourses(created.id, period_id, assigned_course_codes);
    }
    await completeImportBatch(batch, { added: 1 });

    const withCourses = await IndustryConsultant.findByPk(created.id, { include: [coursesInclude] });
    res.status(201).json(withFacultyFlag(withCourses, facultyMap));
  } catch (err) {
    res.status(400).json({ message: describeSequelizeError(err) });
  }
}

export async function updateConsultant(req, res) {
  try {
    const row = await IndustryConsultant.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Consultant not found' });
    const callerPeriod = getPeriodId(req);
    if (callerPeriod && row.period_id && row.period_id !== callerPeriod) {
      return res.status(403).json({ message: 'This consultant belongs to a different period; switch periods to edit it.' });
    }
    if (!(await enforceLatestPeriod(res, row.period_id || callerPeriod))) return;

    // Partial-update semantics: only copy keys that were sent.
    const editable = ['name', 'status'];
    const patch = {};
    for (const k of editable) {
      if (req.body[k] !== undefined) patch[k] = req.body[k] === '' ? null : req.body[k];
    }
    // A manual status edit in the Manage form pins the value: mark it
    // overridden so the Faculty auto-link stops overwriting it on load.
    if (req.body.status !== undefined) patch.status_overridden = true;
    const safe = await filterOneToExistingColumns(IndustryConsultant, patch);
    await row.update(safe);

    // Flipping a consultant to Unavailable releases their courses so
    // other consultants can pick them up (the row also moves to archive).
    if (patch.status === 'Unavailable') {
      await ConsultantCourse.destroy({ where: { consultant_id: row.id } });
    }

    // The assigned courses are managed through the join table.
    if (Array.isArray(req.body.assigned_course_codes)) {
      const conflicts = await findCrossConsultantConflicts({
        consultantId: row.id, periodId: row.period_id, codes: req.body.assigned_course_codes,
      });
      if (conflicts.length > 0) {
        return res.status(409).json({
          message: 'One or more courses are already assigned to another consultant in this period.',
          conflicts,
        });
      }
      await syncConsultantCourses(row.id, row.period_id, req.body.assigned_course_codes);
    }

    const facultyMap = await loadFacultyMap(row.period_id);
    const updated = await IndustryConsultant.findByPk(row.id, { include: [coursesInclude] });
    res.json(withFacultyFlag(updated, facultyMap));
  } catch (err) {
    res.status(400).json({ message: describeSequelizeError(err) });
  }
}

/**
 * PATCH /:id/assign — replace a consultant's assigned courses.
 * Accepts `assigned_course_codes` (array). The legacy singular
 * `assigned_course_code` is still accepted and treated as a 1-element list.
 */
export async function assignCourse(req, res) {
  try {
    let codes = req.body.assigned_course_codes;
    if (codes === undefined && req.body.assigned_course_code !== undefined) {
      codes = req.body.assigned_course_code ? [req.body.assigned_course_code] : [];
    }
    if (!Array.isArray(codes)) codes = [];

    const consultant = await IndustryConsultant.findByPk(req.params.id);
    if (!consultant) return res.status(404).json({ message: 'Consultant not found' });
    if (!(await enforceLatestPeriod(res, consultant.period_id))) return;

    // The Assign popup also chooses the consultant's status. Unavailable
    // automatically clears any assigned courses (and the UI disables the
    // course picker), so codes is ignored in that case.
    const nextStatus = req.body.status;
    if (nextStatus !== undefined) {
      // Manual status choice pins the value (stops Faculty auto-linking).
      await consultant.update({ status: nextStatus || null, status_overridden: true });
    }

    if (nextStatus === 'Unavailable') {
      await ConsultantCourse.destroy({ where: { consultant_id: consultant.id } });
    } else {
      const conflicts = await findCrossConsultantConflicts({
        consultantId: consultant.id, periodId: consultant.period_id, codes,
      });
      if (conflicts.length > 0) {
        return res.status(409).json({
          message: 'One or more courses are already assigned to another consultant in this period.',
          conflicts,
        });
      }
      await syncConsultantCourses(consultant.id, consultant.period_id, codes);
    }

    const facultyMap = await loadFacultyMap(consultant.period_id);
    const updated = await IndustryConsultant.findByPk(consultant.id, { include: [coursesInclude] });
    res.json(withFacultyFlag(updated, facultyMap));
  } catch (err) {
    res.status(400).json({ message: describeSequelizeError(err) });
  }
}

export async function deleteConsultant(req, res, next) {
  try {
    const row = await IndustryConsultant.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Consultant not found' });
    if (!(await enforceLatestPeriod(res, row.period_id))) return;
    // consultant_courses rows are removed via ON DELETE CASCADE.
    const n = await IndustryConsultant.destroy({ where: { id: req.params.id } });
    if (!n) return res.status(404).json({ message: 'Consultant not found' });
    res.status(204).end();
  } catch (err) { next(err); }
}

export async function uploadConsultants(req, res) {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
  const period_id = getPeriodId(req);
  if (!period_id) return res.status(400).json({ message: 'period_id is required (pass in form body).' });
  if (!(await enforceLatestPeriod(res, period_id))) {
    safeUnlink(req.file && req.file.path);
    return;
  }

  try {
    const { rows, headers } = parseSheet(req.file.path);

    const courseByCode = await loadCourseMap(period_id);

    // Faculty lookup so each uploaded consultant's status links to the Faculty
    // list: a matched faculty drives Active/Unavailable; an unmatched name
    // (not in the Faculty list) is left blank for the Program Head to resolve.
    const facultyMap = await loadFacultyMap(period_id);

    const records = [];   // { name, assigned_course_code, codes: [] }
    const errors  = [];
    // Every sheet row, valid or not, in sheet order — this is what the preview
    // table renders. Built in the SAME pass as `records` so the two can't drift.
    const preview = new PreviewRows();

    rows.forEach((row, i) => {
      const rowNum = i + 2;   // sheet row: the header is row 1
      const name = pick(row, 'name');
      const assigned = pick(row, 'assignedcourse', 'course');

      const cells = {
        Name:              name ? String(name).trim() : '',
        'Assigned Course': assigned ? String(assigned).trim() : '',
      };

      if (!name) {
        errors.push({ row: rowNum, message: 'Missing Name — skipped.' });
        preview.error(rowNum, cells, [
          { field: 'Name', message: 'Missing NAME — this row will be skipped.' },
        ]);
        return;
      }

      // The same two warnings the commit raises, surfaced before the write rather
      // than after it. Both still import — they just land needing manual attention.
      const rowWarnings = [];

      // Flag names that aren't in the Faculty list: they import fine but their
      // status can't be linked (left blank), so the Program Head must set it.
      if (!matchFaculty(name, facultyMap)) {
        const message = '"' + String(name).trim() + '" is not in this period\'s Faculty list; status left blank for manual assignment.';
        errors.push({ row: rowNum, message, level: 'warning' });
        rowWarnings.push({ field: 'Name', message });
      }
      // The "Assigned Course" cell may list several courses.
      const codes = assigned
        ? String(assigned).split(/[,;]/).map((s) => s.trim()).filter(Boolean)
        : [];
      codes.forEach((code) => {
        if (!courseByCode.get(code.toLowerCase())) {
          const message = 'Course "' + code + '" not found in this period\'s Courses; manual assignment required.';
          errors.push({ row: rowNum, message, level: 'warning' });
          rowWarnings.push({ field: 'Assigned Course', message });
        }
      });

      if (rowWarnings.length > 0) preview.warning(rowNum, cells, rowWarnings);
      else preview.ok(rowNum, cells);

      records.push({
        name: String(name).trim(),
        assigned_course_code: assigned ? String(assigned).trim() : null,
        codes,
      });
    });

    // ---------- PREVIEW: persist NOTHING and return before the snapshot ----------
    // Everything below this line writes — and this upload DESTROYS the period's
    // consultants (and their course links) before re-inserting.
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

    // Photograph the period BEFORE the destroy below — the snapshot covers
    // consultant_courses too, so undo restores the course links as well.
    const batch = await beginImportBatch('industry_consultants', period_id, req.file.originalname);

    // Replace the period's consultants (CASCADE clears their join rows),
    // then recreate each consultant with its course links.
    const removed = await safeDestroyByPeriod(IndustryConsultant, period_id);
    let inserted = 0;
    for (const rec of records) {
      const faculty = matchFaculty(rec.name, facultyMap);
      const status = faculty ? consultantStatusForFaculty(faculty.status) : null;
      const consultant = await IndustryConsultant.create({
        name: rec.name,
        assigned_course_code: rec.assigned_course_code,
        period_id,
        // Linked to the Faculty list: Active-faculty → Active, other faculty
        // statuses → Unavailable, name not in the Faculty list → blank.
        status,
        status_overridden: false,
      });
      inserted += 1;
      if (rec.codes.length > 0) {
        const joinRows = rec.codes.map((code) => {
          const c = courseByCode.get(code.toLowerCase());
          return {
            consultant_id: consultant.id,
            course_id: c ? c.course_id : null,
            course_code: c ? c.course_no : code,
          };
        });
        await ConsultantCourse.bulkCreate(joinRows);
      }
    }

    await completeImportBatch(batch, { inserted, replaced: removed });

    res.status(201).json({
      replaced: removed,
      inserted,
      skipped:  errors.filter((e) => e.level !== 'warning').length,
      warnings: errors.filter((e) => e.level === 'warning').length,
      errors,
      headers,
    });
  } catch (err) {
    res.status(400).json({ message: describeSequelizeError(err) });
  } finally {
    safeUnlink(req.file && req.file.path);
  }
}
