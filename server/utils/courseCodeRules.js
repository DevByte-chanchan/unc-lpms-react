/**
 * Course-code reading rules — the one place that knows how to read a UNC
 * course code, so both upload paths read it the same way.
 *
 * Three independent signals live in a code like `BIT314L-OBb`:
 *
 *   BIT      the PREFIX      → which program owns the course        (rule 1)
 *   314      the DIGITS      → [year][semester][subject #]          (rule 2)
 *   OBb      the SECTION     → which program the block belongs to   (rule 3)
 *
 * Rules 1 and 3 overlap on purpose. A course whose prefix belongs to a program
 * (BIT, BCS, ACT, LIS) is attributed by its prefix. A SHARED course — GEE, MATH,
 * anything with no owning prefix — carries no program in its code at all, so the
 * section is the only thing that says whose block it is: `MATH311L-OBb` is the
 * BSIT block of Statistics, `MATH311L-OCa` is the BSCS one.
 *
 * NOTHING here is persisted beyond what already has a column. `year_level` keeps
 * its existing `FIRST YEAR`…`FOURTH YEAR` format; the semester digit is derived
 * for VALIDATION and PREVIEW only and deliberately has no column.
 */

/** Course-code prefix → the program that owns courses with that prefix. */
export const PREFIX_PROGRAM = Object.freeze({
  BIT: 'BSIT',
  BCS: 'BSCS',
  ACT: 'ACT',   // Associate in Computer Technology — its OWN program, not IT or CS
  LIS: 'LIS',   // Library and Information Science
});

/**
 * Section prefix → program. The section is `O` + program letter + block letter
 * (`OBb` = BSIT block b), except LIS, whose blocks are numbered `P7a`.
 */
export const SECTION_PROGRAM = Object.freeze({
  OA: 'ACT',
  OB: 'BSIT',
  OC: 'BSCS',
  P7: 'LIS',
});

/**
 * Program code → the course-code prefixes it owns.
 *
 * This EXTENDS the derivation in programCoursePrefixes() rather than replacing
 * it: the derivation already turns BSIT → BIT and BSCS → BCS by collapsing the
 * leading "BS", but a Library Science program (BLIS / ABLIS) and ACT cannot be
 * derived that way, and rule 1 requires both.
 */
export const PROGRAM_PREFIX_ALIASES = Object.freeze({
  BSIT:  ['BSIT', 'BIT'],
  BSCS:  ['BSCS', 'BCS'],
  ACT:   ['ACT'],
  BLIS:  ['BLIS', 'LIS'],
  ABLIS: ['ABLIS', 'LIS'],
  LIS:   ['LIS'],
});

/**
 * Every prefix that belongs to SOME program. A base code starting with none of
 * these is a shared course (GEE, MATH, …) and falls to rule 3.
 */
export const OWNED_PREFIXES = Object.freeze([
  ...new Set([
    ...Object.keys(PREFIX_PROGRAM),
    ...Object.values(PROGRAM_PREFIX_ALIASES).flat(),
  ]),
]);

/** Trim a cell. School exports pad ROOM and FACULTY with trailing spaces. */
export const clean = (v) => String(v == null ? '' : v).trim();

