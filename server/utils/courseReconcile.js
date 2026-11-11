/**
 * Course reconciliation — finding a term's leftover courses and folding them
 * into the real ones. Shared by the Program of Study import (its "Not in the
 * Program of Study" step) and scripts/dedupeCourses.js.
 *
 * WHY THERE ARE LEFTOVERS
 * Old sample uploads, the old seed and manual adds used BIT2xx-style codes; the
 * term clone copied them forward every term; and an upload only upserts by
 * course_no, so a new code (BIT213L) never replaced the old one (BIT202).
 *
 * MATCHING (titleMatch)
 *   exact     same title once case, punctuation and a trailing 1/2/I/II are ignored
 *   typo      one or two letters apart, on titles long enough for that to be safe
 *             ("Software Egineering" in the PDF vs "Software Engineering")
 *   keyword   same year level and the same first significant word, and the ONLY
 *             such course ("Database Systems" vs "Database Management (Info Mgt) 1")
 *
 * MERGING (mergeCourseLinks)
 * Before a duplicate is archived, whatever points at it moves to the kept
 * course: its Course Assignments (merged into an existing one when the kept
 * course already has one), consultant links, and prerequisite rows naming it.
 * Each assignment move is written to the assignment history ("Merged from X").
 */
import { Op } from 'sequelize';
import db from '../models/index.js';
import { recordChange } from '../services/assignmentHistory.js';

const { Course, CourseOfferingAssignment, ConsultantCourse, Prerequisite, ProgramCourseOffering } = db;

const STOP = new Set(['and', 'of', 'the', 'in', 'to', 'for', 'a', 'an', 'with', 'on', 'info', 'mgt', 'incl', 'intro']);

export const codeKey = (s) => String(s || '').trim().toUpperCase();

/** "Database Management (Info Mgt) 1" → "database management info mgt". */
export function normTitle(t) {
  return String(t || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s+(?:[0-9]+|i{1,3}|iv)$/, '')
    .trim();
}

const firstWord = (t) => normTitle(t).split(' ').find((w) => w.length >= 4 && !STOP.has(w)) || null;

