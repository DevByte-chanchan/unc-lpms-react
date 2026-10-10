/**
 * University VMGO extraction — reads the UNIVERSITY block of an institutional
 * statements PDF into { vision, mission, educational_policy, core_values,
 * graduate_attributes }. No DB access; the controller decides what to do with
 * the result.
 *
 * THE PITFALL THIS FILE EXISTS FOR
 * The source is a two-column table: labels on the left ("VISION" / "STATEMENT"
 * on two lines), content on the right. Plain text extraction reads it line by
 * line across BOTH columns, so "STATEMENT" lands inside the vision paragraph.
 * Everything here works from positioned text items instead:
 *
 *   1. Every item gets a document-wide `top` (page index × a large stride +
 *      distance from the page top), so "later in the document" is one number
 *      and a section that runs onto the next page needs no special case.
 *   2. Label anchors (VISION, MISSION, EDUCATIONAL, CORE, GRADUATE) fix the
 *      label column. The content column starts at the leftmost non-label text
 *      to the right of it; anything left of that is label and is dropped.
 *   3. Each section's band runs from its label's top to the next label's top;
 *      the last one runs to the next block header (COLLEGE / SCHOOL / …) or the
 *      end of the document.
 *
 * Lists (core values, graduate attributes) split on a number/bullet marker
 * when there is one, otherwise on a line that opens in a bold font. The title
 * is the bold run, NOT "text up to the first period": "We Are Dynamic and
 * Creative We anticipate…" has no period after its title. Bold detection comes
 * from the embedded font's real name (…-BoldMT, …,Bold), which is why fonts are
 * resolved through the operator list rather than read off textContent.styles
 * (that only gives a generic family like "sans-serif").
 *
 * ONE ENGINE, TWO CALLERS
 * extractStatementsFromPages takes a config (labels, which block, whether
 * unknown labels are kept, whether list items are expected to have titles).
 * UNIVERSITY_CONFIG reproduces the original behaviour exactly; the department
 * path picks a COLLEGE / SCHOOL / … block instead, keeps labels it doesn't
 * know under other_sections, and treats list titles as optional;
 * parseDepartmentStatementsPdf then returns only vision and mission.
 */
import crypto from 'node:crypto';
import path from 'node:path';
import { createRequire } from 'node:module';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const require = createRequire(import.meta.url);
// pdfjs needs the standard-font metrics for PDFs that use the 14 built-in fonts
// without embedding them; without this it logs a warning per font.
const STANDARD_FONT_DATA_URL =
  path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts') + path.sep;

// Each page gets its own band of `top` values, so positions compare across pages.
const PAGE_STRIDE = 100000;

export const SECTIONS = [
  { key: 'vision',              word: 'VISION',      second: 'STATEMENT',  label: 'Vision Statement',    list: false },
  { key: 'mission',             word: 'MISSION',     second: 'STATEMENT',  label: 'Mission Statement',   list: false },
  { key: 'educational_policy',  word: 'EDUCATIONAL', second: 'POLICY',     label: 'Educational Policy',  list: false },
  { key: 'core_values',         word: 'CORE',        second: 'VALUES',     label: 'Core Values',         list: true },
  { key: 'graduate_attributes', word: 'GRADUATE',    second: 'ATTRIBUTES', label: 'Graduate Attributes', list: true },
];

// Department block labels. `alt` = accepted spellings of the first word.
// Goals / objectives / core values are optional, so a missing one isn't flagged.
export const DEPARTMENT_SECTIONS = [
  { key: 'vision',      word: 'VISION',     second: 'STATEMENT', label: 'Vision',      list: false },
  { key: 'mission',     word: 'MISSION',    second: 'STATEMENT', label: 'Mission',     list: false },
  { key: 'goals',       word: 'GOALS',      alt: ['GOAL'],       label: 'Goals',       list: true, optional: true },
  { key: 'objectives',  word: 'OBJECTIVES', alt: ['OBJECTIVE'],  label: 'Objectives',  list: true, optional: true },
  { key: 'core_values', word: 'CORE',       second: 'VALUES',    label: 'Core Values', list: true, optional: true },
];

