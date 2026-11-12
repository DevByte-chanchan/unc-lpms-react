/**
 * Getting the rows out of an uploaded school calendar — a picture (PNG, JPG,
 * WEBP) or a PDF — as the transcript utils/schoolCalendarParse.js reads.
 *
 *   PDF with text   pdfjs text items, grouped into blocks and lines      source 'pdf'
 *   picture / scan  1. the AI reader, when CALENDAR_AI_PROVIDER is set     source 'ai'
 *                   2. otherwise OCR (tesseract.js, offline, English)     source 'ocr'
 *
 * Whatever the source, the model / OCR only TRANSCRIBES rows; deciding fields
 * and years is the parser's job, so every path follows the same tested rules.
 *
 * readCalendar(buffer, kind, { ai }) → { transcript, source, confidence, warnings }
 *   kind: 'pdf' | 'png' | 'jpg' | 'webp'  (from sniffKind — never the file name)
 *   ai:   an injected reader (image buffer → transcript), for the tests
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import sharp from 'sharp';
import { readPdfItems } from '../utils/universityStatementParser.js';
import { findTables, pairRows, ruleSpan, pastHalo } from '../utils/calendarLayout.js';
import {
  blockFromLines, fieldOfEvent, isDateText, parseDateText, parseRange, schoolYearOf, semesterOfTitle, splitRowLine, norm,
} from '../utils/schoolCalendarParse.js';

const require = createRequire(import.meta.url);

// ───────────────────────────── file type ─────────────────────────────

/** 'pdf' | 'png' | 'jpg' | 'webp' from the first bytes, else null. */
export function sniffKind(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf.slice(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  if (buf[0] === 0x89 && buf.slice(1, 4).toString('latin1') === 'PNG' && buf[4] === 0x0d && buf[5] === 0x0a) return 'png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
}

export const MIME_OF = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };
export const EXT_OF = { pdf: 'pdf', png: 'png', jpg: 'jpg', webp: 'webp' };

export class CalendarReadError extends Error {
  constructor(message) { super(message); this.status = 422; }
}
export const UNREADABLE = "Couldn't read the calendar. Upload a clearer picture or the PDF, or type the dates.";

// ───────────────────────────── text PDF ─────────────────────────────

/** Items on one baseline, left to right, joined into phrases (a big gap starts a new one). */
function phrasesOf(items) {
  const sorted = items.slice().sort((a, b) => b.y - a.y || a.x - b.x);
  const lines = [];
  for (const it of sorted) {
    const tol = Math.max(1.5, (it.height || 8) * 0.35);
    const line = lines.find((l) => Math.abs(l.y - it.y) <= tol);
    if (line) line.items.push(it); else lines.push({ y: it.y, items: [it] });
  }
  const phrases = [];
  for (const l of lines) {
    l.items.sort((a, b) => a.x - b.x);
    let cur = null;
    for (const it of l.items) {
      const size = it.height || 8;
      if (cur && it.x - (cur.x1) <= size * 1.2) {
        cur.text += (it.x - cur.x1 > size * 0.15 && !/\s$/.test(cur.text) ? ' ' : '') + it.str;
        cur.x1 = Math.max(cur.x1, it.x + (it.width || 0));
      } else {
        cur = { x: it.x, x1: it.x + (it.width || 0), y: l.y, size, text: it.str };
        phrases.push(cur);
      }
    }
  }
  return phrases.map((p) => ({ ...p, text: p.text.replace(/\s+/g, ' ').trim() })).filter((p) => p.text);
}

// A block title names a semester, and is not itself a row ("Apr 26-May 3 Summer Break").
const isBlockTitle = (text, lenient = false) => !!semesterOfTitle(text, { lenient }) && /semest|summer/i.test(text)
  && !/school\s*days/i.test(text) && !splitRowLine(text, { lenient });

