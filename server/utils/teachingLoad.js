/**
 * Faculty teaching load for one term: who leads and contributes to what, and
 * how many units they carry. Pure — the controller loads the rows and courses.
 *
 *   units     the course's credit units as Course Offerings shows them
 *             ("2 LEC, 1 LAB" → 3; a non-credit "(2) LEC" course → 0),
 *             counted for the courses a person LEADS
 *   courses   every course they're on, as Lead and as Contributor
 *   sections  the official section count, when the registrar's list gave one
 *
 * The limit is MAX_TEACHING_UNITS (default 24). It is a setting, not UNC
 * policy: the page warns above it and never blocks a save.
 */
import { nameMatches } from './officialMatch.js';
import { displayName } from './nameCase.js';

export const DEFAULT_MAX_TEACHING_UNITS = 24;

/** MAX_TEACHING_UNITS from the environment, or 24. */
export function maxTeachingUnits(env = process.env) {
  const n = Number(env.MAX_TEACHING_UNITS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_TEACHING_UNITS;
}

// "2 LEC, 1 LAB", "(2) LEC, 0 LAB" (non-credit), or a bare number ("3").
const CREDIT_RE = /^\s*(\(?)\s*(\d+(?:\.\d+)?)\s*\)?\s*LEC\s*(?:,\s*(\d+(?:\.\d+)?)\s*LAB)?\s*$/i;

/** Credit units for a stored `credit` string; null when it can't be read. */
export function creditUnits(credit) {
  const s = String(credit == null ? '' : credit).trim();
  if (!s) return null;
  if (/^\d+(?:\.\d+)?$/.test(s)) return Number(s);
  const m = s.match(CREDIT_RE);
  if (!m) return null;
  if (m[1] === '(') return 0;
  return Number(m[2]) + (m[3] !== undefined ? Number(m[3]) : 0);
}

/** Official sections on a row: the registrar list's [{ sections: [...] }], counted. */
export function sectionCount(row) {
  const list = Array.isArray(row && row.sections) ? row.sections : [];
  const all = new Set();
  for (const s of list) for (const code of (s && Array.isArray(s.sections) ? s.sections : [])) all.add(String(code));
  return all.size || null;
}

const COUNTED = new Set(['Active', 'On Leave']);
const codeKey = (c) => String(c || '').trim().toUpperCase();

/**
 * @param rows      the term's assignments (plain objects)
 * @param courses   the term's catalog: [{ course_id, course_no, course_title, credit }]
 * @param options   { programId, maxUnits }
 * @returns { max_units, faculty: [...], course_units: { CODE: units } }
 */
export function computeTeachingLoad(rows, courses, { programId = null, maxUnits = DEFAULT_MAX_TEACHING_UNITS } = {}) {
  const byId = new Map();
  const byCode = new Map();
  for (const c of courses || []) {
    byId.set(Number(c.course_id), c);
    if (!byCode.has(codeKey(c.course_no))) byCode.set(codeKey(c.course_no), c);
  }
  const courseOf = (r) => byId.get(Number(r.course_id)) || byCode.get(codeKey(r.course_code)) || null;
  const unitsOf = (r) => { const c = courseOf(r); return c ? creditUnits(c.credit) : null; };

  const people = [];
  const find = (facultyId, name) => {
    if (facultyId) {
      const hit = people.find((p) => p.faculty_id === Number(facultyId));
      if (hit) return hit;
    }
    return people.find((p) => (!facultyId || !p.faculty_id) && p.names.some((n) => nameMatches(n, name))) || null;
  };
  const personFor = (facultyId, name) => {
    let p = find(facultyId, name);
    if (!p) {
      p = { faculty_id: facultyId ? Number(facultyId) : null, name: displayName(name), names: [], units: 0, unknown_units: 0, sections: 0, courses: [], in_program: false };
      people.push(p);
    }
    if (!p.faculty_id && facultyId) p.faculty_id = Number(facultyId);
    if (!p.names.includes(name)) p.names.push(name);
    return p;
  };

  for (const r of rows || []) {
    if (!COUNTED.has(r.status)) continue;
    const inProgram = !programId || Number(r.program_id) === Number(programId);
    const units = unitsOf(r);
    const sections = sectionCount(r);
    const course = { course_code: r.course_code, course_name: r.course_name || null, units, sections, program_id: r.program_id || null, assignment_id: r.id };
    if (r.faculty_name) {
      const p = personFor(r.faculty_id, r.faculty_name);
      p.courses.push({ ...course, role: 'Lead' });
      if (units == null) p.unknown_units += 1; else p.units += units;
      if (sections) p.sections += sections;
      if (inProgram) p.in_program = true;
    }
    for (const c of Array.isArray(r.contributors) ? r.contributors : []) {
      if (!c || !c.faculty_name) continue;
      // A Lead who is also listed as a Contributor of the same course counts once.
      const sameAsLead = c.faculty_id && r.faculty_id
        ? Number(c.faculty_id) === Number(r.faculty_id)
        : nameMatches(c.faculty_name, r.faculty_name);
      if (r.faculty_name && sameAsLead) continue;
      const p = personFor(c.faculty_id, c.faculty_name);
      p.courses.push({ ...course, role: 'Contributor' });
      if (inProgram) p.in_program = true;
    }
  }

  const faculty = people
    .filter((p) => p.in_program)
    .map(({ in_program: _drop, ...p }) => ({
      ...p,
      sections: p.sections || null,
      over_by: p.units > maxUnits ? p.units - maxUnits : 0,
      courses: p.courses.sort((a, b) => (a.role === b.role ? codeKey(a.course_code).localeCompare(codeKey(b.course_code)) : a.role === 'Lead' ? -1 : 1)),
    }))
    .sort((a, b) => b.units - a.units || a.name.localeCompare(b.name));

  const course_units = {};
  for (const c of courses || []) {
    const u = creditUnits(c.credit);
    if (u != null && !(codeKey(c.course_no) in course_units)) course_units[codeKey(c.course_no)] = u;
  }
  return { max_units: maxUnits, faculty, course_units };
}
