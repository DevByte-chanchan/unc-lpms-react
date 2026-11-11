/**
 * Read a table out of a text PDF (the registrar's SUBJECT OFFERINGS printed
 * or exported to PDF) as a row × cell matrix — the same shape readMatrix()
 * gives for a spreadsheet, so the spreadsheet parsers work on it unchanged.
 *
 * How:
 *   1. pdf.js text items → lines (items whose baselines are close).
 *   2. Words on a line → cells (a wide gap starts a new cell).
 *   3. Find the CODE | COURSE NO | … header. From there on, every word goes to
 *      the column whose header it sits under, so an empty cell stays empty
 *      (a lab row's blank CODE is what marks it as a continuation).
 *   4. A wrapped line (only description / faculty text, close under the row
 *      above) is joined to that row instead of becoming a row of its own.
 *   5. A header repeated on later pages is dropped.
 *
 * A scanned PDF has no text, so it throws PdfTableError('scanned').
 */
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { canonicalize } from './excelParser.js';

const require = createRequire(import.meta.url);
const STANDARD_FONT_DATA_URL =
  path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts') + path.sep;

const PAGE_FOOTER_RE = /^(page\s+)?\d+(\s*(of|\/)\s*\d+)?$/i;

export class PdfTableError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'PdfTableError';
    this.status = 422;
    this.code = code;
  }
}

export const PDF_TABLE_MESSAGES = {
  scanned: "This PDF is a scanned image, so its text can't be read. Download the Subject Offerings from the registrar as a PDF, Excel or CSV file (not a photo or scan).",
  unreadable: "This PDF couldn't be opened. It may be damaged or password-protected.",
};

/** Text items of every page: { page, x, y, w, h, str }. */
async function readItems(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  let doc;
  try {
    doc = await getDocument({
      data, standardFontDataUrl: STANDARD_FONT_DATA_URL, isEvalSupported: false, verbosity: 0,
    }).promise;
  } catch {
    throw new PdfTableError(PDF_TABLE_MESSAGES.unreadable, 'unreadable');
  }
  const items = [];
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      for (const it of tc.items) {
        const str = String(it.str || '').replace(/\s+/g, ' ');
        if (!str.trim()) continue;
        const [a, b, , , x, y] = it.transform;
        const h = Math.abs(it.height) || Math.hypot(a, b) || 10;
        items.push({ page: p, x, y, w: it.width || 0, h, str });
      }
      page.cleanup();
    }
  } finally {
    await doc.destroy();
  }
  return items;
}

/** Group one page's items into lines, top to bottom, words left to right. */
function linesOf(items) {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines = [];
  for (const it of sorted) {
    const line = lines[lines.length - 1];
    if (line && Math.abs(line.y - it.y) <= Math.max(2, Math.min(line.h, it.h) * 0.45)) {
      line.items.push(it);
      line.h = Math.max(line.h, it.h);
    } else {
      lines.push({ y: it.y, h: it.h, page: it.page, items: [it] });
    }
  }
  for (const l of lines) l.items.sort((a, b) => a.x - b.x);
  return lines;
}

/** Words → cells by gap: { x, end, text }. */
function cellsOf(line) {
  const cells = [];
  for (const it of line.items) {
    const last = cells[cells.length - 1];
    const gap = last ? it.x - last.end : Infinity;
    if (last && gap < Math.max(4, it.h * 0.9)) {
      last.text += (gap > it.h * 0.12 && !last.text.endsWith(' ') && !it.str.startsWith(' ') ? ' ' : '') + it.str;
      last.end = Math.max(last.end, it.x + it.w);
      last.items.push(it);
    } else {
      cells.push({ x: it.x, end: it.x + it.w, text: it.str, items: [it] });
    }
  }
  for (const c of cells) c.text = c.text.replace(/\s+/g, ' ').trim();
  return cells.filter((c) => c.text);
}

/**
 * Header words printed close together ("FACULTY ROOM") come out as one cell.
 * Split such a cell back into known labels, word by word, longest match first.
 */
function splitHeaderCells(cells, labels) {
  if (!labels || !labels.size) return cells;
  const out = [];
  for (const cell of cells) {
    if (labels.has(canonicalize(cell.text))) { out.push(cell); continue; }
    // Words with their own x positions (an item may hold several words).
    const words = [];
    for (const it of cell.items) {
      const parts = it.str.split(/(\s+)/);
      const per = it.w / Math.max(1, it.str.length);
      let off = 0;
      for (const part of parts) {
        if (part.trim()) words.push({ x: it.x + off * per, end: it.x + (off + part.length) * per, text: part });
        off += part.length;
      }
    }
    const pieces = [];
    let i = 0;
    while (i < words.length) {
      let j = words.length;
      for (; j > i + 1; j--) {
        if (labels.has(canonicalize(words.slice(i, j).map((w) => w.text).join(' ')))) break;
      }
      const group = words.slice(i, j);
      pieces.push({ x: group[0].x, end: group[group.length - 1].end, text: group.map((w) => w.text).join(' '), items: [] });
      i = j;
    }
    // Only split when every piece is a known label; otherwise keep the cell.
    if (pieces.length > 1 && pieces.every((pc) => labels.has(canonicalize(pc.text)))) out.push(...pieces);
    else out.push(cell);
  }
  return out;
}

/**
 * Column bands from the data lines: x ranges that no word on any line
 * covers are the gutters between columns. Spaces inside a cell rarely line
 * up on every row, so they don't count as gutters.
 */
