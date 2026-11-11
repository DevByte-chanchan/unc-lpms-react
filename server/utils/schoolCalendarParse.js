/**
 * Reading a school calendar's rows into term dates. Pure: no files, no database
 * (tests/schoolCalendarParse.test.js).
 *
 * Every reader (text PDF, OCR, AI) produces the same TRANSCRIPT, and only this
 * file decides what the rows mean:
 *
 *   { schoolYear: '2026-2027' | null,
 *     blocks: [{ title: 'FIRST SEMESTER SY 2026-2027', semester?: '1st',
 *                rangeText: 'July 20 to Nov 25, 2026',
 *                rows: [{ dateText: 'Sept 25-29', event: 'Midterm Examination' }],
 *                bbox?: { x, y, w, h } }] }      (bbox: 0–1 of the page, when known)
 *
 * parseTranscript(transcript)  → the blocks with every date worked out
 * fieldsFor(parsed, semester)  → the seven form fields for one semester, with
 *                                where each came from, alternatives, the other
 *                                rows (`events`) and warnings
 *
 * RULES (see the brief in Claude outputs/lpms-school-calendar-upload-prompt.md)
 *  - Dates carry no year. The block's range line ("Dec 9, 2026 to Apr 24, 2027")
 *    decides it: a month inside the range takes the range's year for that
 *    month; a month outside it belongs to the nearer end (enrollment in Nov
 *    before a December start is the start's year; a deadline in May after an
 *    April end is the end's year).
 *  - "Aug 20, 22, 24-25", "Jun 10-11,14", "Nov 26-Dec 7", "Apr 26-May 3".
 *    "May to Jun" (no day) is kept as text only.
 *  - Exam fields take the FIRST day.
 *  - A field that isn't found stays empty. Nothing is guessed.
 *  - Two final exams (Graduating / Undergrad): Undergrad by default, the other
 *    offered as an alternative.
 */
import { calendarOrderError } from './schoolCalendar.js';

// ───────────────────────────── text helpers ─────────────────────────────

/** Lower case, one space, typographic dashes and quotes made plain. */
export const norm = (s) => String(s || '')
  .normalize('NFKD').replace(/[̀-ͯ]/g, '') // Peñafrancia → Penafrancia
  .replace(/[‐-―−]/g, '-')
  .replace(/[‘’]/g, "'")
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const MONTHS = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11,
  dec: 12, december: 12,
};
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

/** Edit distance, for OCR-tolerant matching (short strings only). */
export function editDistance(a, b) {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 2) return 3;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

/**
 * The month number of a word, or 0. `lenient` (OCR text) also accepts a word
 * one letter off a month name ("Sopt", "Fob", "Ded") — but only when exactly
 * one month is that close, so "Mary" (May? Mar?) is not a month.
 */
export function monthOf(word, { lenient = false } = {}) {
  const c = monthCandidates(word, { lenient });
  return c.length === 1 ? c[0] : 0;
}

/**
 * Every month a word could be. Exact names give one. In OCR text a word one
 * letter off a month name, starting with the same letter, gives each month it
 * is that close to: "Sopt" → [9], "Ju" → [6, 7], "Mary" → [5, 3]. The caller
 * keeps a reading only when exactly one candidate makes sense (see
 * parseTranscript: the one inside the block's range).
 */
export function monthCandidates(word, { lenient = false } = {}) {
  const w = String(word || '').toLowerCase().replace(/\.$/, '');
  if (MONTHS[w]) return [MONTHS[w]];
  if (!lenient || w.length < 2 || !/^[a-z0-9]+$/.test(w) || /^\d+$/.test(w)) return [];
  const fixed = w.replace(/0/g, 'o').replace(/1/g, 'l').replace(/5/g, 's');
  if (MONTHS[fixed]) return [MONTHS[fixed]];
  const hits = [];
  for (const [name, num] of Object.entries(MONTHS)) {
    if (name.length < 3 || Math.abs(name.length - fixed.length) > 1) continue;
    if (fixed[0] === name[0] && editDistance(fixed, name) <= 1 && !hits.includes(num)) hits.push(num);
  }
  return hits;
}

const pad = (n) => (n < 10 ? '0' : '') + n;
export const ymdOf = (y, m, d) => y + '-' + pad(m) + '-' + pad(d);