const labelWordsOf = (sections) => new Set(sections.flatMap((s) => [s.word, s.second, ...(s.alt || [])].filter(Boolean)));
// Full-width header bars that open a NEW block below the university one.
const BLOCK_HEADER_RE = /^(COLLEGE|SCHOOL|PROGRAM|DEPARTMENT|INSTITUTE)\b/;
// Header bars that open a department's own block, and any header bar at all.
const DEPARTMENT_HEADER_RE = /^(COLLEGE|SCHOOL|DEPARTMENT|INSTITUTE)\b/;
const ANY_HEADER_RE = /^(UNIVERSITY|COLLEGE|SCHOOL|PROGRAM|DEPARTMENT|INSTITUTE)\b/;
const BOLD_FONT_RE = /bold|black|heavy/i;
const MARKER_RE = /^\s*(?:\d{1,2}[.)]|[•▪●◦‣·\-–])\s*/;
const NUMBERED_LINE_RE = /^\s*(?:\d{1,2}[.)]|[•▪●◦‣·])(?:\s|$)/;
const PAGE_FOOTER_RE = /^(page\s+)?\d+(\s+of\s+\d+)?$/i;

export class ExtractionError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'ExtractionError';
    this.status = 422;
    this.code = code;
  }
}

export const MESSAGES = {
  scanned: "This PDF is a scanned image, so its text can't be read. Upload the original PDF exported from Word, or type the statements in.",
  noLabels: "Couldn't find VISION / MISSION / EDUCATIONAL POLICY / CORE VALUES / GRADUATE ATTRIBUTES labels in this PDF — is this the right file?",
};

export const DEPARTMENT_MESSAGES = {
  scanned: MESSAGES.scanned,
  noLabels: "Couldn't find VISION / MISSION / GOALS / OBJECTIVES / CORE VALUES labels in this PDF — is this the right file?",
  noDepartmentBlock: "This PDF has no COLLEGE / SCHOOL / DEPARTMENT block — only a university or program block. Upload your department's VMGO PDF.",
};

export const UNIVERSITY_CONFIG = {
  sections: SECTIONS,
  block: {
    pick: 'first',                         // the first header matching start()
    start: (headerText) => headerText === 'UNIVERSITY',
    stopAt: BLOCK_HEADER_RE,
  },
  captureUnknownLabels: false,
  titleExpected: { core_values: true, graduate_attributes: true },
  messages: MESSAGES,
};

export const DEPARTMENT_CONFIG = {
  sections: DEPARTMENT_SECTIONS,
  block: {
    pick: 'best',                          // best match for the selected department
    start: (headerText) => DEPARTMENT_HEADER_RE.test(headerText),
    stopAt: ANY_HEADER_RE,
  },
  // "COLLEGE GOALS", "SCHOOL VISION" are the same labels with the org in front.
  labelPrefixes: ['COLLEGE', 'SCHOOL', 'DEPARTMENT', 'INSTITUTE'],
  captureUnknownLabels: true,
  titleExpected: { goals: false, objectives: false, core_values: false },
  messages: DEPARTMENT_MESSAGES,
};

// ---------------------------------------------------------------------------
// PDF → positioned items
// ---------------------------------------------------------------------------

/**
 * Read every page into { height, items: [{ str, x, y, width, height, fontName, bold }] }.
 * `y` is the PDF baseline (origin bottom-left), as pdfjs reports it.
 */
export async function readPdfItems(buffer) {
  const doc = await getDocument({
    data: new Uint8Array(buffer),
    verbosity: 0,
    disableFontFace: true,
    isEvalSupported: false,
    useSystemFonts: false,
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
  }).promise;

  const pages = [];
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      // Loading the operator list is what resolves each fontName ("g_d0_f2")
      // to the font object carrying its real name ("ABCDEF+Arial-BoldMT").
      try { await page.getOperatorList(); } catch { /* fonts stay unknown */ }

      const fontNames = new Map();
      const realName = (id) => {
        if (fontNames.has(id)) return fontNames.get(id);
        let name = '';
        try {
          const font = page.commonObjs.has(id) ? page.commonObjs.get(id) : null;
          name = (font && (font.name || font.loadedName)) || '';
        } catch { /* not resolved */ }
        if (!name && content.styles && content.styles[id]) name = content.styles[id].fontFamily || '';
        fontNames.set(id, name);
        return name;
      };

      const items = [];
      for (const it of content.items) {
        if (typeof it.str !== 'string' || it.str === '') continue;
        const [a, b, , d, e, f] = it.transform;
        const fontName = realName(it.fontName);
        items.push({
          str: it.str,
          x: e,
          y: f,
          width: it.width,
          height: it.height || Math.hypot(a, b) || Math.abs(d) || 10,
          fontName,
          bold: BOLD_FONT_RE.test(fontName),
        });
      }
      pages.push({ height: viewport.height, items });
      page.cleanup();
    }
  } finally {
    await doc.destroy();
  }
  return { numPages: doc.numPages, pages };
}