/**
 * pdfjs pages → transcript. Block titles ("FIRST SEMESTER …", "Summer 2027")
 * anchor columns; every phrase belongs to the nearest title above it in its
 * column. A title must be followed by a range line or rows to count (the "NO.
 * OF SCHOOL DAYS" box has a "Summer 2027" too).
 */
export function transcriptFromPdfPages(pages) {
  const blocks = [];
  let schoolYear = null;
  for (const page of pages) {
    const phrases = phrasesOf(page.items || []);
    for (const p of phrases) if (!schoolYear && /academic\s+year/i.test(p.text)) schoolYear = schoolYearOf(p.text);
    // A title with its range line just under it is a semester block for sure.
    // When the page has such titles, a title without one ("Summer 2027" over the
    // school-days count) is a heading of something else.
    const candidates = phrases.filter((p) => isBlockTitle(p.text));
    const hasRange = (t) => phrases.some((p) => p !== t && p.y < t.y && t.y - p.y <= Math.max(t.size, p.size) * 2.6
      && p.x < t.x1 + 60 && p.x1 > t.x - 60 && parseRange(p.text));
    const strong = candidates.filter(hasRange);
    const titles = strong.length ? strong : candidates;
    if (!titles.length) continue;
    // Columns: titles whose centres are close share a column.
    const cols = [];
    for (const t of titles.slice().sort((a, b) => (a.x + a.x1) / 2 - (b.x + b.x1) / 2)) {
      const c = (t.x + t.x1) / 2;
      const col = cols.find((k) => Math.abs(k.centre - c) < 40);
      if (col) col.titles.push(t); else cols.push({ centre: c, titles: [t] });
    }
    cols.sort((a, b) => a.centre - b.centre);
    // Each column reaches halfway to its neighbours; the outer ones as far out
    // as they reach in, so a box beside the first block (the school-days count)
    // isn't taken for its rows.
    const half = cols.length > 1 ? (cols[cols.length - 1].centre - cols[0].centre) / (cols.length - 1) / 2 : Infinity;
    const bounds = cols.map((c, i) => ({
      from: i === 0 ? c.centre - half : (cols[i - 1].centre + c.centre) / 2,
      to: i === cols.length - 1 ? c.centre + half : (c.centre + cols[i + 1].centre) / 2,
    }));
    const groups = new Map(titles.map((t) => [t, []]));
    for (const p of phrases) {
      if (groups.has(p)) continue;
      const ci = bounds.findIndex((b) => p.x >= b.from && p.x < b.to);
      if (ci < 0) continue;
      // The nearest title above (PDF y grows upwards).
      const above = cols[ci].titles.filter((t) => t.y >= p.y - 0.5).sort((a, b) => a.y - b.y)[0];
      if (above) groups.get(above).push(p);
    }
    for (const [title, members] of groups) {
      // Phrases → lines (same baseline), the columns of a row joined by a wide gap.
      const rows = [];
      for (const m of members.sort((a, b) => b.y - a.y || a.x - b.x)) {
        const row = rows.find((r) => Math.abs(r.y - m.y) <= Math.max(1.5, m.size * 0.35));
        if (row) row.parts.push(m); else rows.push({ y: m.y, parts: [m] });
      }
      const lines = [title.text, ...rows.map((r) => r.parts.sort((a, b) => a.x - b.x).map((x) => x.text).join('     '))];
      const block = blockFromLines(lines);
      if (block && (block.rangeText || block.rows.length)) blocks.push(block);
    }
  }
  return { schoolYear, blocks };
}

