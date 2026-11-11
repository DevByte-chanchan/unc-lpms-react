/**
 * Pre-assignment vs. the registrar's Subject Offerings — the comparison behind
 * POST /course-offering-assignments/compare-official. Pure (only the name
 * helpers), so it is unit-tested on its own (tests/officialMatch.test.js).
 *
 * NAMES. The registrar writes SURNAME first ("DANILA JUNE ARREB",
 * "DE GUZMAN JAKE", "CASIMERO DANNY BOY") while the faculty list has
 * "June Arreb Danila" / "Danny B. Casimero". samePerson() alone compares words
 * in order, so it is tried first and then two looser rules, still strict
 * enough to need every full word to agree:
 *   - the same words in any order (honorifics and initials dropped);
 *   - one side has a middle INITIAL where the other spells the middle name out
 *     ("Danny B. Casimero" = "CASIMERO DANNY BOY").
 * A registrar name resolves to a faculty row only when exactly one row matches.
 *
 * CASES, per course (one program, one term):
 *   confirmed    Lead + Contributors = the official set, and there is a Lead
 *   differs      someone extra, someone missing, or no Lead yet (or, with
 *                no_official_faculty, offered but nobody named yet — no fix)
 *   not_offered  pre-assigned, but not in the official list
 *   new          in the official list, not pre-assigned
 */
import { samePerson } from './schoolEmail.js';
import { displayName } from './nameCase.js';

const HONORIFICS = new Set(['dr', 'engr', 'mr', 'ms', 'mrs', 'prof', 'atty', 'sir', 'maam']);
const cleanWord = (w) => String(w).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const wordsOf = (name) => String(name || '').trim().split(/[\s,]+/).map(cleanWord).filter((w) => w && !HONORIFICS.has(w));

function looseParts(name) {
  const ws = wordsOf(name);
  return { full: ws.filter((w) => w.length > 1), initials: ws.filter((w) => w.length === 1) };
}

/** `a`'s full words all appear in `b`, and each extra word of `b` matches one of `a`'s initials. */
function coveredWithInitials(a, b) {
  if (a.full.length < 2) return false;
  const bSet = new Set(b.full);
  if (!a.full.every((w) => bSet.has(w))) return false;
  const aSet = new Set(a.full);
  const extra = b.full.filter((w) => !aSet.has(w));
  if (extra.length > a.initials.length) return false;
  const pool = [...a.initials];
  return extra.every((w) => {
    const i = pool.indexOf(w[0]);
    if (i === -1) return false;
    pool.splice(i, 1);
    return true;
  });
}

/** Same person, whatever the word order or middle-initial style. */
export function nameMatches(a, b) {
  if (!a || !b) return false;
  if (samePerson(a, b)) return true;
  const pa = looseParts(a);
  const pb = looseParts(b);
  if (pa.full.length < 2 || pb.full.length < 2) return false;
  const sa = [...pa.full].sort().join(' ');
  const sb = [...pb.full].sort().join(' ');
  if (sa === sb) return true;
  return coveredWithInitials(pa, pb) || coveredWithInitials(pb, pa);
}

/** The one faculty row (of `list`, { id, name }) this registrar name means, or null. */
export function matchFacultyName(name, list) {
  const hits = (list || []).filter((f) => nameMatches(f.name, name));
  if (hits.length === 1) return hits[0];
  const strict = hits.filter((f) => samePerson(f.name, name));
  return strict.length === 1 ? strict[0] : null;
}

const codeKey = (c) => String(c || '').trim().toUpperCase();

/** Two people (each { faculty_id, faculty_name }) are the same one. */
export function samePeople(a, b) {
  if (!a || !b) return false;
  if (a.faculty_id != null && b.faculty_id != null) return Number(a.faculty_id) === Number(b.faculty_id);
  return nameMatches(a.faculty_name, b.faculty_name) || nameMatches(a.faculty_name, b.registrar_name);
}

const person = (p) => ({ faculty_id: p.faculty_id ?? null, faculty_name: p.faculty_name ?? null });

/**
 * Build the official side: one entry per course, with everyone teaching any
 * section and the sections each person handles.
 *
 *   courses   extractProgramAssignments() rows ({ course_code, course_name, contributor_names })
 *   offerings filterOfferingsForProgram() rows ({ baseCode, courseNo, facultyNames })
 *   faculty   the term's faculty list [{ id, name }]
 *
 * → [{ course_code, course_name, people: [{ faculty_id, faculty_name, registrar_name, matched, sections }] }]
 */