function distance(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

// The trailing part number of a title ("… 1", "… II"), or null.
const partOf = (t) => {
  const m = String(t || '').trim().match(/\s(\d+|I{1,3}|IV)\s*$/i);
  if (!m) return null;
  const r = { I: 1, II: 2, III: 3, IV: 4 }[m[1].toUpperCase()];
  return r || Number(m[1]);
};

/**
 * 'exact' | 'typo' | null — the title tests that don't need a year level.
 * A trailing 1/2/I/II is ignored when only ONE side has it ("Web Development"
 * vs "Web Development 1"); two different parts are different courses
 * ("Capstone Project 1" vs "Capstone Project 2").
 */
export function titleMatch(a, b) {
  const pa = partOf(a);
  const pb = partOf(b);
  if (pa !== null && pb !== null && pa !== pb) return null;
  const x = normTitle(a);
  const y = normTitle(b);
  if (!x || !y) return null;
  if (x === y) return 'exact';
  if (Math.min(x.length, y.length) >= 12 && distance(x, y) <= 2) return 'typo';
  return null;
}

const YEARS = { 'FIRST YEAR': 1, 'SECOND YEAR': 2, 'THIRD YEAR': 3, 'FOURTH YEAR': 4 };
export const yearNum = (yearLvl) => YEARS[String(yearLvl || '').toUpperCase().trim()] || null;

/**
 * Find what an existing course duplicates.
 *
 * @param course     { course_no, course_title, year_lvl }
 * @param kept       the courses that stay in this term: [{ code, title, year }]
 * @param elsewhere  courses of the curriculum that belong to OTHER semesters: [{ code, title, year, semester }]
 * @returns { kind: 'duplicate', target } | { kind: 'other_semester', target } | null
 */
export function findMatch(course, kept, elsewhere = []) {
  const code = codeKey(course.course_no);
  const sameCodeElsewhere = elsewhere.find((e) => codeKey(e.code) === code);
  if (sameCodeElsewhere) return { kind: 'other_semester', target: sameCodeElsewhere, how: 'code' };

  for (const how of ['exact', 'typo']) {
    const k = kept.find((x) => titleMatch(course.course_title, x.title) === how);
    if (k) return { kind: 'duplicate', target: k, how };
    const e = elsewhere.find((x) => titleMatch(course.course_title, x.title) === how);
    if (e) return { kind: 'other_semester', target: e, how };
  }

  const y = yearNum(course.year_lvl);
  const w = firstWord(course.course_title);
  if (y && w) {
    const hits = kept.filter((x) => x.year === y && firstWord(x.title) === w);
    if (hits.length === 1) return { kind: 'duplicate', target: hits[0], how: 'keyword' };
  }
  return null;
}

const merged = (a, b) => {
  const out = [];
  const seen = new Set();
  for (const p of [...(a || []), ...(b || [])]) {
    const k = p && (p.faculty_id ? 'id:' + p.faculty_id : 'name:' + String(p.faculty_name || '').toLowerCase());
    if (!p || seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out.length ? out : null;
};

/**
 * Move everything that points at `from` over to `to` (both Course rows of the
 * same term). Returns { assignments, consultants, prerequisites } moved/merged.
 */
export async function mergeCourseLinks({ from, to, actorId = null, source = 'upload', transaction = null }) {
  const opts = transaction ? { transaction } : {};
  const result = { assignments: 0, consultants: 0, prerequisites: 0 };
  const note = 'Merged from ' + from.course_no;

  // 1. Course Assignments.
  const rows = await CourseOfferingAssignment.findAll({
    where: {
      period_id: from.period_id,
      [Op.or]: [{ course_id: from.course_id }, { course_id: null, course_code: from.course_no }],
    },
    ...opts,
  });
  for (const a of rows) {
    // A copy: get({ plain: true }) hands back the live dataValues, which the
    // update below would change under us, leaving "before" equal to "after".
    const before = { ...a.get({ plain: true }) };
    let offering = null;
    if (a.program_id) {
      [offering] = await ProgramCourseOffering.findOrCreate({
        where: { course_id: to.course_id, program_id: a.program_id },
        defaults: { course_id: to.course_id, program_id: a.program_id, revision_number: 1, course_description: null },
        ...opts,
      });
    }
    const target = offering
      ? await CourseOfferingAssignment.findOne({ where: { pc_offering_id: offering.pc_offering_id, id: { [Op.ne]: a.id } }, ...opts })
      : null;
    if (target) {
      // The kept course already has an assignment: fold this one into it.
      const tBefore = { ...target.get({ plain: true }) };
      const patch = {};
      if (!target.faculty_id && !target.faculty_name && (a.faculty_id || a.faculty_name)) {
        Object.assign(patch, {
          faculty_id: a.faculty_id, faculty_name: a.faculty_name, status: a.status, date_assigned: a.date_assigned,
        });
      }
      const contributors = merged(target.contributors, a.contributors);
      if (JSON.stringify(contributors) !== JSON.stringify(target.contributors || null)) patch.contributors = contributors;
      if (Object.keys(patch).length) {
        await target.update(patch, opts);
        await recordChange(tBefore, target.get({ plain: true }), { source, actorId, note });
      }
      await a.destroy(opts);
      await recordChange(before, null, { source, actorId, note: 'Merged into ' + to.course_no });
    } else {
      await a.update({
        course_id: to.course_id,
        course_code: to.course_no,
        course_name: String(to.course_title || '').slice(0, 100),
        year_level: to.year_lvl || a.year_level,
        pc_offering_id: offering ? offering.pc_offering_id : a.pc_offering_id,
      }, opts);
      await recordChange(before, a.get({ plain: true }), { source, actorId, note });
    }
    result.assignments += 1;
  }

  // 2. Consultant links.
  const links = await ConsultantCourse.findAll({ where: { course_id: from.course_id }, ...opts });
  for (const l of links) {
    const dupe = await ConsultantCourse.findOne({ where: { consultant_id: l.consultant_id, course_id: to.course_id }, ...opts });
    if (dupe) await l.destroy(opts);
    else await l.update({ course_id: to.course_id, course_code: String(to.course_no).slice(0, 16) }, opts);
    result.consultants += 1;
  }

  // 3. Prerequisite rows that name the duplicate now name the kept course.
  const pre = await Prerequisite.findAll({ where: { course_prerequisite_id: from.course_id }, ...opts });
  for (const p of pre) {
    const exists = p.course_id === to.course_id || await Prerequisite.findOne({
      where: { course_id: p.course_id, course_prerequisite_id: to.course_id }, ...opts,
    });
    if (exists) await p.destroy(opts);
    else await p.update({ course_prerequisite_id: to.course_id }, opts);
    result.prerequisites += 1;
  }
  return result;
}

/** Counts of what points at a course, for the preview ("moves 1 assignment"). */
export async function linkCounts(course) {
  const [assignments, consultants, prerequisites] = await Promise.all([
    CourseOfferingAssignment.count({ where: { period_id: course.period_id, [Op.or]: [{ course_id: course.course_id }, { course_id: null, course_code: course.course_no }] } }),
    ConsultantCourse.count({ where: { course_id: course.course_id } }),
    Prerequisite.count({ where: { course_prerequisite_id: course.course_id } }),
  ]);
  return { assignments, consultants, prerequisites };
}

/** Active courses of a term that belong to a program: offered by it, or offered by nobody. */
export async function programCoursesInTerm(periodId, programId) {
  const courses = await Course.findAll({ where: { period_id: periodId, archived: false } });
  if (!programId) return courses;
  const offers = await ProgramCourseOffering.findAll({ where: { course_id: courses.map((c) => c.course_id) }, attributes: ['course_id', 'program_id'], raw: true });
  const progsOf = new Map();
  for (const o of offers) {
    if (!progsOf.has(o.course_id)) progsOf.set(o.course_id, new Set());
    progsOf.get(o.course_id).add(o.program_id);
  }
  return courses.filter((c) => !progsOf.has(c.course_id) || progsOf.get(c.course_id).has(Number(programId)));
}
