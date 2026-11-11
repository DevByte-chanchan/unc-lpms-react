/**
 * Program of Study PDF → courses, per year and semester.
 *
 * The registrar's Program of Study (e.g. "Rev-2-_BSIT-_-PROGRAM-OF-STUDY-1.pdf")
 * is one page per two year levels: a header (program, CMO, effectivity,
 * revision), then for each year a FIRST / SECOND SEMESTER table:
 *
 *   SUBJ ID | SUBJECT DESCRIPTION | LEC | LAB | TOTAL | Pre-Requisite(s) | Hrs/Week
 *   …one row per course…
 *   Total   |                     | 18  | 2   | 20    |                  | 27
 *
 * and, on the last page, "TOTAL NUMBER OF UNITS 153".
 *
 * Everything works from positioned text, never from plain text order:
 *   - Column boundaries come from the table's own header words (LEC, LAB,
 *     TOTAL, Pre-Requisite(s), Hrs/Week), so a page shifted a few points still
 *     reads right.
 *   - A wrapped prerequisite cell sits on lines ABOVE and BELOW its row (it is
 *     vertically centred), carrying nothing but prerequisite text. Each such
 *     line joins the nearest course row of the same semester.
 *   - A non-credit course shows its units in brackets, "(2)": credit 0, hours kept.
 *
 * No DB access. Arithmetic on the numbers lives in utils/courseNumbers.js and
 * the checks in utils/programOfStudyChecks.js.
 */
import crypto from 'node:crypto';
import { readPdfItems, ExtractionError } from './universityStatementParser.js';

export const POS_MESSAGES = {
  scanned: "This PDF is a scanned image, so its text can't be read. Upload the Program of Study exported from Word or the registrar's system.",
  notPos: "This PDF doesn't look like a Program of Study: no FIRST YEAR / FIRST SEMESTER tables were found. Is this the right file?",
  unreadable: "This file couldn't be opened as a PDF. It may be damaged or password-protected.",
};

const YEAR_WORDS = { FIRST: 1, SECOND: 2, THIRD: 3, FOURTH: 4, FIFTH: 5 };
const YEAR_LABEL = ['', '1st', '2nd', '3rd', '4th', '5th'];
export const yearLabel = (n) => (YEAR_LABEL[n] || n + 'th') + ' Year';
export const semesterLabel = (s) => (s === 3 ? 'Summer' : (s === 2 ? '2nd' : '1st') + ' Semester');

const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const LINE_TOLERANCE = 2.5;
// How far a stray prerequisite line may sit from the row it belongs to.
const PREREQ_JOIN_DISTANCE = 12;
const CODE_RE = /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*$/i;

/** Join a line's items in x order; items that touch (ligature splits like "E|ff|ectivity") join without a space. */
function joinLine(items) {
  let out = '';
  let prevEnd = null;
  for (const it of items) {
    if (prevEnd !== null) out += (it.x - prevEnd > 1.5 ? ' ' : '');
    out += it.str;
    prevEnd = it.x + (it.width || 0);
  }
  return norm(out);
}

/** Items → lines (top to bottom), each { top, items (x order), text }. */
function toLines(page) {
  const items = page.items
    .filter((it) => norm(it.str))
    .map((it) => ({ ...it, str: norm(it.str), top: page.height - it.y }))
    .sort((a, b) => a.top - b.top || a.x - b.x);
  const lines = [];
  for (const it of items) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(it.top - last.top) <= LINE_TOLERANCE) last.items.push(it);
    else lines.push({ top: it.top, items: [it] });
  }
  for (const l of lines) {
    l.items.sort((a, b) => a.x - b.x);
    l.text = joinLine(l.items);
  }
  return lines;
}

/** Column boundaries from a header pair ("SUBJ ID … Hrs/Week" + "LEC LAB TOTAL"). */
function columnsFrom(headLine, unitsLine) {
  const find = (line, re) => (line ? line.items.find((it) => re.test(it.str)) : null);
  const desc = find(headLine, /SUBJECT\s*DESC/i);
  const pre = find(headLine, /Pre-?Req/i);
  const hrs = find(headLine, /Hrs\s*\/?\s*Week/i);
  const lec = find(unitsLine, /^LEC$/i);
  const lab = find(unitsLine, /^LAB$/i);
  const tot = find(unitsLine, /^TOTAL$/i);
  if (!desc || !lec || !lab || !tot || !hrs) return null;
  const preX = pre ? pre.x : (tot.x + hrs.x) / 2;
  return {
    code: [-Infinity, desc.x - 4],
    title: [desc.x - 4, lec.x - 12],
    lec: [lec.x - 12, (lec.x + lab.x) / 2],
    lab: [(lec.x + lab.x) / 2, (lab.x + tot.x) / 2],
    total: [(lab.x + tot.x) / 2, (tot.x + preX) / 2],
    prereq: [(tot.x + preX) / 2, (preX + hrs.x) / 2],
    hrs: [(preX + hrs.x) / 2, Infinity],
  };
}