// ---------------------------------------------------------------------------
// Positioned items → fields
// ---------------------------------------------------------------------------

const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const upper = (s) => norm(s).toUpperCase();

/** Items flattened with a document-wide `top` (grows downward, across pages). */
function flatten(pages) {
  const out = [];
  pages.forEach((pg, i) => {
    for (const it of pg.items) {
      out.push({ ...it, page: i, top: i * PAGE_STRIDE + (pg.height - it.y - it.height) });
    }
  });
  return out;
}

/** Group items into lines by `top` (with tolerance), each sorted left → right. */
function groupLines(items) {
  const sorted = items.slice().sort((a, b) => a.top - b.top || a.x - b.x);
  const lines = [];
  for (const it of sorted) {
    const tol = Math.max(2, it.height * 0.5);
    const line = lines.length ? lines[lines.length - 1] : null;
    if (line && line.page === it.page && Math.abs(it.top - line.top) <= tol) {
      line.items.push(it);
    } else {
      lines.push({ page: it.page, top: it.top, height: it.height, items: [it] });
    }
  }
  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x);
    line.x = line.items[0].x;
    line.text = lineChars(line).map((c) => c.ch).join('');
  }
  return lines;
}

/**
 * A line as characters with a bold flag each. Items that sit apart get a space
 * between them; whitespace takes the bold flag of the text before it, so a
 * bold title made of separate word items stays one bold run.
 */
function lineChars(line) {
  const chars = [];
  let prev = null;
  for (const it of line.items) {
    if (prev) {
      const gap = it.x - (prev.x + prev.width);
      const lastCh = chars.length ? chars[chars.length - 1].ch : ' ';
      if (gap > it.height * 0.15 && !/\s/.test(lastCh) && !/^\s/.test(it.str)) {
        chars.push({ ch: ' ', bold: prev.bold });
      }
    }
    for (const ch of it.str) chars.push({ ch, bold: it.bold });
    prev = it;
  }
  return chars;
}

/** Is this item (or the start of it) a label word — "VISION", "CORE VALUES"? */
function isLabelText(str, labelWords) {
  const words = upper(str).split(' ').filter(Boolean);
  return words.length > 0 && words.every((w) => labelWords.has(w));
}

/**
 * Turn wrapped lines into one paragraph's worth of characters: lines joined by
 * a space, and an end-of-line hyphen glued back onto its word ("docu-" + "ment").
 */
function joinLines(lines) {
  const out = [];
  for (const line of lines) {
    let chars = lineChars(line);
    // Trim the line's own outer whitespace.
    while (chars.length && /\s/.test(chars[0].ch)) chars = chars.slice(1);
    while (chars.length && /\s/.test(chars[chars.length - 1].ch)) chars = chars.slice(0, -1);
    if (!chars.length) continue;
    if (out.length) {
      const last = out[out.length - 1];
      const beforeLast = out.length > 1 ? out[out.length - 2] : null;
      if (last.ch === '-' && beforeLast && /[a-z]/i.test(beforeLast.ch) && /[a-z]/.test(chars[0].ch)) {
        out.pop();                          // docu- + ment → document
      } else {
        out.push({ ch: ' ', bold: last.bold });
      }
    }
    out.push(...chars);
  }
  return out;
}

/**
 * Normalise extracted prose:
 *  - "objectives.UNC shall" → "objectives. UNC shall" (sentence punctuation
 *    running into a capital). Needs two lowercase letters before the period,
 *    so "U.S." and "3.5" are left alone.
 *  - "independently , reflect" → "independently, reflect"
 *  - runs of whitespace collapsed, ends trimmed.
 */