/** The largest embedded picture of each page of a scanned PDF, as PNG buffers. */
export async function pdfPageImages(buffer, { maxPages = 2 } = {}) {
  const { getDocument, OPS } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await getDocument({ data: new Uint8Array(buffer), verbosity: 0, isEvalSupported: false, disableFontFace: true }).promise;
  const out = [];
  try {
    for (let p = 1; p <= Math.min(doc.numPages, maxPages); p++) {
      const page = await doc.getPage(p);
      const ops = await page.getOperatorList();
      let best = null;
      for (let i = 0; i < ops.fnArray.length; i++) {
        if (ops.fnArray[i] !== OPS.paintImageXObject) continue;
        const id = ops.argsArray[i][0];
        const objs = id.startsWith('g_') ? page.commonObjs : page.objs;
        const img = await new Promise((resolve) => { try { objs.get(id, resolve); } catch { resolve(null); } });
        if (img && img.data && img.width * img.height > (best ? best.width * best.height : 0)) best = img;
      }
      if (!best) continue;
      const channels = best.data.length / (best.width * best.height);
      if (![1, 3, 4].includes(channels)) continue;
      out.push(await sharp(Buffer.from(best.data.buffer, best.data.byteOffset, best.data.byteLength), { raw: { width: best.width, height: best.height, channels } }).png().toBuffer());
    }
  } finally {
    await doc.destroy();
  }
  return out;
}

// ───────────────────────────── OCR ─────────────────────────────

let workerPromise = null;
let idleTimer = null;
const LANG_PATH = path.join(path.dirname(require.resolve('@tesseract.js-data/eng/package.json')), '4.0.0_best_int');

/** One shared English worker, created on first use and closed after a minute idle. */
async function ocrWorker() {
  if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
  if (!workerPromise) {
    const { createWorker } = await import('tesseract.js');
    // langPath is the bundled @tesseract.js-data/eng: nothing is downloaded.
    workerPromise = createWorker('eng', 1, { langPath: LANG_PATH, cacheMethod: 'none', gzip: true });
  }
  return workerPromise;
}
function scheduleIdleClose() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { closeOcr().catch(() => {}); }, 60 * 1000);
  if (idleTimer.unref) idleTimer.unref();
}
/** Stop the OCR worker (tests call this so the process can exit). */
export async function closeOcr() {
  if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
  const p = workerPromise;
  workerPromise = null;
  if (p) await (await p).terminate();
}

// How a crop is prepared before OCR. Dates are read twice (`light`, `levels`)
// and events twice (`plain`, `dark`); a row's date is kept only when the two
// readings agree or one of them is unreadable.
//   light   background → white at the 50th percentile: pale grey text turns dark
//   levels  a fixed contrast stretch (grey 120 → black, 230 → white)
//   plain   ordinary contrast stretch: thin regular text
//   dark    gamma first: bold text whose strokes run together
const PREP = {
  light: (img) => img.greyscale().normalise({ lower: 1, upper: 50 }).sharpen(),
  levels: (img) => img.greyscale().linear(2.3, -280).sharpen(),
  plain: (img) => img.greyscale().normalise().sharpen(),
  dark: (img) => img.greyscale().gamma(2.2).normalise({ lower: 2, upper: 90 }).sharpen(),
};

/**
 * OCR one region → lines [{ text, conf, y0, y1 }] in source-picture pixels.
 * The crop is upscaled (3–4× for a small picture: tesseract reads text best at
 * 30+ px high) and given a white margin, so no letter touches the edge.
 */
async function ocrRegion(source, region, { prep = 'plain', scale, psm = '6' } = {}) {
  const worker = await ocrWorker();
  const left = Math.max(0, Math.round(region.x0));
  const top = Math.max(0, Math.round(region.y0));
  const width = Math.max(1, Math.min(source.width - left, Math.round(region.x1 - region.x0)));
  const height = Math.max(1, Math.min(source.height - top, Math.round(region.y1 - region.y0)));
  const margin = 16;
  const buf = await PREP[prep](sharp(source.png).extract({ left, top, width, height })
    .resize({ width: Math.round(width * scale), kernel: 'lanczos3' }))
    .extend({ top: margin, bottom: margin, left: margin, right: margin, background: '#ffffff' })
    .png().toBuffer();
  await worker.setParameters({ tessedit_pageseg_mode: psm, preserve_interword_spaces: '1', user_defined_dpi: '300' });
  const { data } = await worker.recognize(buf, {}, { blocks: true, text: true });
  const lines = [];
  for (const b of data.blocks || []) for (const p of b.paragraphs || []) for (const l of p.lines || []) {
    const text = String(l.text || '').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    lines.push({ text, conf: l.confidence, y0: top + (l.bbox.y0 - margin) / scale, y1: top + (l.bbox.y1 - margin) / scale });
  }
  return { lines, conf: data.confidence };
}