const columnOf = (cols, x) => Object.keys(cols).find((k) => x >= cols[k][0] && x < cols[k][1]) || null;

/** "(2)" → { value: 2, bracketed: true }; "3" → { value: 3 }; "" → null. */
function unitCell(s) {
  const t = norm(s);
  if (!t) return null;
  const m = t.match(/^\(?\s*(\d+(?:\.\d+)?)\s*\)?$/);
  if (!m) return null;
  return { value: Number(m[1]), bracketed: t.startsWith('(') };
}

const cellsOf = (line, cols) => {
  const cells = {};
  for (const it of line.items) {
    const k = columnOf(cols, it.x);
    if (!k) continue;
    cells[k] = cells[k] ? joinLine([...line.items.filter((i) => columnOf(cols, i.x) === k)]) : it.str;
  }
  return cells;
};

/** Split the prerequisite cell into codes / standing requirements. */
export function splitPrereqs(raw) {
  return norm(raw).split(/\s*[,;]\s*/).map(norm).filter(Boolean);
}
export const isStandingRequirement = (s) => /standing/i.test(s);

function headerOf(lines) {
  const text = lines.map((l) => l.text);
  const all = text.join('\n');
  const program = text.find((t) => /^(BS|AB|Bachelor|Associate|Master|Doctor)\b/i.test(t) && !/Program of Study/i.test(t)) || null;
  const programName = program ? norm(program.replace(/\s+UNC-[A-Z0-9-]+\s*$/i, '')) : null;
  const college = text.find((t) => /^(College|School|Institute|Department)\s+of\b/i.test(t)) || null;
  const cmoM = all.match(/CMO\s*No\.?\s*(\d+)\s*(?:,?\s*(?:Series\s+of|S\.?)\s*(\d{4}))?/i);
  const effM = all.match(/E\s*ff\s*ectivity\s+Date:\s*(.+?)(?=\s+Program\s+Revision|\n|$)/i);
  const revM = all.match(/Program\s+Revision\s+No\.?\s*([A-Z0-9.-]+)/i);
  const docM = all.match(/\b(UNC-[A-Z0-9-]+)\b/);
  return {
    program_name: programName,
    college: college ? norm(college) : null,
    cmo: cmoM ? 'CMO No. ' + cmoM[1] + (cmoM[2] ? ' S. ' + cmoM[2] : '') : null,
    effectivity: effM ? norm(effM[1]) : null,
    revision: revM ? revM[1] : null,
    doc_control: docM ? docM[1] : null,
  };
}

/**
 * Positioned pages → { header, years: [{ year, semesters: [{ semester, courses, totals }] }],
 *   programTotal, courses (flat), part_label, textLength }.
 * Throws ExtractionError for a scanned file or one with no Program of Study tables.
 */