export function cleanText(s) {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .replace(/([a-z]{2}[.!?;:])(?=[A-Z])/g, '$1 ')
    .replace(/ +([,.;:!?)])/g, '$1')
    .replace(/\( +/g, '(')
    .replace(/\s+/g, ' ')
    .trim();
}

const toText = (chars) => chars.map((c) => c.ch).join('');

// ---- lists ----------------------------------------------------------------

/** Split a list band into items, each a run of lines. */
function splitListItems(lines) {
  if (!lines.length) return { items: [], mode: 'none' };

  // Numbered / bulleted: markers decide, and only markers.
  if (lines.some((l) => NUMBERED_LINE_RE.test(l.text))) {
    const items = [];
    for (const line of lines) {
      if (NUMBERED_LINE_RE.test(line.text) || !items.length) items.push([line]);
      else items[items.length - 1].push(line);
    }
    return { items, mode: 'numbered' };
  }

  // Un-numbered: a line that OPENS in bold starts an item — unless the item so
  // far is still all bold, in which case this is its title wrapping.
  const firstBold = (line) => {
    const c = lineChars(line).find((ch) => !/\s/.test(ch.ch));
    return !!(c && c.bold);
  };
  const allBold = (ls) => ls.every((l) => lineChars(l).every((c) => /\s/.test(c.ch) || c.bold));
  if (lines.some(firstBold)) {
    const items = [];
    for (const line of lines) {
      const cur = items.length ? items[items.length - 1] : null;
      if (firstBold(line) && (!cur || !allBold(cur))) items.push([line]);
      else if (cur) cur.push(line);
      else items.push([line]);
    }
    return { items, mode: 'bold' };
  }

  // No markers, no bold: a vertical gap clearly wider than normal leading is
  // the only remaining sign of a new item.
  const gaps = [];
  for (let i = 1; i < lines.length; i++) gaps.push(lines[i].top - lines[i - 1].top);
  const typical = gaps.length ? gaps.slice().sort((a, b) => a - b)[Math.floor(gaps.length / 2)] : 0;
  const items = [[lines[0]]];
  for (let i = 1; i < lines.length; i++) {
    const gap = lines[i].top - lines[i - 1].top;
    if (typical && gap > typical * 1.5) items.push([lines[i]]);
    else items[items.length - 1].push(lines[i]);
  }
  return { items, mode: 'gap' };
}

/**
 * One list item's lines → { title, description } plus an optional warning.
 * With titleExpected false (department goals / objectives), only a bold run
 * counts as a title; a plain sentence goes whole into `description`, and no
 * warning is raised for it.
 */
function splitTitle(itemLines, titleExpected = true) {
  let chars = joinLines(itemLines);
  // Strip the item marker ("1.", "2)", "•").
  const m = toText(chars).match(MARKER_RE);
  if (m && (NUMBERED_LINE_RE.test(toText(chars)))) chars = chars.slice(m[0].length);

  const start = chars.findIndex((c) => !/\s/.test(c.ch));
  if (start === -1) return { title: '', description: '' };

  if (chars[start].bold) {
    // Title = the bold run; whitespace never ends it.
    let end = start;
    for (let i = start; i < chars.length; i++) {
      if (/\s/.test(chars[i].ch)) continue;
      if (!chars[i].bold) break;
      end = i + 1;
    }
    const title = cleanText(toText(chars.slice(start, end))).replace(/[\s.:–—-]+$/, '');
    const description = cleanText(toText(chars.slice(end)).replace(/^[\s.:–—-]+/, ''));
    // An all-bold item with no title expected is a sentence set in bold.
    if (!titleExpected && !description) return { title: '', description: cleanText(toText(chars.slice(start))) };
    return { title, description };
  }

  const text = cleanText(toText(chars));
  if (!titleExpected) return { title: '', description: text };

  // No bold signal: title is the text up to the first period, if that comes
  // soon enough to plausibly be a title.
  const dot = text.indexOf('.');
  if (dot > 0 && text.slice(0, dot).split(' ').length <= 12) {
    return { title: text.slice(0, dot).trim(), description: text.slice(dot + 1).trim() };
  }
  return { title: '', description: text, warning: 'No bold title found — check the split.' };
}

// ---- department block scoping ---------------------------------------------