/** A numeric cell, or null — UNIT(S) must never reach the DB as "3   ". */
export function numericOrNull(v) {
  const s = clean(v);
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Does this look like a section rather than part of the course code?
 *
 * Sections are `O` + program letter + block letter (`OBa`, `OBaL`) or LIS's
 * numbered blocks (`P7a`). The test has to be this strict because course codes
 * contain hyphens of their own: without it, `GEE-LITE` with no section attached
 * would come apart into `GEE` + section `LITE`, and `GE-101` into `GE` + `101`.
 */
export function looksLikeSection(tail) {
  return /^(O[A-Za-z]{1,2}|P\d[A-Za-z]{0,2})L?$/.test(clean(tail));
}

/**
 * Split `BIT314L-OBb` → { baseCode: 'BIT314L', section: 'OBb' }.
 *
 * Splits on the LAST hyphen, which is what makes `GEE-LITE-OCa` come apart
 * correctly (baseCode `GEE-LITE`, section `OCa`) — the course code itself
 * contains a hyphen. A tail that isn't section-shaped stays part of the code.
 */
export function splitCourseNo(courseNo) {
  const s = clean(courseNo);
  const dash = s.lastIndexOf('-');
  if (dash <= 0) return { baseCode: s, section: '' };
  const tail = s.slice(dash + 1);
  if (!looksLikeSection(tail)) return { baseCode: s, section: '' };
  return { baseCode: s.slice(0, dash), section: tail };
}

/**
 * A trailing `L` on the SECTION marks the lab meeting of that block:
 * `OBaL` is the lab of `OBa`, not a fifth section. Strip it before grouping.
 *
 * Lab-ness is decided on the section, NEVER on the whole course no — base codes
 * end in `L` themselves (`BIT111L`), so "the course no ends in L" would call
 * every lecture a lab.
 */
export function stripLabSuffix(section) {
  const s = clean(section);
  // Require ≥2 characters left over, so a section that IS "L" isn't erased.
  if (s.length >= 3 && s.endsWith('L')) return { section: s.slice(0, -1), isLab: true };
  return { section: s, isLab: false };
}

/** `BIT111L-OBaL` → `BIT111L-OBA` — one key for a block and its lab. */
export function normalizeCourseNo(courseNo) {
  const { baseCode, section } = splitCourseNo(courseNo);
  const { section: block } = stripLabSuffix(section);
  return (block ? baseCode + '-' + block : baseCode).toUpperCase();
}

/**
 * The three digits of a base code, as [year][semester][subject #]:
 *   BIT111L → { year: 1, semester: 1, subject: 1 }
 *   ACT121L → { year: 1, semester: 2, subject: 1 }
 *   BIT213L → { year: 2, semester: 1, subject: 3 }
 *   GEE-LITE → { year: null, semester: null, subject: null }
 *
 * The first three-digit run wins, so the letter prefix's length doesn't matter
 * (`MATH311L` reads the same as `BIT311L`). Out-of-range digits come back null
 * rather than as a nonsense year 7 / semester 0.
 */
export function codeDigits(baseCode) {
  const m = String(baseCode || '').match(/(\d)(\d)(\d)/);
  if (!m) return { year: null, semester: null, subject: null };
  const year = Number(m[1]);
  const semester = Number(m[2]);
  const subject = Number(m[3]);
  return {
    year:     year >= 1 && year <= 4 ? year : null,
    // 1st / 2nd, plus a 3rd (summer) term some codes carry.
    semester: semester >= 1 && semester <= 3 ? semester : null,
    subject:  Number.isFinite(subject) ? subject : null,
  };
}

const YEAR_WORDS = { 1: 'FIRST YEAR', 2: 'SECOND YEAR', 3: 'THIRD YEAR', 4: 'FOURTH YEAR' };

/**
 * `BIT314L` → `THIRD YEAR`. Returns '' (not null) for a code with no digits,
 * which is the shape callers have always received; the extractors turn that
 * into null where the rules ask for an explicit unknown.
 */
export function yearLevelFromCode(baseCode) {
  const { year } = codeDigits(baseCode);
  if (year) return YEAR_WORDS[year];
  // Fallback for short codes like "BIT3" that carry a year but not three
  // digits — this is the behaviour callers had before rule 2 existed.
  const m = String(baseCode || '').match(/[A-Za-z]+(\d)/);
  return (m && YEAR_WORDS[Number(m[1])]) || '';
}

/** `BIT213L` → 1, `ACT121L` → 2, `GEE-LITE` → null. Validation only. */
export function semesterFromCode(baseCode) {
  return codeDigits(baseCode).semester;
}

/** `OBb` → 'BSIT', `P7a` → 'LIS', `OZz` → null. Accepts the lab form `OBbL`. */
export function programFromSection(section) {
  const { section: block } = stripLabSuffix(section);
  const key = block.slice(0, 2).toUpperCase();
  return SECTION_PROGRAM[key] || null;
}

/**
 * Course-code prefixes that belong to a program, derived from its code:
 *   BSIT → ['BSIT', 'BIT']   BSCS → ['BSCS', 'BCS']   ACT → ['ACT']
 * The "BS"→"B" collapse matches the school's course-numbering convention; the
 * alias table above covers the programs that convention can't reach.
 */
export function programCoursePrefixes(programCode) {
  const c = String(programCode || '').toUpperCase().trim();
  const set = new Set();
  if (!c) return [];
  set.add(c);
  if (c.startsWith('BS') && c.length > 2) set.add('B' + c.slice(2));
  if (c.startsWith('AB') && c.length > 2) set.add(c.slice(1));
  for (const alias of PROGRAM_PREFIX_ALIASES[c] || []) set.add(alias);
  return [...set];
}

/**
 * Which program a prefix list stands for, in the vocabulary SECTION_PROGRAM
 * speaks — so a shared course's section can be compared against the program
 * doing the upload. BSIT's prefixes ['BSIT','BIT'] → 'BSIT'.
 */
export function programKeyFromPrefixes(prefixes) {
  const list = (prefixes || []).map((p) => String(p).toUpperCase());
  const canonical = new Set(Object.values(PREFIX_PROGRAM));
  for (const p of list) if (canonical.has(p)) return p;
  for (const p of list) if (PREFIX_PROGRAM[p]) return PREFIX_PROGRAM[p];
  return null;
}

/** True when this base code's prefix belongs to a program (rule 1 applies). */
export function isOwnedPrefix(baseCode, owned = OWNED_PREFIXES) {
  const b = String(baseCode || '').toUpperCase();
  return owned.some((p) => b.startsWith(String(p).toUpperCase()));
}

/** True when any of `prefixes` owns this base code. */
export function matchesPrefixes(baseCode, prefixes) {
  const b = String(baseCode || '').toUpperCase();
  return (prefixes || []).some((p) => b.startsWith(String(p).toUpperCase()));
}

/**
 * Does a base code's semester digit agree with the term the sheet was exported
 * for? Returns null when either side is unknown — an unknown is not a conflict.
 */
export function semesterMatchesTerm(baseCode, termSemester) {
  const codeSem = semesterFromCode(baseCode);
  if (!codeSem || !termSemester) return null;
  return codeSem === termSemester;
}