export function buildOfficialCourses(courses, offerings, faculty) {
  const sectionsBy = new Map();   // CODE → Map(registrar name → Set(courseNo))
  for (const o of offerings || []) {
    const code = codeKey(o.baseCode);
    if (!sectionsBy.has(code)) sectionsBy.set(code, new Map());
    const m = sectionsBy.get(code);
    for (const n of o.facultyNames || []) {
      const name = String(n || '').trim();
      if (!name) continue;
      if (!m.has(name)) m.set(name, new Set());
      if (o.courseNo) m.get(name).add(String(o.courseNo).trim());
    }
  }
  return (courses || []).map((c) => {
    const m = sectionsBy.get(codeKey(c.course_code)) || new Map();
    const people = [];
    for (const raw of c.contributor_names || []) {
      const f = matchFacultyName(raw, faculty);
      const entry = {
        faculty_id: f ? f.id : null,
        faculty_name: f ? f.name : displayName(raw),
        registrar_name: raw,
        matched: !!f,
        sections: [...(m.get(raw) || [])].sort(),
      };
      // Two registrar spellings of one faculty member collapse into one person.
      const same = people.find((p) => samePeople(p, entry));
      if (same) same.sections = [...new Set([...same.sections, ...entry.sections])].sort();
      else people.push(entry);
    }
    return { course_code: String(c.course_code).trim(), course_name: c.course_name || null, people };
  });
}

/** Stored shape of `sections`: [{ faculty_name, faculty_id, sections }]. */
export const sectionsOf = (official) => (official ? official.people : []).map((p) => ({
  faculty_name: p.faculty_name, faculty_id: p.faculty_id, sections: p.sections,
}));

/**
 * Compare the pre-assignment rows (live, this program) with the official
 * courses. Returns one row per course, sorted by code:
 *
 *   { course_code, course_name, case, assignment_id,
 *     current:  { lead, contributors },
 *     official: [{ faculty_id, faculty_name, registrar_name, matched, sections }],
 *     add:      people to add as Contributors,
 *     remove:   people assigned but not in the official set,
 *     lead_removed: the Lead is one of `remove`,
 *     needs_lead:   accepting needs the Program Head to pick a Lead,
 *     proposed: { lead, contributors } — what Accept would write }
 */
export function compareWithOfficial(preRows, officialCourses) {
  const pre = new Map();
  for (const r of preRows || []) pre.set(codeKey(r.course_code), r);
  const off = new Map();
  for (const c of officialCourses || []) off.set(codeKey(c.course_code), c);

  const out = [];
  for (const code of [...new Set([...pre.keys(), ...off.keys()])].sort()) {
    const row = pre.get(code) || null;
    const official = off.get(code) || null;
    const lead = row && (row.faculty_name || row.faculty_id != null) ? person({ faculty_id: row.faculty_id, faculty_name: row.faculty_name }) : null;
    const contributors = row && Array.isArray(row.contributors) ? row.contributors.filter(Boolean).map(person) : [];
    const base = {
      course_code: (row && row.course_code) || official.course_code,
      course_name: (row && row.course_name) || (official && official.course_name) || null,
      assignment_id: row ? row.id ?? null : null,
      current: { lead, contributors },
      official: official ? official.people : [],
    };

    if (!official) {
      out.push({ ...base, case: 'not_offered', add: [], remove: [], lead_removed: false, needs_lead: false, proposed: null });
      continue;
    }
    if (!row) {
      out.push({
        ...base, case: 'new', add: official.people.map(person), remove: [], lead_removed: false, needs_lead: false,
        proposed: { lead: null, contributors: official.people.map(person) },
      });
      continue;
    }

    // Offered, but the registrar hasn't named anyone yet: nothing to compare,
    // nothing to suggest — the pre-assignment stands.
    if (!official.people.length) {
      out.push({
        ...base, case: 'differs', no_official_faculty: true, add: [], remove: [],
        lead_removed: false, needs_lead: false, proposed: null,
      });
      continue;
    }

    const assigned = [...(lead ? [lead] : []), ...contributors];
    const add = official.people.filter((p) => !assigned.some((a) => samePeople(a, p))).map(person);
    const remove = assigned.filter((a) => !official.people.some((p) => samePeople(a, p)));
    const leadRemoved = !!lead && remove.some((r) => r === lead);
    const kase = (!add.length && !remove.length && lead) ? 'confirmed' : 'differs';
    // Accepting keeps a Lead who is in the official set — under their CURRENT
    // spelling, so a name written differently by the registrar is not a Lead
    // change — and everyone else official becomes a Contributor.
    const keptLead = lead && !leadRemoved ? lead : null;
    out.push({
      ...base,
      case: kase,
      add,
      remove,
      lead_removed: leadRemoved,
      needs_lead: kase === 'differs' && !keptLead,
      proposed: {
        lead: keptLead ? person(keptLead) : null,
        contributors: official.people.filter((p) => !(keptLead && samePeople(keptLead, p))).map(person),
      },
    });
  }
  return out;
}