const ORG_STOP_WORDS = new Set(['OF', 'AND', 'THE', 'IN', 'FOR', '&']);
const sigWords = (s) => upper(s).replace(/[^A-Z0-9 ]+/g, ' ').split(' ').filter((w) => w && !ORG_STOP_WORDS.has(w));

/** A header as a name: "COLLEGE OF ENGINEERING AND ARCHITECTURE" → "College of Engineering and Architecture". */
function displayName(header) {
  return norm(header).toLowerCase().split(' ')
    .map((w, i) => (i > 0 && ORG_STOP_WORDS.has(w.toUpperCase()) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

/**
 * How well a header bar names the selected department: the share of words it
 * has in common with the department's name (0..1), plus 1 when the code is a
 * word of the header or its acronym ("SCHOOL OF COMPUTER AND INFORMATION
 * SCIENCES" → SCIS). Below MATCH_THRESHOLD counts as a different department.
 */
export function headerMatchScore(header, { departmentName, departmentCode } = {}) {
  const hw = sigWords(header);
  let score = 0;
  const nw = new Set(sigWords(departmentName));
  if (nw.size) {
    const common = new Set(hw.filter((w) => nw.has(w))).size;
    score = common / Math.max(nw.size, new Set(hw).size);
  }
  const code = upper(departmentCode).replace(/[^A-Z0-9]/g, '');
  if (code) {
    const acronym = hw.map((w) => w[0]).join('');
    if (hw.includes(code) || acronym === code || acronym.slice(1) === code) score += 1;
  }
  return score;
}
const MATCH_THRESHOLD = 0.5;

/**
 * Full-width header bars ("UNIVERSITY", "SCHOOL OF …") as lines. A header is
 * all capitals, starts with a header word, and stands apart from the label
 * column: indented well past the page's leftmost text (centred in its bar), or
 * unmistakably a header ("UNIVERSITY…", "COLLEGE OF …"). A left-column label
 * such as "PROGRAM EDUCATIONAL OBJECTIVES" is neither.
 */
function findHeaderLines(items) {
  const minX = new Map();
  for (const it of items) {
    if (norm(it.str)) minX.set(it.page, Math.min(minX.has(it.page) ? minX.get(it.page) : Infinity, it.x));
  }
  return groupLines(items.filter((it) => norm(it.str)))
    .map((l) => ({ ...l, text: norm(l.text) }))
    .filter((l) => /[A-Z]/.test(l.text) && l.text === l.text.toUpperCase() && ANY_HEADER_RE.test(l.text))
    .filter((l) => l.x - minX.get(l.page) > 40 || /^(UNIVERSITY\b|(COLLEGE|SCHOOL|DEPARTMENT|INSTITUTE) OF\b)/.test(l.text));
}

/**
 * The department path's block: the header bar that best matches the selected
 * department, down to the next header bar of any kind. A file with no header
 * bars at all is one department's own document, so all of it is the block.
 */
function scopeBestBlock(items, config, target, warnings) {
  const headers = findHeaderLines(items);
  if (!headers.length) return { start: -Infinity, end: Infinity, header: null };

  const candidates = headers.filter((h) => config.block.start(h.text));
  if (!candidates.length) throw new ExtractionError(config.messages.noDepartmentBlock, 'NO_DEPARTMENT_BLOCK');

  let chosen = candidates[0];
  let best = -1;
  for (const h of candidates) {
    const score = headerMatchScore(h.text, target);
    if (score > best) { best = score; chosen = h; }
  }
  const next = headers
    .filter((h) => h.top > chosen.top && config.block.stopAt.test(h.text))
    .sort((a, b) => a.top - b.top)[0];

  const seen = new Set();
  for (const h of headers) {
    if (config.block.start(h.text)) continue;
    const name = h.text.split(' ')[0];
    if (seen.has(name)) continue;
    seen.add(name);
    warnings.push({
      field: null,
      message: 'Also found a ' + name + ' block — not imported' + (name === 'UNIVERSITY' ? ' (OVPAA uploads that).' : '.'),
    });
  }
  if (candidates.length > 1) {
    warnings.push({ field: null, message: 'This PDF has ' + candidates.length + ' department blocks — used "' + displayName(chosen.text) + '".' });
  }
  const forWhom = upper(target.departmentCode) || norm(target.departmentName);
  if (forWhom && best < MATCH_THRESHOLD) {
    warnings.push({
      field: null,
      code: 'DEPARTMENT_MISMATCH',
      message: "This PDF looks like it's for " + displayName(chosen.text) + ", but you're uploading for " + forWhom + '.',
    });
  }
  return { start: chosen.top + chosen.height * 0.5, end: next ? next.top - 0.5 : Infinity, header: chosen.text };
}

/**
 * Left-column text that isn't a known label ("PROGRAM EDUCATIONAL OBJECTIVES")
 * → extra anchors, so its band is kept instead of being folded into the band
 * above. Lines that sit close together are one wrapped label.
 */
function unknownLabelAnchors(inTable, contentX, anchors, isLabel) {
  const anchorItems = new Set(anchors.map((a) => a.item));
  const left = inTable.filter((it) => it.x < contentX - 2 && norm(it.str));
  const lines = groupLines(left).filter((l) => !PAGE_FOOTER_RE.test(norm(l.text)));
  const out = [];
  let prev = null;
  for (const line of lines) {
    const text = norm(line.text);
    const close = prev && line.page === prev.page && line.top - prev.top <= line.height * 1.8;
    if (line.items.some((it) => anchorItems.has(it))) {
      prev = { kind: 'known', page: line.page, top: line.top };
    } else if (close) {
      if (prev.kind === 'unknown') prev.entry.label += ' ' + text;   // wrapped label
      prev.top = line.top;
    } else if (isLabel(text)) {
      prev = { kind: 'known', page: line.page, top: line.top };       // a stray STATEMENT / VALUES
    } else {
      const entry = { label: text };
      out.push({ section: { key: null, unknown: true }, item: line.items[0], entry });
      prev = { kind: 'unknown', page: line.page, top: line.top, entry };
    }
  }
  return out;
}

// ---- main -----------------------------------------------------------------

/**
 * Positioned pages → { fields, warnings }. Exported separately from the PDF
 * reader so the layout logic can be exercised without a PDF.
 *
 * `config` defaults to the university; `target` ({ departmentName,
 * departmentCode }) is only used by the department path to pick its block.
 */
export function extractStatementsFromPages(pages, config = UNIVERSITY_CONFIG, target = {}) {
  const { sections, messages } = config;
  const labelWords = labelWordsOf(sections);
  for (const w of config.labelPrefixes || []) labelWords.add(w);
  const isLabel = (str) => isLabelText(str, labelWords);
  const prefixRe = config.labelPrefixes ? new RegExp('^(?:(?:' + config.labelPrefixes.join('|') + ') )+') : null;
  const best = config.block.pick === 'best';

  const items = flatten(pages).filter((it) => norm(it.str) !== '' || it.str === ' ');
  const textChars = items.reduce((n, it) => n + norm(it.str).length, 0);
  if (textChars < 20) {
    // ---- AI-VISION FALLBACK HOOK ------------------------------------------
    // A scanned/photographed PDF has no text layer. This is where an image
    // pass would go (render each page, send it to a vision model, map the
    // answer onto the same `fields` shape) — see
    // CALENDAR_IMAGE_EXTRACTION_PLAN.txt for the approach. Not built yet.
    // -----------------------------------------------------------------------
    throw new ExtractionError(messages.scanned, 'NO_TEXT_LAYER');
  }

  const warnings = [];

  let tableStart;
  let tableEnd = Infinity;
  let blockHeader = null;
  if (best) {
    ({ start: tableStart, end: tableEnd, header: blockHeader } = scopeBestBlock(items, config, target, warnings));
  } else {
    // Scope: start under the UNIVERSITY header bar, if there is one.
    const startHeader = items.find((it) => config.block.start(upper(it.str)));
    tableStart = startHeader ? startHeader.top + startHeader.height * 0.5 : -Infinity;
  }
  const inScope = (it) => it.top > tableStart && it.top < tableEnd;

  // "PROGRAM EDUCATIONAL" / "OBJECTIVES" on two lines: the second line is the
  // tail of a label this config doesn't know, not the OBJECTIVES label.
  const tailOfLabelAbove = (it) => items.some((o) => o !== it && o.page === it.page && inScope(o)
    && norm(o.str) && !isLabel(o.str) && Math.abs(o.x - it.x) < 40
    && o.top < it.top && it.top - o.top < it.height * 1.6);

  // Label anchors: the first item in scope that IS the keyword (alone, or with
  // its second word in the same run). Content like "Our vision is…" never
  // matches — the whole item has to be label words.
  const anchorFor = (s) => items
    .filter(inScope)
    .filter((it) => {
      const text = prefixRe ? upper(it.str).replace(prefixRe, '') : upper(it.str);
      const first = text.split(' ')[0];
      return (first === s.word || (s.alt || []).includes(first)) && isLabel(it.str);
    })
    .filter((it) => !config.captureUnknownLabels || !tailOfLabelAbove(it))
    .sort((a, b) => a.top - b.top)[0];

  let anchors = sections.map((s) => ({ section: s, item: anchorFor(s) })).filter((a) => a.item);
  if (!anchors.length) throw new ExtractionError(messages.noLabels, 'NO_LABELS');

  // The label column is where the anchors sit; drop any stray match far to the
  // right of it (a capitalised word inside the content column).
  const labelX = Math.min(...anchors.map((a) => a.item.x));
  anchors = anchors.filter((a) => a.item.x - labelX < 40);
  anchors.sort((a, b) => a.item.top - b.item.top);

  if (!best) {
    // End of the university block: the next full-width header bar below the
    // first anchor. Anything past it belongs to another block.
    const firstAnchorTop = anchors[0].item.top;
    const blockHeaders = items
      .filter((it) => it.top > firstAnchorTop && config.block.stopAt.test(norm(it.str)) && norm(it.str) === upper(it.str))
      .sort((a, b) => a.top - b.top);
    tableEnd = blockHeaders.length ? blockHeaders[0].top - 0.5 : Infinity;
    anchors = anchors.filter((a) => a.item.top < tableEnd);
    if (!anchors.length) throw new ExtractionError(messages.noLabels, 'NO_LABELS');

    const seenBlocks = new Set();
    for (const h of blockHeaders) {
      const name = upper(h.str).split(' ')[0];
      if (seenBlocks.has(name)) continue;
      seenBlocks.add(name);
      warnings.push({ field: null, message: 'Also found a ' + name + ' block — not imported.' });
    }
  }

  // Content column: the leftmost non-label text to the right of the labels.
  // With unknown labels kept, "right of the labels" means past the label
  // column's right edge, so an unknown label isn't mistaken for content.
  const inTable = items.filter((it) => it.top > tableStart && it.top < tableEnd);
  let minContentX = labelX + 2;
  if (config.captureUnknownLabels) {
    const labelRight = Math.max(...inTable
      .filter((it) => isLabel(it.str) && Math.abs(it.x - labelX) < 40)
      .map((it) => it.x + it.width));
    minContentX = Math.max(minContentX, labelRight - 2);
  }
  const contentCandidates = inTable.filter((it) => it.x > minContentX && norm(it.str) && !isLabel(it.str));
  if (!contentCandidates.length) throw new ExtractionError(messages.noLabels, 'NO_LABELS');
  const contentX = Math.min(...contentCandidates.map((it) => it.x));
  const contentItems = inTable.filter((it) => it.x >= contentX - 2);
  const contentLines = groupLines(contentItems).filter((l) => !PAGE_FOOTER_RE.test(norm(l.text)));

  const firstKnownTop = anchors[0].item.top;
  if (config.captureUnknownLabels) {
    anchors = anchors.concat(unknownLabelAnchors(inTable, contentX, anchors, isLabel));
    anchors.sort((a, b) => a.item.top - b.item.top);
  }

  // Bands: label top → next label top (the first band opens at the header, so
  // a vertically-centred first label still gets its opening lines).
  const fields = {};
  for (const s of sections) fields[s.key] = s.list ? [] : '';
  if (config.captureUnknownLabels) fields.other_sections = [];

  anchors.forEach((a, i) => {
    const s = a.section;
    const tol = a.item.height * 0.6;
    const from = i === 0 ? Math.max(tableStart, a.item.top - tol * 4) : a.item.top - tol;
    const to = i + 1 < anchors.length ? anchors[i + 1].item.top - anchors[i + 1].item.height * 0.6 : tableEnd;
    const lines = contentLines.filter((l) => l.top >= from && l.top < to);

    if (s.unknown) {
      const label = cleanText(a.entry.label);
      const other = { label, text: '', items: [] };
      const { items: groups, mode } = splitListItems(lines);
      if (mode === 'numbered') {
        other.items = groups
          .map((g) => splitTitle(g, false))
          .filter((it) => it.title || it.description)
          .map(({ title, description }, idx) => ({ order: idx + 1, title, description }));
      } else {
        other.text = cleanText(toText(joinLines(lines)));
      }
      if (!other.text && !other.items.length) {
        // Text above the first known label with nothing beside it is a page
        // title; further down it's worth a mention.
        if (a.item.top > firstKnownTop) warnings.push({ field: null, code: 'UNKNOWN_LABEL', message: "Found a '" + label + "' label with no text beside it — not imported." });
        return;
      }
      fields.other_sections.push(other);
      warnings.push({
        field: 'other_sections[' + (fields.other_sections.length - 1) + ']',
        message: "Found a '" + label + "' section — saved under Other sections; review it.",
      });
      return;
    }

    if (!s.list) {
      fields[s.key] = cleanText(toText(joinLines(lines)));
      if (!fields[s.key]) warnings.push({ field: s.key, message: 'Found the ' + s.label + ' label but no text beside it.' });
      return;
    }
    const titleExpected = config.titleExpected[s.key] !== false;
    const { items: groups } = splitListItems(lines);
    fields[s.key] = groups.map((g, idx) => {
      const { title, description, warning } = splitTitle(g, titleExpected);
      if (warning) warnings.push({ field: s.key + '[' + idx + '].title', message: warning });
      return { order: idx + 1, title, description };
    }).filter((it) => it.title || it.description);
    if (!fields[s.key].length) warnings.push({ field: s.key, message: 'Found the ' + s.label + ' label but no items beside it.' });
  });

  const found = new Set(anchors.map((a) => a.section.key));
  for (const s of sections) {
    if (!found.has(s.key) && !s.optional) warnings.push({ field: s.key, message: 'No ' + s.label.toUpperCase() + ' section found in this PDF — fill it in by hand.' });
  }

  return best ? { fields, warnings, blockHeader } : { fields, warnings };
}

async function readOrThrow(buffer) {
  try {
    return await readPdfItems(buffer);
  } catch (err) {
    if (err instanceof ExtractionError) throw err;
    throw new ExtractionError("This file couldn't be opened as a PDF. It may be damaged or password-protected.", 'UNREADABLE');
  }
}

const sha256Of = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

/** PDF buffer → { fields, warnings, pages, sha256 }. Throws ExtractionError (422). */
export async function parseUniversityStatementsPdf(buffer) {
  const sha256 = sha256Of(buffer);
  const read = await readOrThrow(buffer);
  const { fields, warnings } = extractStatementsFromPages(read.pages, UNIVERSITY_CONFIG);
  return { fields, warnings, pages: read.numPages, sha256 };
}

const DEPARTMENT_OUTPUT = ['vision', 'mission'];

/**
 * PDF buffer → { fields: { vision, mission }, warnings, pages, sha256,
 * blockHeader } for ONE department. Throws ExtractionError (422).
 *
 * Deans upload vision and mission only. The engine still finds the GOALS /
 * OBJECTIVES / CORE VALUES labels and any unknown ones, because they are what
 * END the mission band — without them a full VMGO page would run on into the
 * mission. Their content, and the warnings about it, are dropped here.
 */
export async function parseDepartmentStatementsPdf(buffer, { departmentName, departmentCode } = {}) {
  const sha256 = sha256Of(buffer);
  const read = await readOrThrow(buffer);
  const result = extractStatementsFromPages(read.pages, DEPARTMENT_CONFIG, { departmentName, departmentCode });
  const fields = {};
  for (const k of DEPARTMENT_OUTPUT) fields[k] = result.fields[k];
  const warnings = result.warnings.filter((w) => (w.field
    ? DEPARTMENT_OUTPUT.includes(w.field)
    : w.code !== 'UNKNOWN_LABEL'));
  return { fields, warnings, blockHeader: result.blockHeader, pages: read.numPages, sha256 };
}