/** OCR stray marks: leading bars and brackets, trailing marks. */
const tidy = (s) => String(s || '').replace(/^[\s|[\](){}'"“”‘’_~—–=-]+/, '').replace(/[\s|[\]{}_~—–=]+$/, '').replace(/\s+/g, ' ').trim();

/** "SECOND SEMESTER SY 2026-2027 2)" → "SECOND SEMESTER SY 2026-2027". */
const cleanTitle = (s) => {
  const t = tidy(s);
  const m = /^(.*?(?:\d{4}\s*-\s*\d{4}|sy\s*'?\d{2}\s*-\s*\d{2}|summer\s+\d{4}))/i.exec(t);
  return (m ? m[1] : t).trim();
};
const cleanRange = (s) => {
  const t = tidy(s);
  const m = /^(.*\d{4})/.exec(t);
  return (m ? m[1] : t).trim();
};

/**
 * The readings of a row's date → the text to keep, or '' when they disagree.
 * Two readings agree when they give the same first day and could be the same
 * month ("Mary 4" and "May 4" do; "Oct 28" and "Oct 29" don't).
 */
function pickDate(readings) {
  const ok = readings.map((t) => tidy(t)).filter((t) => t && isDateText(t, { lenient: true }))
    .map((t) => ({ t, s: parseDateText(t, { lenient: true }).spans[0] }))
    .filter((r) => r.s);
  if (!ok.length) return { text: '', unsure: readings.some((t) => /\d/.test(t || '')) };
  const months = (s) => s.start.alt || [s.start.m];
  const agree = ok.every((r) => r.s.start.d === ok[0].s.start.d && months(r.s).some((m) => months(ok[0].s).includes(m)));
  if (!agree) return { text: '', unsure: true };
  // The most specific reading: one month rather than two, then the longest.
  ok.sort((a, b) => months(a.s).length - months(b.s).length || b.t.length - a.t.length);
  return { text: ok[0].t, unsure: false };
}
/** The readings of a row's event → the text to keep; `unsure` when they name different fields. */
function pickEvent(readings) {
  const rs = readings.map((r) => ({ text: tidy(r.text), conf: r.conf })).filter((r) => r.text);
  if (!rs.length) return { text: '', unsure: false };
  const fields = rs.map((r) => fieldOfEvent(r.text, { lenient: true }));
  const named = [...new Set(fields.filter(Boolean))];
  if (named.length > 1) return { text: rs.sort((a, b) => b.conf - a.conf)[0].text, unsure: true };
  if (named.length === 1) {
    // Prefer the reading whose words are spelled right.
    const hits = rs.filter((r, i) => fields[i] === named[0]);
    const exact = hits.find((r) => fieldOfEvent(r.text));
    return { text: (exact || hits.sort((a, b) => b.conf - a.conf)[0]).text, unsure: false };
  }
  return { text: rs.sort((a, b) => b.conf - a.conf)[0].text, unsure: false };
}

/** Prepared picture → transcript, table by table. */
async function ocrTranscript(png) {
  const { data, info } = await sharp(png).greyscale().raw().toBuffer({ resolveWithObject: true });
  const gray = { data, width: info.width, height: info.height };
  const source = { png, width: info.width, height: info.height };
  const scale = info.width < 1000 ? 4 : info.width < 1500 ? 3 : 1.5;
  const tables = findTables(gray);
  const blocks = [];
  const confs = [];
  let schoolYear = null;
  const notes = [];

  for (const t of tables) {
    // Crop just inside the rules.
    const by0 = t.headerBottom + 2;
    const by1 = t.y1 - 1;
    const left = ruleSpan(gray, { x: t.x0, from: t.x0 - 3, to: t.x0 + 4, y0: by0, y1: by1 });
    const right = ruleSpan(gray, { x: t.x1, from: t.x1 - Math.round((t.x1 - t.x0) * 0.12), to: t.x1 + 2, y0: by0, y1: by1, side: 'first' });
    // A rule too faint to see here (the sample's Summer table) keeps the position
    // findTables gave it, borrowed from the table above.
    const split = t.split != null ? (ruleSpan(gray, { x: t.split, y0: by0, y1: by1 }) || [t.split, t.split]) : null;
    const xL = pastHalo(gray, left ? left[1] + 1 : t.x0 + 2, 1, by0, by1);
    const xR = pastHalo(gray, right ? right[0] - 1 : t.x1 - 2, -1, by0, by1);

    // Header: title and range. Layout mode 4 first (it keeps a red title); 6 as a fallback.
    let headerLines = [];
    for (const psm of ['4', '6']) {
      const header = await ocrRegion(source, { x0: xL, y0: t.y0 + 2, x1: xR, y1: t.headerBottom - 1 }, { scale, psm, prep: 'light' });
      headerLines = header.lines.map((l) => l.text);
      if (headerLines.some((l) => isBlockTitle(l, true))) break;
    }
    if (headerLines.some((l) => /school\s*days|no\.?\s*of\s*school/i.test(l))) continue;
    const titleRaw = headerLines.find((l) => isBlockTitle(l, true));
    if (!titleRaw) continue;
    const title = cleanTitle(titleRaw);
    const rangeRaw = headerLines.find((l) => l !== titleRaw && parseRange(cleanRange(l), { lenient: true }));
    const rangeText = rangeRaw ? cleanRange(rangeRaw) : '';
    if (!schoolYear) schoolYear = schoolYearOf(title);

    const body = { y0: by0, y1: by1 };
    const rows = [];
    if (split) {
      const dateCol = { x0: xL, x1: pastHalo(gray, split[0] - 1, -1, by0, by1), ...body };
      const eventCol = { x0: pastHalo(gray, split[1] + 1, 1, by0, by1), x1: xR, ...body };
      const dates = [];
      const events = [];
      for (const prep of ['light', 'levels']) {
        const d = await ocrRegion(source, dateCol, { prep, scale });
        confs.push(d.conf);
        dates.push(d.lines);
      }
      for (const prep of ['plain', 'dark']) {
        const e = await ocrRegion(source, eventCol, { prep, scale });
        confs.push(e.conf);
        events.push(e.lines);
      }
      // Rows from the first readings, then each row collects every reading at its height.
      const base = pairRows(dates[0], events[0]);
      const heights = [...dates[0], ...events[0]].map((l) => l.y1 - l.y0).sort((a, b) => a - b);
      const lineH = heights.length ? heights[Math.floor(heights.length / 2)] : 10;
      const near = (lines, y) => lines.filter((l) => Math.abs((l.y0 + l.y1) / 2 - y) <= lineH * 0.6);
      for (const r of base) {
        const dateReadings = [r.date && r.date.text, ...near(dates[1], r.y).map((l) => l.text)].filter(Boolean);
        const eventReadings = [r.event && { text: r.event.text, conf: r.event.conf }, ...near(events[1], r.y).map((l) => ({ text: l.text, conf: l.conf }))].filter(Boolean);
        const date = pickDate(dateReadings);
        const event = pickEvent(eventReadings);
        if (!event.text && !date.text) continue;
        // A row of noise: no date and no real words.
        if (!date.text && (event.text.match(/[a-z]{3,}/gi) || []).length < 2) continue;
        rows.push({ dateText: date.text, event: event.text, ...(event.unsure ? { unsure: true } : {}) });
      }
    } else {
      const whole = await ocrRegion(source, { x0: xL, x1: xR, ...body }, { scale, psm: '6', prep: 'light' });
      confs.push(whole.conf);
      const b = blockFromLines([title, ...whole.lines.map((l) => l.text)], { lenient: true });
      if (b) rows.push(...b.rows);
    }
    blocks.push({
      title,
      rangeText,
      rows,
      bbox: { x: t.x0 / info.width, y: t.y0 / info.height, w: (t.x1 - t.x0) / info.width, h: (t.y1 - t.y0) / info.height },
    });
  }

  // No ruled tables found: read the page as plain lines.
  if (!blocks.length) {
    const whole = await ocrRegion(source, { x0: 0, y0: 0, x1: info.width, y1: info.height }, { scale: Math.min(scale, 3), psm: '4', prep: 'light' });
    confs.push(whole.conf);
    let cur = null;
    const groups = [];
    for (const l of whole.lines.map((x) => x.text)) {
      if (!schoolYear && /academic\s+year/i.test(l)) schoolYear = schoolYearOf(l);
      if (isBlockTitle(l, true)) { cur = [cleanTitle(l)]; groups.push(cur); } else if (cur) cur.push(l);
    }
    for (const g of groups) {
      const b = blockFromLines(g, { lenient: true });
      if (b) blocks.push(b);
    }
  }

  const confidence = confs.length ? Math.round(confs.reduce((s, c) => s + c, 0) / confs.length) : 0;
  if (info.width < 1200) notes.push(`The picture is small (${info.width} × ${info.height} px), so some dates may not have been read. Check each one against the picture.`);
  else if (confidence < 70) notes.push('Some of the picture was hard to read. Check each date against the picture.');
  return { transcript: { schoolYear, blocks: blocks.filter((b) => b && b.title) }, confidence, notes };
}

// ───────────────────────────── AI ─────────────────────────────

/** What the vision model must return: a transcription, nothing worked out. */
export const AI_SCHEMA = {
  type: 'OBJECT',
  properties: {
    schoolYear: { type: 'STRING', nullable: true, description: 'The main heading, e.g. "ACADEMIC YEAR 2026-2027", as written.' },
    blocks: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING', description: 'The block title exactly as written, e.g. "FIRST SEMESTER SY 2026-2027".' },
          semester: { type: 'STRING', enum: ['1st', '2nd', 'Summer', 'other'] },
          rangeText: { type: 'STRING', description: 'The date-range line under the title, exactly as written, or "".' },
          rows: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                dateText: { type: 'STRING', description: 'The date column exactly as written, e.g. "Aug 20, 22, 24-25".' },
                event: { type: 'STRING', description: 'The event column exactly as written.' },
              },
              required: ['dateText', 'event'],
            },
          },
        },
        required: ['title', 'semester', 'rangeText', 'rows'],
      },
    },
  },
  required: ['blocks'],
};

