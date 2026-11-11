/**
 * Course Offerings upload, PDF path — the registrar's Program of Study.
 *
 * Reached through POST /api/courses/upload when the picked files are PDFs (one
 * or both halves: 1st–2nd Year, 3rd–4th Year). Same two halves as every upload:
 *
 *   PREVIEW (?preview=1)  parse + check + reconcile, write NOTHING, store nothing
 *   COMMIT                snapshot (undo) → upsert the selected semester's courses
 *                         → archive the leftovers the Program Head ticked, after
 *                         moving their links → keep the PDFs → complete the batch
 *
 * The term fixes the semester: a 1st Semester term imports every year's FIRST
 * SEMESTER table and nothing else. Existing courses of this program that the
 * PDF doesn't list for this semester are offered back in "Not in the Program of
 * Study", each ticked Archive or Keep (see utils/courseReconcile.js).
 */
import fs from 'node:fs/promises';
import db from '../models/index.js';
import { getPeriodId } from '../utils/periodScope.js';
import { safeUnlink, canonicalize } from '../utils/excelParser.js';
import { describeSequelizeError } from '../utils/uploadHelpers.js';
import { hasPdfMagic } from '../middleware/upload.js';
import { PreviewRows, previewResponse } from '../utils/importPreview.js';
import { beginImportBatch, completeImportBatch } from './importController.js';
import { parseProgramOfStudyPdf, yearLabel, semesterLabel } from '../utils/programOfStudyParser.js';
import { checkProgramOfStudy, numbersOfRow } from '../utils/programOfStudyChecks.js';
import { formatCredit, formatContactHrs } from '../utils/courseNumbers.js';
import { programCoursePrefixes } from '../utils/courseCodeRules.js';
import {
  findMatch, mergeCourseLinks, linkCounts, programCoursesInTerm, codeKey,
} from '../utils/courseReconcile.js';
import { storeDocuments } from '../services/curriculumDocuments.js';

const { Course, Prerequisite, ProgramCourseOffering, AcademicPeriod, CourseOfferingAssignment, Program } = db;

const YEAR_LONG = ['', 'FIRST YEAR', 'SECOND YEAR', 'THIRD YEAR', 'FOURTH YEAR'];
const isPreviewReq = (req) => ['1', 'true', 'yes'].includes(
  String((req.query && req.query.preview) || (req.body && req.body.preview) || '').toLowerCase(),
);
const parseJson = (s, fallback) => { try { return s ? JSON.parse(s) : fallback; } catch { return fallback; } };

const semesterOfPeriod = (p) => {
  const s = String((p && p.semester) || '').toLowerCase().trim();
  return (s === '2' || s.includes('2nd') || s.includes('second')) ? 2 : 1;
};

class PdfUploadError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

/** Parse every uploaded PDF (in year order) or throw a 4xx with the reason. */
async function readFiles(files) {
  const parsed = [];
  for (const f of files) {
    if (!hasPdfMagic(f.path)) throw new PdfUploadError('"' + f.originalname + '" isn\'t a real PDF file.');
    let p;
    try {
      p = await parseProgramOfStudyPdf(await fs.readFile(f.path));
    } catch (err) {
      throw new PdfUploadError('"' + f.originalname + '": ' + (err.message || 'could not be read.'), err.status || 422);
    }
    parsed.push({ file: f, parsed: p });
  }
  parsed.sort((a, b) => (a.parsed.years_covered[0] || 9) - (b.parsed.years_covered[0] || 9));
  const seen = new Set();
  for (const { file, parsed: p } of parsed) {
    if (seen.has(p.sha256)) throw new PdfUploadError('"' + file.originalname + '" was picked twice.');
    seen.add(p.sha256);
  }
  return parsed;
}

/** Program-level notes: header mismatches between files, or against the program being viewed. */
function headerNotes(parsed, program) {
  const notes = [];
  const revs = new Set(parsed.map((x) => x.parsed.header.revision || '?'));
  if (revs.size > 1) notes.push('The files are different revisions (' + [...revs].join(', ') + '). Upload the two halves of the same revision.');
  const names = new Set(parsed.map((x) => canonicalize(x.parsed.header.program_name || '')).filter(Boolean));
  if (names.size > 1) notes.push('The files are for different programs.');
  if (program && program.name && names.size === 1) {
    const pdf = [...names][0];
    const mine = canonicalize(program.name);
    const words = (s) => s.replace(/^(bachelorofscience|bs)/, '');
    if (pdf && mine && !(pdf.includes(words(mine)) || mine.includes(words(pdf)))) {
      notes.push('This Program of Study is for "' + parsed[0].parsed.header.program_name + '", but you are importing into ' + program.code + ' (' + program.name + ').');
    }
  }
  const years = parsed.flatMap((x) => x.parsed.years_covered);
  const dupYears = years.filter((y, i) => years.indexOf(y) !== i);
  if (dupYears.length) notes.push('Two files both contain ' + [...new Set(dupYears)].map(yearLabel).join(', ') + '.');
  return notes;
}