/** A real day? */
function validDay(y, m, d) {
  if (!y || !m || !d || m > 12 || d > 31) return false;
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

// ───────────────────────────── date text ─────────────────────────────

/**
 * Parse a date cell into spans of { m, d, y? } (no years worked out yet).
 *   'Sept 25-29'         → [{ start: {m:9,d:25}, end: {m:9,d:29} }]
 *   'Aug 20, 22, 24-25'  → three spans, Aug carried over
 *   'Nov 26-Dec 7'       → one span across months
 *   'Dec 9, 2026'        → [{ start: {m:12,d:9,y:2026}, ... }]
 *   'May to Jun'         → [] with monthsOnly: true
 * Returns { spans, monthsOnly }.
 */
export function parseDateText(text, { lenient = false, joinedDays = lenient } = {}) {
  let s = norm(text).replace(/(\d)\s*-\s*(\d)/g, '$1-$2');
  if (lenient) {
    // OCR: "Nov21.25" → "Nov 21, 25"; "12:15" → "12-15"; "Sept 11 16.18 21".
    s = s.replace(/([a-z])(\d)/g, '$1 $2').replace(/(\d)([a-z])/g, '$1 $2')
      .replace(/(\d)\s*[:;]\s*(\d)/g, '$1-$2').replace(/(\d)\.(\d)/g, '$1, $2');
    // A dash lost between two days: "Jan 1510" is "Jan 15-10…", "2327" is "23-27".
    // Only for a date cell (never a range line, which carries years), and only
    // when both halves are days and the second is the later one.
    if (joinedDays) {
      s = s.replace(/\b(\d{2})(\d{2})\b/g, (all, a, b) => (Number(a) >= 1 && Number(a) <= 31 && Number(b) > Number(a) && Number(b) <= 31 ? a + '-' + b : all));
    }
  }
  // Tokens: words, numbers, '-', ','.
  const tokens = s.match(/[a-z0-9]+\.?|-|,/g) || [];
  const spans = [];
  let month = 0;
  let alt = null;
  let sawMonth = false;
  let i = 0;
  // → [month, …other candidates] or null
  const readMonth = () => {
    const t = tokens[i];
    if (t && /^[a-z0-9]+\.?$/.test(t) && !/^\d+$/.test(t)) {
      const c = monthCandidates(t, { lenient });
      if (c.length) { i += 1; sawMonth = true; return c; }
    }
    return null;
  };
  const readDay = () => {
    const t = tokens[i];
    if (t && /^\d{1,2}$/.test(t)) { i += 1; return Number(t); }
    return 0;
  };
  const readYear = () => {
    // ", 2026" or " 2026" right after a day
    let j = i;
    if (tokens[j] === ',') j += 1;
    if (tokens[j] && /^\d{4}$/.test(tokens[j])) { i = j + 1; return Number(tokens[j]); }
    return 0;
  };
  while (i < tokens.length) {
    const before = i;
    const m = readMonth();
    if (m) { month = m[0]; alt = m.length > 1 ? m : null; }
    const d = readDay();
    if (!d) {
      if (i === before) i += 1; // a word that isn't a month, a stray mark
      continue;
    }
    if (!month) continue; // a day before any month: unreadable
    const start = { m: month, d, ...(alt ? { alt } : {}) };
    const y1 = readYear();
    if (y1) start.y = y1;
    let end = { ...start };
    if (tokens[i] === '-') {
      i += 1;
      const m2 = readMonth();
      const d2 = readDay();
      if (d2) {
        if (m2) { month = m2[0]; alt = m2.length > 1 ? m2 : null; }
        end = m2
          ? { m: m2[0], d: d2, ...(m2.length > 1 ? { alt: m2 } : {}) }
          : { m: start.m, d: d2, ...(start.alt ? { alt: start.alt } : {}) };
        const y2 = readYear();
        if (y2) end.y = y2;
      }
    }
    spans.push({ start, end });
    if (tokens[i] === ',') i += 1;
  }
  return { spans, monthsOnly: spans.length === 0 && sawMonth };
}

// ───────────────────────────── years ─────────────────────────────

/**
 * The block's range line → { start: 'YYYY-MM-DD', end, text } or null.
 *   'July 20 to Nov 25, 2026'          → 2026-07-20 … 2026-11-25
 *   'Dec 9, 2026 to Apr 24, 2027'      → 2026-12-09 … 2027-04-24
 *   'May 4 to Jun 14, 2027'            → 2027-05-04 … 2027-06-14
 */
export function parseRange(text, { lenient = false } = {}) {
  let t = norm(text);
  // OCR reads "to" as "10", "lo", "fo"…; only between a date and a month name.
  if (lenient) t = t.replace(/(\d,?)\s+(?:10|lo|fo|t0|ta|io|1o)\s+(?=[a-z])/g, '$1 to ');
  const parts = t.split(/\s+(?:to|until|-)\s+|\s*[-]\s*(?=[a-z])/);
  if (parts.length < 2) return null;
  const a = parseDateText(parts[0], { lenient, joinedDays: false }).spans[0];
  const b = parseDateText(parts.slice(1).join(' '), { lenient, joinedDays: false }).spans[0];
  if (!a || !b || a.start.alt || b.end.alt) return null;
  const s = a.start;
  const e = b.end;
  const ye = e.y || s.y;
  if (!ye) return null;
  let ys = s.y || ye;
  if (!s.y && s.m > e.m) ys = ye - 1; // "Dec 9 to Apr 24, 2027"
  if (!validDay(ys, s.m, s.d) || !validDay(ye, e.m, e.d)) return null;
  const start = ymdOf(ys, s.m, s.d);
  const end = ymdOf(ye, e.m, e.d);
  if (end < start) return null;
  let shown = String(text || '').replace(/\s+/g, ' ').trim();
  if (lenient) shown = shown.replace(/(\d,?)\s+(?:10|lo|fo|t0|ta|io|1o)\s+(?=[a-z])/gi, '$1 to ');
  return { start, end, text: shown };
}

/**
 * The year of a month in a block. Inside the range: that part of the range's
 * year. Outside: whichever end is nearer (in months), so enrollment before the
 * start and deadlines after the end land in the right year.
 */
export function yearFor(month, range) {
  const ys = Number(range.start.slice(0, 4));
  const ms = Number(range.start.slice(5, 7));
  const ye = Number(range.end.slice(0, 4));
  const me = Number(range.end.slice(5, 7));
  const inside = ys === ye ? (month >= ms && month <= me) : (month >= ms || month <= me);
  if (inside) return ys === ye ? ys : (month >= ms ? ys : ye);
  const beforeStart = (ms - month + 12) % 12;
  const afterEnd = (month - me + 12) % 12;
  if (beforeStart <= afterEnd) return ys - (month > ms ? 1 : 0);
  return ye + (month < me ? 1 : 0);
}

/** The year of a month when the block has no range line: from the school year. */
function yearFromSchoolYear(month, semKey, schoolYear) {
  const m = /^(\d{4})-(\d{4})$/.exec(schoolYear || '');
  if (!m) return 0;
  const [y1, y2] = [Number(m[1]), Number(m[2])];
  if (semKey === 'Summer') return y2;
  if (semKey === '1st') return month >= 6 ? y1 : y2;
  return month >= 8 ? y1 : y2;
}

// ───────────────────────────── blocks ─────────────────────────────

export const SEMESTER_LABELS = { '1st': 'First Semester', '2nd': 'Second Semester', Summer: 'Summer' };

/** 'FIRST SEMESTER SY 2026-2027' → '1st'; 'SECOND SEM' → '2nd'; 'Summer 2027' → 'Summer'; else null. */
export function semesterOfTitle(title, { lenient = false } = {}) {
  const t = norm(title);
  if (/\bsummer\b/.test(t) || (lenient && /\bsumm?[ea]r?\b/.test(t))) return 'Summer';
  if (/\b(first|1st)\s+sem/.test(t)) return '1st';
  if (/\b(second|2nd)\s+sem/.test(t)) return '2nd';
  if (lenient) {
    if (/\bf[il1]rst\b/.test(t) && /sem/.test(t)) return '1st';
    if (/\bsec[o0]nd\b/.test(t) && /sem/.test(t)) return '2nd';
  }
  return null;
}

/** '2026-2027' from 'SY 2026-2027', 'ACADEMIC YEAR 2026 - 2027', "SY'26-27"; else null. */
export function schoolYearOf(text) {
  const t = norm(text);
  let m = /(20\d{2})\s*-\s*(20\d{2})/.exec(t);
  if (m && Number(m[2]) === Number(m[1]) + 1) return m[1] + '-' + m[2];
  m = /sy\s*'?\s*(\d{2})\s*-\s*(\d{2})\b/.exec(t);
  if (m && Number(m[2]) === Number(m[1]) + 1) return '20' + m[1] + '-20' + m[2];
  return null;
}

/** Normalise the form's semester ('1', '2', '3', 'Summer', '1st'…) to '1st' | '2nd' | 'Summer'. */
export function semesterKey(sem) {
  const v = String(sem || '').trim().toLowerCase();
  if (v === '1' || v === '1st' || v.startsWith('first')) return '1st';
  if (v === '2' || v === '2nd' || v.startsWith('second')) return '2nd';
  if (v === '3' || v === 'summer') return 'Summer';
  return null;
}

/**
 * The transcript with every row's dates worked out.
 * → { schoolYear, blocks: [{ key, title, schoolYear, range, bbox, rows: [{ dateText, event,
 *      dates: { first, last } | null }] }], warnings }
 * Blocks whose title names no semester are dropped (e.g. the "NO. OF SCHOOL DAYS" box).
 */
export function parseTranscript(transcript, { lenient = false } = {}) {
  const tr = transcript || {};
  const docYear = schoolYearOf(tr.schoolYear || '') || null;
  const blocks = [];
  for (const b of Array.isArray(tr.blocks) ? tr.blocks : []) {
    const key = semesterKey(b.semester) || semesterOfTitle(b.title, { lenient });
    if (!key) continue;
    if (blocks.some((x) => x.key === key)) continue; // the first block of a kind wins
    const range = b.rangeText ? parseRange(b.rangeText, { lenient }) : null;
    const schoolYear = schoolYearOf(b.title || '') || docYear
      || (range ? (key === '1st' ? range.start.slice(0, 4) + '-' + (Number(range.start.slice(0, 4)) + 1)
        : (Number(range.end.slice(0, 4)) - 1) + '-' + range.end.slice(0, 4)) : null);
    const rows = [];
    for (const r of Array.isArray(b.rows) ? b.rows : []) {
      const dateText = String(r.dateText || '').replace(/\s+/g, ' ').trim();
      const event = String(r.event || '').replace(/\s+/g, ' ').trim();
      if (!dateText && !event) continue;
      const { spans } = parseDateText(dateText, { lenient });
      let dates = null;
      if (spans.length) {
        const fix = (p) => {
          const at = (m) => {
            const y = p.y || (range ? yearFor(m, range) : yearFromSchoolYear(m, key, schoolYear));
            return validDay(y, m, p.d) ? ymdOf(y, m, p.d) : null;
          };
          if (!p.alt) return at(p.m);
          // An OCR word that could be two months ("Ju 20"): the one inside the range, if only one is.
          if (!range) return null;
          const inside = p.alt.map(at).filter((day) => day && day >= range.start && day <= range.end);
          return inside.length === 1 ? inside[0] : null;
        };
        const first = fix(spans[0].start);
        const lastSpan = spans[spans.length - 1];
        let last = fix(lastSpan.end);
        // "Nov 26-Dec 7" where Dec is in the next year of a same-year range: keep the order.
        if (first && last && last < first) last = null;
        if (first) dates = { first, last: last || first };
      }
      rows.push({ dateText, event, dates, ...(r.unsure ? { unsure: true } : {}) });
    }
    blocks.push({
      key,
      title: String(b.title || '').replace(/\s+/g, ' ').trim(),
      schoolYear,
      range,
      bbox: b.bbox || null,
      rows,
    });
  }
  const order = { '1st': 1, '2nd': 2, Summer: 3 };
  blocks.sort((a, b) => order[a.key] - order[b.key]);
  return { schoolYear: docYear || (blocks.find((b) => b.schoolYear) || {}).schoolYear || null, blocks };
}

// ───────────────────────────── events → fields ─────────────────────────────

const W = '(?:^|[^a-z])';
const E = '(?=$|[^a-z])';
/** Event text that counts for each field (normalised text). */
export const FIELD_PATTERNS = {
  classes_start: [
    new RegExp(W + '(first|1st) day of class(es)?' + E),
    new RegExp(W + '(opening|start) of class(es)?' + E),
    new RegExp(W + 'classes (begin|start)' + E),
  ],
  prelim_exam: [
    new RegExp(W + 'prelim(inary)? exam(ination)?s?' + E),
    new RegExp(W + 'prelims' + E),
  ],
  midterm_exam: [
    new RegExp(W + 'mid-? ?term exam(ination)?s?' + E),
    new RegExp(W + 'mid-? ?terms' + E),
  ],
  semifinal_exam: [
    new RegExp(W + 'semi-? ?final(s)?( exam(ination)?s?)?' + E),
  ],
  final_exam: [
    new RegExp(W + '(?<!semi-? ?)final exam(ination)?s?' + E),
    new RegExp(W + '(?<!semi-? ?)finals' + E),
  ],
  last_day: [
    new RegExp(W + 'last day of class(es)?' + E),
    new RegExp(W + '(end|close|closing) of class(es)?' + E),
  ],
};

// OCR: the same phrases, word by word, each word allowed a letter or two off.
const FUZZY_PHRASES = {
  classes_start: [['first', 'day', 'of', 'classes'], ['opening', 'of', 'classes'], ['start', 'of', 'classes']],
  prelim_exam: [['prelim', 'examination'], ['preliminary', 'examination'], ['prelim', 'exam']],
  midterm_exam: [['midterm', 'examination'], ['midterm', 'exam']],
  semifinal_exam: [['semi-final', 'examination'], ['semifinal', 'examination'], ['semi', 'final', 'examination']],
  final_exam: [['final', 'examination'], ['final', 'exam']],
  last_day: [['last', 'day', 'of', 'classes']],
};
const allow = (w) => (w.length <= 3 ? 0 : w.length <= 6 ? 1 : 2);
function fuzzyPhrase(words, phrase) {
  for (let i = 0; i + phrase.length <= words.length; i++) {
    let ok = true;
    for (let j = 0; j < phrase.length && ok; j++) {
      const w = words[i + j];
      const p = phrase[j];
      // Don't let a word stretch to fit: "semi-final" is not "final".
      ok = w === p || (w.length >= 3 && editDistance(w, p) <= allow(p));
    }
    if (ok && phrase[0] === 'final' && i > 0 && /^semi-?$/.test(words[i - 1])) ok = false;
    if (ok) return true;
  }
  return false;
}

export const FIELD_ORDER = ['classes_start', 'prelim_exam', 'midterm_exam', 'semifinal_exam', 'final_exam', 'last_day'];

/** Which field an event names, or null. Semi-final is tried before final. */
export function fieldOfEvent(event, { lenient = false } = {}) {
  const t = norm(event).replace(/[^a-z0-9()' -]+/g, ' ').replace(/\s+/g, ' ');
  for (const key of ['semifinal_exam', 'classes_start', 'prelim_exam', 'midterm_exam', 'final_exam', 'last_day']) {
    if (FIELD_PATTERNS[key].some((re) => re.test(t))) return key;
  }
  if (!lenient) return null;
  const words = t.split(' ').filter(Boolean);
  for (const key of ['semifinal_exam', 'classes_start', 'prelim_exam', 'midterm_exam', 'final_exam', 'last_day']) {
    if (FUZZY_PHRASES[key].some((p) => fuzzyPhrase(words, p))) return key;
  }
  return null;
}

/** 'Undergrad' | 'Graduating' | null, from "(Undergrad)" / "(Graduating)". */
export function finalAudience(event) {
  const t = norm(event);
  if (/under\s*-?\s*grad/.test(t)) return 'Undergrad';
  if (/graduating|graduate/.test(t)) return 'Graduating';
  return null;
}

/** "Sept 25, 2026" for the review panel and messages. */
export const shortDay = (ymd) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd || '');
  return m ? MONTH_SHORT[Number(m[2]) - 1] + ' ' + Number(m[3]) + ', ' + m[1] : '';
};
export const longDay = (ymd) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd || '');
  return m ? MONTH_NAMES[Number(m[2]) - 1] + ' ' + Number(m[3]) + ', ' + m[1] : '';
};

