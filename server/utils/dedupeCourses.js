/**
 * Course de-duplication — the one-time cleanup behind `npm run courses:dedupe`
 * (scripts/dedupeCourses.js). Never deletes a course: it only archives, so View
 * Archived can restore anything.
 *
 * Per term and program it finds:
 *   1. exact duplicates   the same course_no more than once in the term
 *      → keep the row with the most links (assignments, offerings), archive the rest
 *   2. title duplicates   an old code next to the Program of Study's code
 *      ("BIT202 Object-Oriented Programming" next to BIT213L)
 *   3. wrong semester     a course the stored Program of Study puts in another
 *      semester (BIT205 → 1st Year · 2nd Semester as BIT123L)
 * 2 and 3 need the program's kept Program of Study (curriculum_documents); a
 * program without one is checked for exact duplicates only, and its same-title
 * courses are reported for a person to look at.
 *
 * Before archiving a duplicate, its links move to the kept course
 * (mergeCourseLinks): Course Assignments, consultant links, prerequisite rows.
 */
import fs from 'node:fs/promises';
import { Op } from 'sequelize';
import db from '../models/index.js';
import { parseProgramOfStudyPdf, yearLabel, semesterLabel } from './programOfStudyParser.js';
import { storedPath, programIdsLike } from '../services/curriculumDocuments.js';
import { findMatch, mergeCourseLinks, linkCounts, codeKey, normTitle } from './courseReconcile.js';

const { AcademicPeriod, Course, Program, ProgramCourseOffering, CurriculumDocument } = db;

const semesterOf = (p) => {
  const s = String((p && p.semester) || '').toLowerCase().trim();
  return (s === '2' || s.includes('2nd') || s.includes('second')) ? 2 : 1;
};

/** The program's kept Program of Study, parsed again from the stored files (null if none). */
async function storedCurriculum(programId, cache) {
  const ids = await programIdsLike(programId);
  const docs = await CurriculumDocument.findAll({ where: { program_id: { [Op.in]: ids }, status: 'active' } });
  if (!docs.length) return null;
  const courses = [];
  for (const d of docs) {
    if (!cache.has(d.sha256)) {
      const file = storedPath(d.sha256);
      try { cache.set(d.sha256, file ? await parseProgramOfStudyPdf(await fs.readFile(file)) : null); } catch { cache.set(d.sha256, null); }
    }
    const parsed = cache.get(d.sha256);
    if (parsed) courses.push(...parsed.courses);
  }
  return courses.length ? courses : null;
}

const linkScore = async (c) => {
  const l = await linkCounts(c);
  const offerings = await ProgramCourseOffering.count({ where: { course_id: c.course_id } });
  return l.assignments * 10 + l.consultants * 5 + offerings + l.prerequisites;
};

/**
 * Work out what would change. Touches nothing.
 * @returns [{ period, program, kind, keep, archive, reason, links }]
 */