/** Units / hours cells for the preview table. */
function numberCells(c) {
  const n = numbersOfRow(c);
  const units = c.nonCredit
    ? '(' + c.lec + ') non-credit'
    : c.lec + ' LEC + ' + c.lab + ' LAB = ' + (c.lec + c.lab);
  return {
    Units: units,
    Hours: n ? n.hrs_per_week + '/wk · ' + n.contact_hrs_semester + '/sem' : '',
    Instructional: n ? n.instructional_hrs + ' h' : '',
  };
}

/** Selected-semester summary: count, units, hrs/week, and the same per year. */
function semesterSummary(rows, semester) {
  const byYear = new Map();
  const total = { courses: 0, units: 0, hrs: 0 };
  for (const c of rows) {
    const units = c.nonCredit ? 0 : c.lec + c.lab;
    total.courses += 1; total.units += units; total.hrs += c.hrs || 0;
    if (!byYear.has(c.year)) byYear.set(c.year, { year: c.year, label: yearLabel(c.year), courses: 0, units: 0, hrs: 0 });
    const y = byYear.get(c.year);
    y.courses += 1; y.units += units; y.hrs += c.hrs || 0;
  }
  return { semester, label: semesterLabel(semester), ...total, byYear: [...byYear.values()].sort((a, b) => a.year - b.year) };
}

/**
 * The "Not in the Program of Study" list: this program's active courses in the
 * term that the PDF doesn't import for this semester.
 */
async function reconcileList({ periodId, programId, selected, allCourses }) {
  const importing = new Set(selected.map((c) => codeKey(c.code)));
  const kept = selected.map((c) => ({ code: c.code, title: c.title, year: c.year }));
  const elsewhere = allCourses
    .filter((c) => !importing.has(codeKey(c.code)))
    .map((c) => ({ code: c.code, title: c.title, year: c.year, semester: c.semester }));
  const existing = await programCoursesInTerm(periodId, programId);
  const out = [];
  for (const c of existing) {
    if (importing.has(codeKey(c.course_no))) continue;
    const m = findMatch(c, kept, elsewhere);
    const counts = await linkCounts(c);
    let reason;
    if (m && m.kind === 'duplicate') reason = 'Duplicate of ' + m.target.code;
    else if (m) reason = 'Belongs to ' + yearLabel(m.target.year) + ' · ' + semesterLabel(m.target.semester)
      + (codeKey(m.target.code) === codeKey(c.course_no) ? '' : ' (' + m.target.code + ')');
    else reason = 'Not in the curriculum — check it';
    out.push({
      course_id: c.course_id,
      course_no: c.course_no,
      course_title: c.course_title,
      year_lvl: c.year_lvl,
      kind: m ? m.kind : 'unknown',
      match_code: m ? m.target.code : null,
      reason,
      decision: m ? 'archive' : 'keep',
      links: counts,
    });
  }
  return out.sort((a, b) => String(a.course_no).localeCompare(String(b.course_no), undefined, { numeric: true }));
}