export function extractProgramOfStudy(pages) {
  const textLength = pages.reduce((n, p) => n + p.items.reduce((m, it) => m + norm(it.str).length, 0), 0);
  if (textLength < 40) throw new ExtractionError(POS_MESSAGES.scanned, 'SCANNED');

  const years = [];
  let header = null;
  let programTotal = null;
  let year = null;
  let sem = null;
  let cols = null;
  let pendingHead = null;

  for (const page of pages) {
    const lines = toLines(page);
    const firstYear = lines.findIndex((l) => /^(FIRST|SECOND|THIRD|FOURTH|FIFTH)\s+YEAR$/i.test(l.text));
    if (!header && firstYear > 0) header = headerOf(lines.slice(0, firstYear));
    const strays = [];

    for (const line of lines) {
      const t = line.text;
      const ym = t.match(/^(FIRST|SECOND|THIRD|FOURTH|FIFTH)\s+YEAR$/i);
      if (ym) {
        year = { year: YEAR_WORDS[ym[1].toUpperCase()], semesters: [] };
        years.push(year);
        sem = null;
        continue;
      }
      const sm = t.match(/^(FIRST|SECOND)\s+SEMESTER$|^SUMMER$/i);
      if (sm && year) {
        const n = /^SUMMER/i.test(t) ? 3 : (sm[1].toUpperCase() === 'SECOND' ? 2 : 1);
        sem = { semester: n, courses: [], totals: null };
        year.semesters.push(sem);
        continue;
      }
      if (/SUBJ\s*ID/i.test(t) && /Hrs/i.test(t)) { pendingHead = line; continue; }
      if (pendingHead && /^LEC\b/i.test(line.items[0].str) && /TOTAL/i.test(t)) {
        cols = columnsFrom(pendingHead, line) || cols;
        pendingHead = null;
        continue;
      }
      const totM = t.match(/^TOTAL NUMBER OF UNITS\s+(\d+)/i);
      if (totM) { programTotal = Number(totM[1]); continue; }
      if (!sem || !cols) continue;

      const cells = cellsOf(line, cols);
      if (/^Total$/i.test(line.items[0].str) || (!cells.code && cells.title && /^Total$/i.test(cells.title))) {
        const u = (k) => (unitCell(cells[k]) ? unitCell(cells[k]).value : null);
        sem.totals = { lec: u('lec'), lab: u('lab'), total: u('total'), hrs: u('hrs') };
        continue;
      }
      if (cells.code && CODE_RE.test(cells.code) && cells.title) {
        const lec = unitCell(cells.lec);
        const lab = unitCell(cells.lab);
        const total = unitCell(cells.total);
        const hrs = unitCell(cells.hrs);
        sem.courses.push({
          // As printed ("PE1k", "NSTP1k"); compare codes case-insensitively.
          code: cells.code,
          title: cells.title,
          lec: lec ? lec.value : 0,
          lab: lab ? lab.value : 0,
          total: total ? total.value : null,
          hrs: hrs ? hrs.value : null,
          nonCredit: !!((lec && lec.bracketed) || (total && total.bracketed)),
          prereqParts: cells.prereq ? [{ top: line.top, text: cells.prereq }] : [],
          year: year.year,
          semester: sem.semester,
          top: line.top,
          page: pages.indexOf(page) + 1,
        });
        continue;
      }
      // A line holding nothing but prerequisite text: part of a wrapped cell.
      const keys = Object.keys(cells);
      if (keys.length === 1 && keys[0] === 'prereq') strays.push({ top: line.top, text: cells.prereq, sem });
    }

    for (const s of strays) {
      let best = null;
      for (const c of s.sem.courses) {
        const d = Math.abs(c.top - s.top);
        if (d <= PREREQ_JOIN_DISTANCE && (!best || d < best.d)) best = { c, d };
      }
      if (best) best.c.prereqParts.push({ top: s.top, text: s.text });
    }
  }

  const courses = [];
  for (const y of years) {
    for (const s of y.semesters) {
      for (const c of s.courses) {
        const raw = c.prereqParts.sort((a, b) => a.top - b.top).map((p) => p.text).join(' ');
        c.prerequisites = splitPrereqs(raw.replace(/,\s*$/, ''));
        c.prereqRaw = c.prerequisites.join(', ');
        delete c.prereqParts;
        delete c.top;
        courses.push(c);
      }
    }
  }
  if (courses.length === 0) throw new ExtractionError(POS_MESSAGES.notPos, 'NOT_PROGRAM_OF_STUDY');

  const yearNums = [...new Set(years.filter((y) => y.semesters.some((s) => s.courses.length)).map((y) => y.year))].sort();
  const part_label = yearNums.length === 0 ? null
    : yearNums.length === 1 ? yearLabel(yearNums[0])
    : YEAR_LABEL[yearNums[0]] + '–' + yearLabel(yearNums[yearNums.length - 1]);

  return { header: header || headerOf([]), years, programTotal, courses, part_label, years_covered: yearNums, textLength };
}

const sha256Of = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

/** PDF buffer → extractProgramOfStudy(...) + { pages, sha256 }. Throws ExtractionError (422). */
export async function parseProgramOfStudyPdf(buffer) {
  let read;
  try {
    read = await readPdfItems(buffer);
  } catch (err) {
    if (err instanceof ExtractionError) throw err;
    throw new ExtractionError(POS_MESSAGES.unreadable, 'UNREADABLE');
  }
  const out = extractProgramOfStudy(read.pages);
  return { ...out, pages: read.numPages, sha256: sha256Of(buffer) };
}