export async function planDedupe({ periodId = null } = {}) {
  const periods = await AcademicPeriod.findAll({ where: periodId ? { id: periodId } : {}, raw: true });
  const cache = new Map();
  const actions = [];
  for (const period of periods) {
    const courses = await Course.findAll({ where: { period_id: period.id, archived: false }, order: [['course_id', 'ASC']] });
    const taken = new Set();

    // 1. The same code twice in one term.
    const byCode = new Map();
    for (const c of courses) {
      const k = codeKey(c.course_no);
      if (!byCode.has(k)) byCode.set(k, []);
      byCode.get(k).push(c);
    }
    for (const [, group] of byCode) {
      if (group.length < 2) continue;
      const scored = [];
      for (const c of group) scored.push({ c, s: await linkScore(c) });
      scored.sort((a, b) => b.s - a.s || a.c.course_id - b.c.course_id);
      const keep = scored[0].c;
      for (const { c } of scored.slice(1)) {
        actions.push({ period, program: null, kind: 'exact_duplicate', keep, archive: c, reason: 'Same code as course #' + keep.course_id, links: await linkCounts(c) });
        taken.add(c.course_id);
      }
    }

    // 2 + 3. Per program, against its kept Program of Study.
    const programs = await Program.findAll({ where: { period_id: period.id }, raw: true });
    const offers = await ProgramCourseOffering.findAll({ where: { course_id: courses.map((c) => c.course_id) }, raw: true });
    const semester = semesterOf(period);
    for (const program of programs) {
      const mine = courses.filter((c) => !taken.has(c.course_id) && offers.some((o) => o.course_id === c.course_id && o.program_id === program.id));
      if (!mine.length) continue;
      const curriculum = await storedCurriculum(program.id, cache);
      if (!curriculum) {
        // No Program of Study on file: report same-title pairs, change nothing.
        const seen = new Map();
        for (const c of mine) {
          const t = normTitle(c.course_title);
          if (t && seen.has(t)) actions.push({ period, program, kind: 'review', keep: seen.get(t), archive: null, other: c, reason: 'Same title as ' + seen.get(t).course_no + ' — no Program of Study on file, so check it by hand' });
          else if (t) seen.set(t, c);
        }
        continue;
      }
      const selected = curriculum.filter((c) => c.semester === semester);
      const importing = new Set(selected.map((c) => codeKey(c.code)));
      const inTerm = new Map(mine.map((c) => [codeKey(c.course_no), c]));
      const kept = selected.filter((c) => inTerm.has(codeKey(c.code))).map((c) => ({ code: c.code, title: c.title, year: c.year }));
      const elsewhere = curriculum.filter((c) => !importing.has(codeKey(c.code))).map((c) => ({ code: c.code, title: c.title, year: c.year, semester: c.semester }));
      for (const c of mine) {
        if (importing.has(codeKey(c.course_no))) continue;
        const m = findMatch(c, kept, elsewhere);
        if (!m) continue;
        if (m.kind === 'duplicate') {
          actions.push({ period, program, kind: 'title_duplicate', keep: inTerm.get(codeKey(m.target.code)), archive: c, reason: 'Duplicate of ' + m.target.code, links: await linkCounts(c) });
        } else {
          actions.push({ period, program, kind: 'wrong_semester', keep: null, archive: c, reason: 'Belongs to ' + yearLabel(m.target.year) + ' · ' + semesterLabel(m.target.semester), links: await linkCounts(c) });
        }
        taken.add(c.course_id);
      }
    }
  }
  return actions;
}

/** Carry out a plan in one transaction. Returns { archived, moved: { assignments, consultants, prerequisites } }. */
export async function applyDedupe(actions, { actorId = null } = {}) {
  const moved = { assignments: 0, consultants: 0, prerequisites: 0 };
  let archived = 0;
  await db.sequelize.transaction(async (transaction) => {
    for (const a of actions) {
      if (!a.archive) continue;
      const course = await Course.findByPk(a.archive.course_id, { transaction });
      if (!course || course.archived) continue;
      if (a.keep) {
        const keep = await Course.findByPk(a.keep.course_id, { transaction });
        if (keep && !keep.archived) {
          const r = await mergeCourseLinks({ from: course, to: keep, actorId, source: 'upload', transaction });
          moved.assignments += r.assignments; moved.consultants += r.consultants; moved.prerequisites += r.prerequisites;
        }
      }
      await course.update({ archived: true }, { transaction });
      archived += 1;
    }
  });
  return { archived, moved };
}

/** One line per action, for the console. */
export function describeAction(a) {
  const where = (a.period.label || ('term ' + a.period.id)) + (a.program ? ' · ' + a.program.code : '');
  if (a.kind === 'review') return where + ': REVIEW ' + a.other.course_no + ' "' + a.other.course_title + '" — ' + a.reason;
  const links = a.links ? [a.links.assignments && (a.links.assignments + ' assignment(s)'), a.links.consultants && (a.links.consultants + ' consultant link(s)'), a.links.prerequisites && (a.links.prerequisites + ' prerequisite row(s)')].filter(Boolean) : [];
  return where + ': ' + (a.keep ? 'keep ' + a.keep.course_no + ', ' : '') + 'archive ' + a.archive.course_no + ' "' + a.archive.course_title + '" (' + a.reason + ')'
    + (links.length ? (a.keep ? ' — move ' : ' — leaves ') + links.join(', ') : '');
}