export async function uploadProgramOfStudy(req, res, files) {
  try {
    const periodId = getPeriodId(req);
    const programId = Number((req.query && req.query.programId) || (req.body && req.body.programId)) || null;
    if (!periodId) throw new PdfUploadError('Pick an academic term first.');
    if (!programId) throw new PdfUploadError('Open your program first: a Program of Study is imported into one program.');
    const program = await Program.findByPk(programId, { attributes: ['id', 'code', 'name', 'period_id'], raw: true });
    if (!program) throw new PdfUploadError('That program was not found.', 404);
    const period = await AcademicPeriod.findByPk(periodId, { attributes: ['id', 'semester', 'label', 'school_year'], raw: true });
    const semester = semesterOfPeriod(period);
    const term = (period && period.label) || null;

    const parsed = await readFiles(files);
    const pdfs = parsed.map((x) => x.parsed);
    const allCourses = pdfs.flatMap((p) => p.courses);
    const selected = allCourses.filter((c) => c.semester === semester).sort((a, b) => a.year - b.year);
    const checks = checkProgramOfStudy(pdfs, { prefixes: programCoursePrefixes(program.code), programCode: program.code });
    const notes = headerNotes(parsed, program);
    const header = pdfs[0].header;
    const documents = parsed.map(({ file, parsed: p }) => ({
      name: file.originalname, part_label: p.part_label, years: p.years_covered, pages: p.pages,
      sha256: p.sha256, program_name: p.header.program_name, cmo: p.header.cmo,
      effectivity: p.header.effectivity, revision: p.header.revision,
    }));

    // ---------- PREVIEW: nothing is written and no file is kept ----------
    if (isPreviewReq(req)) {
      const preview = new PreviewRows();
      selected.forEach((c, i) => {
        const cells = {
          'Course No.': c.code,
          'Course Title': c.title,
          'Year Level': yearLabel(c.year),
          ...numberCells(c),
          Prerequisites: c.prereqRaw || '',
        };
        const issues = (checks.rows.get(codeKey(c.code)) || []).map((x) => ({ field: x.field, message: x.message, level: x.level }));
        if (issues.length) preview.warning(i + 1, cells, issues);
        else preview.ok(i + 1, cells);
      });
      const reconcile = await reconcileList({ periodId, programId, selected, allCourses });
      return previewResponse(res, {
        filename: parsed.map((x) => x.file.originalname).join(' + '),
        headers: Object.keys((preview.rows[0] && preview.rows[0].cells) || {}),
        preview,
        extra: {
          sheetLayout: 'program-of-study',
          total: selected.length,
          recognizedCount: selected.length,
          unassigned: [],
          programOfStudy: {
            header,
            documents,
            notes,
            semester,
            semesterLabel: semesterLabel(semester),
            summary: semesterSummary(selected, semester),
            checks: {
              semesters: checks.semesters.filter((s) => !s.ok).map((s) => ({ label: s.label, issues: s.issues })),
              years: checks.years,
              program: checks.program,
            },
            reconcile,
          },
        },
      });
    }

    // ---------- COMMIT ----------
    if (selected.length === 0) {
      throw new PdfUploadError('The Program of Study has no ' + semesterLabel(semester) + ' courses to import for this term.');
    }
    const decisions = parseJson(req.body && req.body.reconcile, {});
    const archiveIds = new Set((Array.isArray(decisions.archive) ? decisions.archive : []).map(Number));
    // Worked out again, never trusted from the client: only listed courses can be archived.
    const reconcile = await reconcileList({ periodId, programId, selected, allCourses });

    const batch = await beginImportBatch('courses', periodId, parsed.map((x) => x.file.originalname).join(' + '), req.user);
    const revisionNumber = parseInt(header.revision, 10) || 1;

    const existing = await Course.findAll({ where: { period_id: periodId } });
    const byNo = new Map();
    // One course per code in a term: the active row wins over an archived one.
    for (const c of existing.sort((a, b) => Number(a.archived) - Number(b.archived))) {
      const k = codeKey(c.course_no);
      if (!byNo.has(k)) byNo.set(k, c);
    }

    let inserted = 0;
    let updated = 0;
    let offeringsCreated = 0;
    const addedCourses = [];
    const updatedCourses = [];
    const yearTally = { 'FIRST YEAR': 0, 'SECOND YEAR': 0, 'THIRD YEAR': 0, 'FOURTH YEAR': 0, unassigned: 0 };
    const imported = [];
    for (const c of selected) {
      const fields = {
        course_no: c.code,
        course_title: String(c.title).slice(0, 150),
        credit: formatCredit({ lec: c.lec, lab: c.lab, nonCredit: c.nonCredit }),
        contact_hrs: formatContactHrs({ lec: c.lec, lab: c.lab, hrsPerWeek: c.hrs }),
        cmo: header.cmo ? String(header.cmo).slice(0, 64) : null,
        year_lvl: YEAR_LONG[c.year] || null,
        term,
        semester,
        prerequisites_text: c.prereqRaw || null,
        archived: false,
      };
      let row = byNo.get(codeKey(c.code));
      if (row) {
        const oldYear = row.year_lvl;
        await row.update(fields);
        if (oldYear !== fields.year_lvl) {
          await CourseOfferingAssignment.update({ year_level: fields.year_lvl }, { where: { course_code: row.course_no, period_id: periodId } });
        }
        updated += 1;
        updatedCourses.push({ code: c.code, title: c.title });
      } else {
        row = await Course.create({ ...fields, period_id: periodId });
        byNo.set(codeKey(c.code), row);
        inserted += 1;
        addedCourses.push({ code: c.code, title: c.title });
      }
      const [offering, made] = await ProgramCourseOffering.findOrCreate({
        where: { course_id: row.course_id, program_id: programId },
        defaults: { course_id: row.course_id, program_id: programId, revision_number: revisionNumber, course_description: null },
      });
      if (made) offeringsCreated += 1;
      else if (offering.revision_number !== revisionNumber) await offering.update({ revision_number: revisionNumber });
      if (yearTally[fields.year_lvl] !== undefined) yearTally[fields.year_lvl] += 1;
      imported.push({ row, prerequisites: c.prerequisites || [] });
    }

    // Prerequisite links: the PDF is the authority, so each imported course's
    // links are rewritten from it. Codes from other semesters aren't in this
    // term and stay in prerequisites_text only.
    let prerequisitesLinked = 0;
    const unresolvedPrereqs = new Set();
    for (const { row, prerequisites } of imported) {
      await Prerequisite.destroy({ where: { course_id: row.course_id } });
      for (const code of prerequisites) {
        if (/standing/i.test(code)) continue;
        const target = byNo.get(codeKey(code));
        if (!target || target.course_id === row.course_id || target.archived) {
          // A course of another semester is expected not to be in this term; only
          // a code the Program of Study doesn't have at all is worth reporting.
          if (!allCourses.some((c) => codeKey(c.code) === codeKey(code))) unresolvedPrereqs.add(code);
          continue;
        }
        await Prerequisite.create({ course_id: row.course_id, course_prerequisite_id: target.course_id });
        prerequisitesLinked += 1;
      }
    }

    // Leftovers the Program Head ticked: move their links, then archive them.
    const archived = [];
    const mergedLinks = [];
    for (const r of reconcile) {
      if (!archiveIds.has(r.course_id)) continue;
      const course = await Course.findByPk(r.course_id);
      if (!course || course.archived) continue;
      const target = r.kind === 'duplicate' && r.match_code ? byNo.get(codeKey(r.match_code)) : null;
      if (target && target.course_id !== course.course_id) {
        const moved = await mergeCourseLinks({ from: course, to: target, actorId: req.user && req.user.id, source: 'upload' });
        mergedLinks.push({ from: course.course_no, to: target.course_no, ...moved });
      }
      await course.update({ archived: true });
      archived.push({ code: course.course_no, title: course.course_title, reason: r.reason });
    }

    await completeImportBatch(batch, { inserted, updated, archived: archived.length });

    // Keep the PDFs — only now, after the import itself has landed.
    let stored = null;
    try {
      stored = await storeDocuments({
        files: parsed.map((x) => ({ path: x.file.path, originalname: x.file.originalname, size: x.file.size, parsed: x.parsed })),
        programId, periodId, batchId: batch ? batch.id : null, actorId: req.user && req.user.id,
      });
    } catch (err) {
      console.error('[program-of-study] the import landed but the PDFs could not be kept:', err.message);
    }

    return res.status(201).json({
      inserted, updated, offeringsCreated, addedCourses, updatedCourses,
      skipped: 0, notImported: 0, assignedViaPopup: 0, inferredYearCount: 0,
      errors: [], headers: [],
      prerequisitesLinked,
      unresolvedPrereqs: [...unresolvedPrereqs],
      yearBreakdown: yearTally,
      programBreakdown: { [program.code]: selected.length },
      unresolvedPrograms: [],
      programOfStudy: {
        semesterLabel: semesterLabel(semester),
        archived,
        merged: mergedLinks,
        documents: stored ? { stored: stored.rows.length, copied: stored.copied, reused: stored.reused, superseded: stored.superseded } : null,
      },
    });
  } catch (err) {
    const status = err.status && err.status < 500 ? err.status : 400;
    return res.status(status).json({ message: err instanceof PdfUploadError ? err.message : describeSequelizeError(err) });
  } finally {
    for (const f of files) safeUnlink(f.path);
  }
}