export const FORM_FIELDS = ['start_date', 'end_date', 'classes_start', 'prelim_exam', 'midterm_exam', 'semifinal_exam', 'final_exam'];
export const FIELD_LABELS = {
  start_date: 'Start of Semester',
  end_date: 'End of Semester',
  classes_start: 'Start of classes',
  prelim_exam: 'Prelim exam',
  midterm_exam: 'Midterm exam',
  semifinal_exam: 'Semi-final exam',
  final_exam: 'Final exam',
};

/**
 * The seven form fields for one semester.
 *
 * @param parsed      parseTranscript()'s result
 * @param semester    the form's semester ('1' | '2' | 'Summer' …)
 * @param opts.schoolYear  the form's school year, for the wrong-year warning
 * @param opts.purpose     'create' | 'edit' — only changes that warning's wording
 * @param opts.source      'pdf' | 'ocr' | 'ai' — stamped on every field
 * @param opts.strict      OCR: drop a date that falls outside the block's range
 * @returns { block, fields, sources, alternatives, events, warnings, missing, blocksFound }
 *   block   null when the calendar has no block for that semester
 *   missing the fields not found (for the "Not found" tags)
 */
export function fieldsFor(parsed, semester, { schoolYear = null, purpose = 'create', source = 'pdf', strict = false } = {}) {
  const key = semesterKey(semester);
  const blocksFound = (parsed.blocks || []).map((b) => b.key);
  const fields = Object.fromEntries(FORM_FIELDS.map((f) => [f, '']));
  const out = { block: null, fields, sources: {}, alternatives: {}, events: [], warnings: [], missing: [], blocksFound };
  const block = (parsed.blocks || []).find((b) => b.key === key);
  if (!block) {
    out.missing = [...FORM_FIELDS];
    return out;
  }
  out.block = { key: block.key, title: block.title, rangeText: block.range ? block.range.text : '', bbox: block.bbox, schoolYear: block.schoolYear };

  const fileYear = block.schoolYear || parsed.schoolYear;
  if (schoolYear && fileYear && fileYear !== schoolYear) {
    out.warnings.push(`This calendar is for ${fileYear}; you're ${purpose === 'edit' ? 'editing' : 'creating'} ${schoolYear}.`);
  }

  const inRange = (day) => !block.range || (day >= shiftDays(block.range.start, -45) && day <= shiftDays(block.range.end, 45));
  const set = (field, day, text) => {
    fields[field] = day;
    out.sources[field] = { text, source };
  };

  // Row → field candidates.
  const candidates = Object.fromEntries(FIELD_ORDER.map((f) => [f, []]));
  const dateless = {};
  for (const r of block.rows) {
    // OCR rows whose two readings disagreed are listed, never used for a field.
    const f = r.unsure ? null : fieldOfEvent(r.event, { lenient: source === 'ocr' });
    if (f && !r.dates && !dateless[f]) dateless[f] = r;
    if (f && r.dates) {
      const day = r.dates.first;
      if (strict && !inRange(day)) {
        out.warnings.push(`Skipped "${r.dateText} · ${r.event}": it falls outside ${block.range.text}. Check that date by hand.`);
      } else {
        candidates[f].push({ day, text: r.dateText + ' · ' + r.event, audience: f === 'final_exam' ? finalAudience(r.event) : null });
        continue;
      }
    }
    if (!f || f === 'last_day') {
      out.events.push({ dateText: r.dateText, event: r.event, date: r.dates ? r.dates.first : null, end: r.dates && r.dates.last !== r.dates.first ? r.dates.last : null });
    }
  }
  // last_day rows also show in the list of other dates.
  for (const c of candidates.last_day) {
    if (!out.events.some((e) => e.event && c.text.endsWith(e.event))) {
      const [dateText, event] = c.text.split(' · ');
      out.events.push({ dateText, event, date: c.day, end: null });
    }
  }

  for (const f of ['classes_start', 'prelim_exam', 'midterm_exam', 'semifinal_exam', 'final_exam']) {
    const list = candidates[f];
    if (!list.length) continue;
    let pick = list[0];
    if (f === 'final_exam' && list.length > 1) {
      pick = list.find((c) => c.audience === 'Undergrad') || list.find((c) => c.audience !== 'Graduating') || list[0];
    }
    set(f, pick.day, pick.text);
    const others = list.filter((c) => c !== pick && c.day !== pick.day);
    if (others.length) {
      out.alternatives[f] = [pick, ...others].map((c) => ({
        value: c.day,
        label: c.audience || null,
        text: c.text,
      }));
    }
  }

  // Start / end of semester: the range line; else first / last day of classes.
  if (block.range) {
    set('start_date', block.range.start, block.range.text + ' (start)');
    set('end_date', block.range.end, block.range.text + ' (end)');
  } else {
    if (fields.classes_start) set('start_date', fields.classes_start, out.sources.classes_start.text);
    if (candidates.last_day.length) set('end_date', candidates.last_day[0].day, candidates.last_day[0].text);
  }

  out.events.sort((a, b) => String(a.date || '9999').localeCompare(String(b.date || '9999')));

  for (const [f, r] of Object.entries(dateless)) {
    if (FIELD_LABELS[f] && !fields[f]) {
      out.warnings.push(`Found "${r.event}" but couldn't read its date${r.dateText ? ` ("${r.dateText}")` : ''}. Type it from the picture.`);
    }
  }

  // Summer has no prelim or semi-final: empty without a warning.
  const optional = block.key === 'Summer' ? new Set(['prelim_exam', 'semifinal_exam']) : new Set();
  out.missing = FORM_FIELDS.filter((f) => !fields[f]);
  out.optionalMissing = out.missing.filter((f) => optional.has(f));

  const order = calendarOrderError(fields);
  if (order) out.warnings.push(order);
  return out;
}