function bandsOf(lines) {
  const spans = lines.flatMap((l) => l.items.map((it) => [it.x, it.x + Math.max(it.w, 0.5)]))
    .sort((a, b) => a[0] - b[0]);
  const bands = [];
  for (const [a, b] of spans) {
    const last = bands[bands.length - 1];
    if (last && a <= last[1] + 0.8) last[1] = Math.max(last[1], b);
    else bands.push([a, b]);
  }
  return bands;
}

/**
 * Give each header label the data bands under it. A band goes to the label it
 * overlaps most, else the label nearest to it; neighbouring bands of one
 * label are one column. Returns, per band, the label index.
 */
function labelBands(bands, header) {
  const owner = bands.map(([a, b]) => {
    let best = -1;
    let bestOverlap = 0;
    header.forEach((h, i) => {
      const o = Math.min(b, h.end) - Math.max(a, h.x);
      if (o > bestOverlap) { bestOverlap = o; best = i; }
    });
    return best;
  });
  const covered = new Set(owner.filter((i) => i >= 0));
  // A band under no label (a right-aligned number, say) sits between two
  // labels. It belongs to the one that has no data of its own; failing that,
  // to the nearer one.
  return owner.map((o, bi) => {
    if (o >= 0) return o;
    const [a, b] = bands[bi];
    const mid = (a + b) / 2;
    let left = -1;
    let right = -1;
    header.forEach((h, i) => {
      if (h.end <= mid && (left < 0 || h.end > header[left].end)) left = i;
      if (h.x >= mid && (right < 0 || h.x < header[right].x)) right = i;
    });
    const free = [left, right].filter((i) => i >= 0 && !covered.has(i));
    if (free.length === 1) return free[0];
    if (left < 0) return right < 0 ? 0 : right;
    if (right < 0) return left;
    return (mid - header[left].end) <= (header[right].x - mid) ? left : right;
  });
}

function bucket(line, header, bands, owner) {
  const out = header.map(() => '');
  for (const it of line.items) {
    const x = it.x + Math.min(it.w, 0.5) / 2;
    let bi = bands.findIndex(([a, b]) => x >= a - 0.8 && x <= b + 0.8);
    if (bi < 0) bi = 0;
    const idx = owner[bi];
    const t = it.str.trim();
    out[idx] = out[idx] ? out[idx] + ' ' + t : t;
  }
  return out.map((s) => s.replace(/\s+/g, ' ').trim());
}

/**
 * @param {string} filePath
 * @param {(canonCells: string[]) => boolean} isHeader  true for the table's header line
 * @param {{ keyColumns?: (labels: string[]) => number[], labels?: Set<string> }} [options]
 *   keyColumns: indexes that, when all empty, make a line a wrapped
 *   continuation of a neighbouring row (joined into it). Default: the first two.
 *   labels: canonical header labels, used to split header words printed
 *   too close together to tell apart by spacing.
 * @returns {Promise<string[][]>}
 */
export async function readPdfTable(filePath, isHeader, options = {}) {
  const items = await readItems(filePath);
  if (!items.length) throw new PdfTableError(PDF_TABLE_MESSAGES.scanned, 'scanned');

  const pages = [...new Set(items.map((i) => i.page))].sort((a, b) => a - b);
  const matrix = [];
  let header = null;       // [{ x, end, text }] — the latest header line's cells
  let headerKey = null;
  let keys = [0, 1];

  for (const p of pages) {
    const lines = linesOf(items.filter((i) => i.page === p));
    const body = [];
    for (const line of lines) {
      let cells = cellsOf(line);
      const canon = cells.map((c) => canonicalize(c.text));
      if (isHeader(canon)) {
        cells = splitHeaderCells(cells, options.labels);
        const key = cells.map((c) => canonicalize(c.text)).join('|');
        header = cells;
        if (options.keyColumns) keys = options.keyColumns(cells.map((c) => c.text));
        if (headerKey !== key) { headerKey = key; matrix.push(cells.map((c) => c.text)); }
        continue;
      }
      const whole = cells.map((c) => c.text).join(' ');
      if (!header) { matrix.push([whole]); continue; }   // title lines above the table
      if (PAGE_FOOTER_RE.test(whole)) continue;
      body.push(line);
    }
    if (!header || !body.length) continue;

    const bands = bandsOf(body);
    const owner = labelBands(bands, header);
    const rows = body.map((line) => {
      const cells = bucket(line, header, bands, owner);
      return { line, cells, keyless: keys.every((k) => !cells[k]) };
    });

    // A wrapped line joins the keyed row nearest to it (above or below — a
    // vertically centred cell wraps on both sides of its row).
    const near = (a, b) => Math.abs(a.line.y - b.line.y) <= Math.max(a.line.h, b.line.h) * 1.7;
    const keep = [];
    rows.forEach((r, i) => {
      if (!r.keyless) { keep.push(r); return; }
      let up = null;
      for (let j = i - 1; j >= 0; j--) if (!rows[j].keyless) { up = rows[j]; break; }
      let down = null;
      for (let j = i + 1; j < rows.length; j++) if (!rows[j].keyless) { down = rows[j]; break; }
      const dUp = up && near(up, r) ? up.line.y - r.line.y : Infinity;
      const dDown = down && near(down, r) ? r.line.y - down.line.y : Infinity;
      if (dUp === Infinity && dDown === Infinity) { keep.push(r); return; }
      const target = dUp <= dDown ? up : down;
      r.cells.forEach((t, k) => {
        if (!t) return;
        const cur = target.cells[k];
        target.cells[k] = !cur ? t : (dUp <= dDown ? cur + ' ' + t : t + ' ' + cur);
      });
    });
    keep.forEach((r) => matrix.push(r.cells));
  }
  return matrix;
}