export const AI_INSTRUCTION = [
  'This is a university academic calendar. Transcribe it; do not interpret it.',
  'For every semester block (First Semester, Second Semester, Summer): the title exactly as written,',
  'which semester it is, the date-range line under the title exactly as written, and every row of the',
  'block as { dateText, event } copied exactly as written: same abbreviations, no years added, no dates',
  'converted, no rows merged or skipped. Ignore boxes that only count school days per month.',
].join(' ');

/** Keep only well-formed strings from the model's answer (it is untrusted input). */
export function cleanAiTranscript(raw) {
  const str = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').slice(0, max) : ''); // eslint-disable-line no-control-regex
  const blocks = Array.isArray(raw && raw.blocks) ? raw.blocks.slice(0, 6) : [];
  return {
    schoolYear: str(raw && raw.schoolYear, 100) || null,
    blocks: blocks.map((b) => ({
      title: str(b && b.title, 120),
      semester: ['1st', '2nd', 'Summer'].includes(b && b.semester) ? b.semester : undefined,
      rangeText: str(b && b.rangeText, 120),
      rows: (Array.isArray(b && b.rows) ? b.rows.slice(0, 80) : []).map((r) => ({ dateText: str(r && r.dateText, 80), event: str(r && r.event, 200) })),
    })).filter((b) => b.title || b.semester),
  };
}