/** 'YYYY-MM-DD' ± n days. */
export function shiftDays(ymd, n) {
  const [y, m, d] = ymd.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

// ───────────────────────────── plain text → transcript ─────────────────────────────

const DATE_START = /^\s*((?:[a-z]{3,9}\.?|\d{1,2})[a-z0-9 ,.\-–—]*?)\s{2,}(.+)$/i;
/** A row "Sept 25-29   Midterm Examination" → { dateText, event }, else null. */
export function splitRowLine(line, { lenient = false } = {}) {
  const s = String(line || '').replace(/\t/g, '   ').trimEnd();
  // Two or more spaces (or a tab) between the columns, as text extraction leaves them.
  let m = DATE_START.exec(s);
  if (m && isDateText(m[1], { lenient })) return { dateText: m[1].trim(), event: m[2].trim() };
  // One space: take the longest leading run that still reads as a date.
  const words = s.trim().split(/\s+/);
  for (let k = Math.min(words.length - 1, 6); k >= 1; k--) {
    const head = words.slice(0, k).join(' ');
    const rest = words.slice(k).join(' ');
    if (!/[a-z]/i.test(rest)) continue;
    if (/^\d/.test(rest) || /^[,-]/.test(rest)) continue;
    if (isDateText(head, { lenient }) && !monthOf(words[k], { lenient: false })) return { dateText: head, event: rest };
  }
  return null;
}
/** Is this text a date cell ("Sept 25-29", "May to Jun") and nothing else? */
export function isDateText(text, { lenient = false } = {}) {
  const t = norm(text);
  if (/[a-z]{4,}\s+[a-z]{4,}\s+[a-z]{4,}/.test(t) && !/\bto\b/.test(t)) return false;
  const r = parseDateText(text, { lenient });
  if (r.spans.length) {
    // Everything in the head must be date material.
    const words = t.split(/[^a-z0-9]+/).filter(Boolean);
    return words.every((w) => /^\d+$/.test(w) || monthCandidates(w, { lenient }).length > 0 || w === 'to');
  }
  return r.monthsOnly && /^\s*[a-z]+\.?\s+to\s+[a-z]+\.?\s*$/i.test(t);
}

/**
 * Lines of one column of text (a text PDF's block, or OCR of a whole block)
 * → a transcript block: the title, the range line, then the rows.
 */
export function blockFromLines(lines, { lenient = false } = {}) {
  const clean = lines.map((l) => String(l || '').replace(/\s+$/, '')).filter((l) => l.trim());
  let title = '';
  let rangeText = '';
  const rows = [];
  for (const line of clean) {
    if (!title && semesterOfTitle(line, { lenient })) { title = line.trim(); continue; }
    if (title && !rangeText && !rows.length && parseRange(line, { lenient })) { rangeText = line.trim(); continue; }
    if (!title) continue;
    const row = splitRowLine(line, { lenient });
    if (row) rows.push(row);
  }
  return title ? { title, rangeText, rows } : null;
}