/** The configured AI reader (image buffer → transcript), or null when none is set. */
export function configuredAiReader(env = process.env) {
  const provider = String(env.CALENDAR_AI_PROVIDER || '').trim().toLowerCase();
  if (!provider) return null;
  if (provider === 'gemini' && env.GEMINI_API_KEY) {
    return async (png) => {
      const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 30 * 1000);
      try {
        const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent', {
          method: 'POST',
          signal: ctrl.signal,
          headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
          body: JSON.stringify({
            contents: [{ parts: [{ text: AI_INSTRUCTION }, { inline_data: { mime_type: 'image/png', data: png.toString('base64') } }] }],
            generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: AI_SCHEMA },
          }),
        });
        if (!res.ok) throw new Error('AI reader answered ' + res.status);
        const body = await res.json();
        const text = body && body.candidates && body.candidates[0] && body.candidates[0].content
          && body.candidates[0].content.parts && body.candidates[0].content.parts.map((p) => p.text || '').join('');
        return JSON.parse(text || '{}');
      } finally {
        clearTimeout(timer);
      }
    };
  }
  return null;
}

// ───────────────────────────── entry point ─────────────────────────────

/** A picture, upright, as PNG, at most `max` px on its longest side. */
async function normalisePicture(buf, max) {
  const img = sharp(buf, { failOn: 'error' }).rotate();
  const meta = await img.metadata();
  const long = Math.max(meta.width || 0, meta.height || 0);
  if (!long) throw new CalendarReadError(UNREADABLE);
  return (long > max ? img.resize({ width: meta.width >= meta.height ? max : null, height: meta.height > meta.width ? max : null }) : img).png().toBuffer();
}

async function readPicture(buf, { ai }) {
  const warnings = [];
  const reader = ai === undefined ? configuredAiReader() : ai;
  if (reader) {
    try {
      const png = await normalisePicture(buf, 2000);
      const transcript = cleanAiTranscript(await reader(png));
      if (transcript.blocks.length) return { transcript, source: 'ai', confidence: null, warnings };
      warnings.push('The AI reader found no semester blocks; read the picture with OCR instead.');
    } catch (err) {
      warnings.push("The AI reader didn't answer (" + (err.name === 'AbortError' ? 'it took over 30 seconds' : 'an error') + '); read the picture with OCR instead.');
    }
  }
  const png = await normalisePicture(buf, 4000);
  try {
    const { transcript, confidence, notes } = await ocrTranscript(png);
    return { transcript, source: 'ocr', confidence, warnings: [...warnings, ...notes] };
  } finally {
    scheduleIdleClose();
  }
}

export async function readCalendar(buffer, kind, { ai } = {}) {
  if (kind === 'pdf') {
    let pages;
    try { ({ pages } = await readPdfItems(buffer)); } catch { throw new CalendarReadError(UNREADABLE); }
    const hasText = pages.some((p) => (p.items || []).some((it) => /[a-z]{3}/i.test(it.str)));
    if (hasText) {
      const transcript = transcriptFromPdfPages(pages);
      return { transcript, source: 'pdf', confidence: null, warnings: [] };
    }
    // A scanned PDF: read its page picture.
    const images = await pdfPageImages(buffer).catch(() => []);
    if (!images.length) throw new CalendarReadError(UNREADABLE);
    return readPicture(images[0], { ai });
  }
  return readPicture(buffer, { ai });
}

// Exported for the tests.
export const _internal = { phrasesOf, pickDate, pickEvent, tidy, norm, ocrRegion, PREP };
