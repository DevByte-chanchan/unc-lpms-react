'use strict';

// Scanning a Program Documents form — a picture (PNG, JPG, WEBP) or a PDF — into the same shapes the Excel imports
// give, so whatever is read goes through the same review and save as an uploaded spreadsheet:
//
//   po-peo   { peos: [{ statement, missionAligned }], outcomes: [{ text, peos: [1, 3], gas: [1, 4] }] }
//   co-po    { cos: [{ description, poMappings: ['I', '', 'E', …] }] }                 poMappings[i] is PO(i+1)
//   coaep    { cos: [{ statement, ilos: [{ outcome, assessments: [{ name }], performanceTarget }] }] }
//   front    { text }   (the front pages are kept as the PDF itself; their text is only checked, see frontPageCheck)
//
// How it is read:
//   PDF with text    the text and where it sits on the page (pdfjs-dist): exact, nothing guessed      source 'pdf'
//   picture / scan   1. Gemini, when LPMS_SCAN_AI=gemini and GEMINI_API_KEY are set (the picture is sent
//                       to Google; it only transcribes into the shape above, 60 s timeout)              source 'ai'
//                    2. otherwise OCR on this server (tesseract.js, English, offline)                    source 'ocr'
// OCR reads the statements well; ticks and I / E / D letters in small grid cells are less sure, so every scan is
// reviewed before it is saved (the PO / PEO editor; the "Check what was read" window for CO-PO and COAEP).
//
// scanDocument(buffer, kind, { ai }) → { data, source, warnings }. Throws ScanError (status 422) when nothing usable
// is found. `ai`: an injected reader for the tests (buffer, mime, kind) → data; null turns the AI reader off.

const path = require('path');

const KINDS = ['po-peo', 'co-po', 'coaep', 'front'];
const GRADUATE_ATTRIBUTES = ['EC', 'CL', 'ERC', 'LL'];
const MAX_BYTES = 12 * 1024 * 1024;

class ScanError extends Error {
    constructor(message) { super(message); this.status = 422; }
}
const UNREADABLE = 'Nothing could be read from this file. Upload a clearer picture or the PDF, or use the Excel template.';

// What the bytes are, by their signature (never by the file name).
const sniffKind = (buf) => {
    if (!buf || buf.length < 12) return null;
    if (buf.subarray(0, 5).toString('latin1') === '%PDF-') return 'pdf';
    if (buf[0] === 0x89 && buf.subarray(1, 4).toString('latin1') === 'PNG') return 'png';
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
    if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
    return null;
};
const MIME = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };

// ───────────────────────────── text with positions ─────────────────────────────
// Every source gives "words": { text, x0, x1, y, h } in its page's units (y grows downwards).

const pdfjs = () => import('pdfjs-dist/legacy/build/pdf.mjs');

// A PDF's text, page by page. Empty pages mean a scanned PDF (pictures only).
const pdfWords = async (buffer) => {
    const { getDocument } = await pdfjs();
    const doc = await getDocument({ data: new Uint8Array(buffer), verbosity: 0, isEvalSupported: false, disableFontFace: true, useSystemFonts: false }).promise;
    const pages = [];
    try {
        for (let p = 1; p <= Math.min(doc.numPages, 30); p++) {
            const page = await doc.getPage(p);
            const { height } = page.getViewport({ scale: 1 });
            const content = await page.getTextContent();
            pages.push(content.items.filter(it => it.str && it.str.trim()).map(it => ({
                text: it.str.trim(), x0: it.transform[4], x1: it.transform[4] + (it.width || 0),
                y: height - it.transform[5], h: Math.abs(it.transform[3]) || it.height || 8,
            })));
        }
    } finally { await doc.destroy(); }
    return pages;
};

// The largest picture on each page of a scanned PDF, as PNG.
const pdfPictures = async (buffer, maxPages = 4) => {
    const sharp = require('sharp');
    const { getDocument, OPS } = await pdfjs();
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
                const objs = String(id).startsWith('g_') ? page.commonObjs : page.objs;
                const img = await new Promise((resolve) => { try { objs.get(id, resolve); } catch { resolve(null); } });
                if (img && img.data && img.width * img.height > (best ? best.width * best.height : 0)) best = img;
            }
            if (!best) continue;
            const channels = best.data.length / (best.width * best.height);
            if (![1, 3, 4].includes(channels)) continue;
            out.push(await sharp(Buffer.from(best.data.buffer, best.data.byteOffset, best.data.byteLength),
                { raw: { width: best.width, height: best.height, channels } }).png().toBuffer());
        }
    } finally { await doc.destroy(); }
    return out;
};

// A picture upright, greyscale, large enough for OCR (tesseract reads ~30 px tall text best), and with the table's
// ruling lines erased: OCR reads borders as | _ [ and garbles the words between them. A ruling line is a straight
// dark run far longer than any letter stroke; each such run is painted white.
// How far a photo is tilted, in degrees (-5 … 5): the angle at which the dark pixels' row profile is sharpest,
// i.e. text rows and ruling lines run level. Measured on a small copy, so it is quick.
const skewAngle = async (buf) => {
    const sharp = require('sharp');
    const { data, info } = await sharp(buf).rotate().resize({ width: 900, withoutEnlargement: true }).greyscale().raw().toBuffer({ resolveWithObject: true });
    const W = info.width, H = info.height;
    const xs = [], ys = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (data[y * W + x] < 128) { xs.push(x); ys.push(y); }
    if (xs.length < 200) return 0;
    const score = (deg) => {
        const t = Math.tan(deg * Math.PI / 180);
        const rows = new Float64Array(H + W);
        for (let i = 0; i < xs.length; i++) {
            const r = Math.round(ys[i] - xs[i] * t) + W;
            if (r >= 0 && r < rows.length) rows[r]++;
        }
        let sum = 0;
        for (const v of rows) sum += v * v;
        return sum;
    };
    let best = 0, bestScore = score(0);
    for (let d = -5; d <= 5.001; d += 0.25) { const sc = score(d); if (sc > bestScore) { bestScore = sc; best = d; } }
    // refine around the best quarter degree
    for (let d = best - 0.2; d <= best + 0.201; d += 0.05) { const sc = score(d); if (sc > bestScore) { bestScore = sc; best = d; } }
    return Math.abs(best) < 0.1 ? 0 : best;
};

const prepareForOcr = async (buf) => {
    const sharp = require('sharp');
    const angle = await skewAngle(buf).catch(() => 0);
    const upright = await sharp(buf, { failOn: 'error' }).rotate().rotate(angle ? -angle : 0, { background: '#ffffff' }).png().toBuffer();
    const img = sharp(upright);
    const meta = await img.metadata();
    if (!meta.width || !meta.height) throw new ScanError(UNREADABLE);
    const width = meta.width < 2400 ? Math.min(3200, meta.width * 2) : meta.width;
    const { data, info } = await img.resize({ width, kernel: 'lanczos3' }).greyscale().normalize().raw().toBuffer({ resolveWithObject: true });
    const W = info.width, H = info.height;
    const dark = (v) => v < 150; // a ruling line's core; its grey edges are erased by the band below
    const minRun = Math.max(40, Math.round(W * 0.03));
    const erase = [];
    for (let y = 0; y < H; y++) {
        let run = 0;
        for (let x = 0; x <= W; x++) {
            if (x < W && dark(data[y * W + x])) { run++; continue; }
            if (run >= minRun) erase.push([y * W + x - run, 1, run]);
            run = 0;
        }
    }
    const minRunV = Math.max(40, Math.round(H * 0.03));
    for (let x = 0; x < W; x++) {
        let run = 0;
        for (let y = 0; y <= H; y++) {
            if (y < H && dark(data[y * W + x])) { run++; continue; }
            if (run >= minRunV) erase.push([(y - run) * W + x, W, run]);
            run = 0;
        }
    }
    // paint each run white, with 2 px either side across the line (its anti-aliased edges)
    for (const [start, step, n] of erase) {
        const across = step === 1 ? W : 1;
        for (let k = 0; k < n; k++) {
            const at = start + k * step;
            for (let d = -2; d <= 2; d++) { const i = at + d * across; if (i >= 0 && i < data.length) data[i] = 255; }
        }
    }
    return sharp(data, { raw: { width: W, height: H, channels: 1 } }).png().toBuffer();
};

let workerPromise = null;
let idleTimer = null;
const LANG_PATH = path.join(path.dirname(require.resolve('@tesseract.js-data/eng/package.json')), '4.0.0_best_int');
// One shared English worker, created on first use and closed after a minute idle; the language data is the bundled
// @tesseract.js-data/eng, so nothing is downloaded.
const ocrWorker = async () => {
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
    if (!workerPromise) {
        const { createWorker } = require('tesseract.js');
        workerPromise = createWorker('eng', 1, { langPath: LANG_PATH, cacheMethod: 'none', gzip: true })
            .then(async (w) => { await w.setParameters({ preserve_interword_spaces: '1', user_defined_dpi: '300' }); return w; })
            .catch((err) => { workerPromise = null; throw err; });
    }
    return workerPromise;
};
const closeOcr = async () => {
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
    const p = workerPromise;
    workerPromise = null;
    if (p) await (await p).terminate().catch(() => {});
};

const ocrWords = async (picture) => {
    const worker = await ocrWorker();
    try {
        const { data } = await worker.recognize(await prepareForOcr(picture), {}, { blocks: true });
        const words = [];
        for (const block of data.blocks || []) for (const para of block.paragraphs || []) for (const line of para.lines || []) {
            for (const w of line.words || []) {
                if (!w.text || !w.text.trim() || w.confidence < 20 || /^(?:[_\[\]~=—-]+|\|{2,})$/.test(w.text.trim())) continue;
                words.push({ text: w.text.trim(), x0: w.bbox.x0, x1: w.bbox.x1, y: (w.bbox.y0 + w.bbox.y1) / 2, h: w.bbox.y1 - w.bbox.y0 });
            }
        }
        return words;
    } finally {
        idleTimer = setTimeout(() => { closeOcr().catch(() => {}); }, 60 * 1000);
        if (idleTimer.unref) idleTimer.unref();
    }
};

// ───────────────────────────── lines and cells ─────────────────────────────

const median = (xs) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };

// Words into lines (same baseline) and each line into cells (a wide gap starts a new cell).
const linesOf = (words) => {
    const h = median(words.map(w => w.h)) || 10;
    const sorted = words.slice().sort((a, b) => a.y - b.y || a.x0 - b.x0);
    const lines = [];
    for (const w of sorted) {
        const line = lines.length && Math.abs(lines[lines.length - 1].y - w.y) <= h * 0.5 ? lines[lines.length - 1] : null;
        if (line) line.words.push(w); else lines.push({ y: w.y, words: [w] });
    }
    return lines.map((line) => {
        const ws = line.words.sort((a, b) => a.x0 - b.x0);
        const cells = [];
        for (const w of ws) {
            const cell = cells[cells.length - 1];
            const gap = cell ? w.x0 - cell.x1 : Infinity;
            // Some PDFs (Google Docs exports) give one piece per letter: pieces that touch are one word, a small gap
            // is a space, a wide one starts the next cell.
            if (cell && gap <= h * 0.12) { cell.text += w.text; cell.x1 = Math.max(cell.x1, w.x1); }
            else if (cell && gap <= h * 1.1) { cell.text += ' ' + w.text; cell.x1 = Math.max(cell.x1, w.x1); }
            else cells.push({ text: w.text, x0: w.x0, x1: w.x1 });
        }
        cells.forEach(c => { c.text = c.text.replace(/\s+/g, ' ').trim(); c.xc = (c.x0 + c.x1) / 2; });
        return { y: line.y, h, cells, text: cells.map(c => c.text).join(' ') };
    });
};

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
// The form's header and footer, repeated on every page: never part of a statement.
const PAGE_CHROME = /^(UNIVERSITY OF NUEVA CACERES|COURSE SYLLABUS|COURSE ASSESSMENT|FORM(?![A-Za-z])|OFFICE OF THE VICE PRESIDENT|DOC\.? CONTROL|UNC-FM-|EFFECTIVITY|REVISION NO|PAGE NO|COURSE OUTCOMES ASSESSMENT AND EVALUATION PLAN|DRAFT(?![A-Za-z]))/i;
const withoutChrome = (lines) => lines
    .map(l => ({ ...l, cells: l.cells.filter(c => !PAGE_CHROME.test(c.text)) }))
    .map(l => ({ ...l, text: l.cells.map(c => c.text).join(' ') }))
    .filter(l => l.cells.length);
// A tick as OCR or a PDF gives it: ✓ ✔ √, or what OCR often makes of one.
// A heading of another section ("COURSE DETAILS", "COURSE COVERAGE", "CO INTENDED LEARNING TOPIC …"): mostly
// capitals, several words, and not a PO / CO row. It ends the table being read.
const isHeading = (text) => {
    const letters = String(text).replace(/[^A-Za-z]/g, '');
    return letters.length >= 10 && (String(text).match(/[A-Z]/g) || []).length / letters.length > 0.85
        && String(text).trim().split(/\s+/).length >= 2 && !/^P[O0Q]\s*\d|^C[O0Q]\s*\d/.test(String(text).trim());
};
const isTick = (t) => /^[✓✔√☑✗xXvVlJ/~]{1,3}$/.test(String(t).trim()) && /[✓✔√☑✗xXvVJ/]/.test(String(t));
// One position per tick in a cell ("vv" is two ticks side by side).
const tickXs = (c) => {
    const marks = String(c.text).replace(/[^✓✔√☑✗xXvVJ/]/g, '');
    if (marks.length <= 1) return [c.xc];
    const step = (c.x1 - c.x0) / marks.length;
    return Array.from({ length: marks.length }, (_, k) => c.x0 + step * (k + 0.5));
};
const nearest = (columns, x) => columns.reduce((best, c) => (Math.abs(c.x - x) < Math.abs(best.x - x) ? c : best), columns[0]);
// A cell's text without the leading tick marks OCR sometimes glues on ("v PO3", "✓ ✓ PO1").
const stripTicks = (t) => String(t).replace(/^(?:[✓✔√☑vVxX/J~]\s+)+/, '');

// ───────────────────────────── the documents ─────────────────────────────

const PO_LABEL = /^P[O0Q]\s*-?\s*(?:[0-9][0-9OoIlGTSZB]?|[OoIlGTSZB][0-9]?)(?![A-Za-z])[\s:.)-]*/;
const CO_LABEL = /^C[O0Q]\s*-?\s*(\d{1,2})\b[\s:.)-]*/;

// The PO / PEO tables (page 2-3 of the export, or the program's own form).
const readPoPeo = (lines) => {
    const peos = [];
    const outcomes = [];
    let section = null;
    let peoCols = [];
    let gaCols = [];
    let lastPeo = null;
    let lastPo = null;
    for (const line of lines) {
        const up = line.text.toUpperCase();
        if (/EDUCATIONAL OBJECTIVES/.test(up) && !/RELATIONSHIP TO PROGRAM EDUCATIONAL/.test(up) && !/PROGRAM OUTCOMES \(POS\) AND/.test(up)) { section = 'peo'; lastPeo = null; continue; }
        if (/PROGRAM OUTCOMES/.test(up) && !/COURSE OUTCOMES/.test(up)) { section = 'po'; lastPo = null; continue; }
        if (!section) continue;
        // another section's heading ends the PO table (the PEO list ends at the PO heading above)
        if (section === 'po' && outcomes.length && isHeading(line.text) && !/^\s*\d\s+\d/.test(line.text)) { section = null; continue; }
        if (section === 'po') {
            // the PEO number row ("1 2 3 By the time of graduation …  EC CL ERC LL")
            const nums = line.cells.filter(c => /^\d$/.test(c.text));
            if (nums.length >= 2 && !line.cells.some(c => PO_LABEL.test(c.text))) {
                peoCols = nums.map(c => ({ n: Number(c.text), x: c.xc }));
                gaCols = line.cells.filter(c => GRADUATE_ATTRIBUTES.includes(c.text.toUpperCase())).map(c => ({ n: GRADUATE_ATTRIBUTES.indexOf(c.text.toUpperCase()) + 1, x: c.xc }));
                continue;
            }
            const labelAt = line.cells.findIndex(c => PO_LABEL.test(stripTicks(c.text)));
            if (labelAt >= 0) {
                const label = line.cells[labelAt];
                const rest = stripTicks(label.text).replace(PO_LABEL, '').trim();
                const after = line.cells.slice(labelAt + 1);
                const statement = [rest, ...after.filter(c => !isTick(c.text) && !/^[|]+$/.test(c.text) && !/^(?:(?:EC|CL|ERC|LL)\s*)+$/.test(c.text)).map(c => c.text)].filter(Boolean).join(' ').replace(/^[|\s]+|[|\s]+$/g, '').trim();
                const before = line.cells.slice(0, labelAt);
                const leadTicks = (label.text.match(/^(?:[✓✔√☑vVxX/J~]\s+)+/) || [''])[0].trim().split(/\s+/).filter(Boolean).length;
                const peosTicked = peoCols.length
                    ? [...new Set(before.filter(c => isTick(c.text)).flatMap(tickXs).map(x => nearest(peoCols, x).n))]
                    : [];
                if (!peoCols.length && (before.some(c => isTick(c.text)) || leadTicks)) peosTicked.push(1);
                const gaZone = gaCols.length ? Math.min(...gaCols.map(g => g.x)) - 30 : Infinity;
                const gasTicked = gaCols.length ? [...new Set(after.filter(c => isTick(c.text) && c.xc >= gaZone).flatMap(tickXs).map(x => nearest(gaCols, x).n))] : [];
                lastPo = { text: statement, peos: peosTicked.sort((a, b) => a - b), gas: gasTicked.sort((a, b) => a - b), x: after[0] ? after[0].x0 : label.x1 };
                outcomes.push(lastPo);
                continue;
            }
            // a statement running onto the next line; a capitalised line after a finished statement is the next PO
            // whose label OCR lost
            if (lastPo && line.cells.length && !/^(PEOS?|GRADUATE|ATTRIBUTES|EFFECTIVITY|PAGE NO)/.test(up)) {
                const ticks = line.cells.filter(c => isTick(c.text) && c.x1 < lastPo.x);
                const text = line.cells.filter(c => !isTick(c.text) && !GRADUATE_ATTRIBUTES.includes(c.text.toUpperCase())).map(c => c.text).join(' ').replace(/^[|\s]+|[|\s]+$/g, '').trim();
                // ticks on a line of their own (a form that centres them in a tall row) belong to the PO above
                if (!text && line.cells.some(c => isTick(c.text))) {
                    if (peoCols.length) lastPo.peos = [...new Set([...lastPo.peos, ...ticks.flatMap(tickXs).map(x => nearest(peoCols, x).n)])].sort((a, b) => a - b);
                    if (gaCols.length) {
                        const gaZone = Math.min(...gaCols.map(g => g.x)) - 30;
                        lastPo.gas = [...new Set([...lastPo.gas, ...line.cells.filter(c => isTick(c.text) && c.xc >= gaZone).flatMap(tickXs).map(x => nearest(gaCols, x).n)])].sort((a, b) => a - b);
                    }
                    continue;
                }
                if (!text || /^(effectivity|revision no|page no)/i.test(text)) continue;
                if (/[.;]$/.test(lastPo.text.trim()) && /^[A-Z]/.test(text)) {
                    lastPo = { text, peos: peoCols.length ? [...new Set(ticks.flatMap(tickXs).map(x => nearest(peoCols, x).n))].sort((a, b) => a - b) : [], gas: [], x: lastPo.x };
                    outcomes.push(lastPo);
                } else lastPo.text += ' ' + text;
            }
            continue;
        }
        // PEOs: "1. Utilize …", one per number; a line without a number continues the one above
        const first = line.cells[0] ? line.cells[0].text : '';
        const numbered = /^(\d)[.)]?\s+(.*)$/.exec(line.text);
        if (/^(UNC MISSION|STATEMENT|PEO|#)$/i.test(first) || /^(VISION|MISSION) STATEMENT/i.test(up)) continue;
        if (numbered) {
            const text = numbered[2].replace(/\s*[✓✔√]\s*$/, '').trim();
            if (text && !peos.some(p => norm(p.statement) === norm(text))) { lastPeo = { statement: text, missionAligned: true }; peos.push(lastPeo); }
            else lastPeo = null;
        } else if (lastPeo && line.text && !/^(effectivity|revision no|page no|school of|program:)/i.test(line.text)) {
            lastPeo.statement = (lastPeo.statement + ' ' + line.text.replace(/\s*[✓✔√]\s*$/, '')).trim();
        }
    }
    const tidy = (s) => s.replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();
    return {
        peos: peos.map(p => ({ ...p, statement: tidy(p.statement) })).filter(p => p.statement.length > 5),
        outcomes: outcomes.map(o => ({ text: tidy(o.text), peos: o.peos, gas: o.gas })).filter(o => o.text.length > 3),
    };
};

// The CO-PO table: a header row of PO1 … POn, then a row per CO with I / E / D under the POs.
const readCoPo = (lines) => {
    let poCols = [];
    let width = 0;
    const cos = [];
    let cur = null;
    for (const line of lines) {
        const heads = line.cells.filter(c => /^PO\s*\d{1,2}$/i.test(c.text));
        if (heads.length >= 2) {
            poCols = heads.map(c => ({ n: Number(c.text.replace(/\D/g, '')), x: c.xc, x0: c.x0 }));
            width = Math.max(width, ...poCols.map(c => c.n));
            cur = null;
            continue;
        }
        if (!poCols.length) continue;
        if (cos.length && isHeading(line.text)) { poCols = []; cur = null; continue; }
        const firstPoX = Math.min(...poCols.map(c => c.x0)) - 4;
        const textCells = line.cells.filter(c => c.x1 <= firstPoX + 2);
        const marks = line.cells.filter(c => c.x0 >= firstPoX - 2 && /^[IEDl|1]$/i.test(c.text)).map(c => ({ ...c, text: /^[l|1]$/.test(c.text) ? 'I' : c.text }));
        const text = textCells.map(c => c.text).join(' ').trim();
        if (CO_LABEL.test(text)) {
            cur = { description: text, marks: {} };
            cos.push(cur);
        } else if (cur && text && !/^(effectivity|revision no|page no|legend|i\s*[-=–])/i.test(text)) {
            cur.description += ' ' + text;
        }
        if (cur) for (const m of marks) cur.marks[nearest(poCols, m.xc).n] = m.text.toUpperCase();
    }
    return {
        cos: cos.map(c => ({
            // OCR's "C02" is "CO2"
            description: c.description.replace(/\s+/g, ' ').trim().replace(/^C[0Q](?=\s*\d)/, 'CO'),
            poMappings: Array.from({ length: width }, (_, i) => c.marks[i + 1] || ''),
        })),
    };
};

// The COAEP: columns found from the header (outcome statement, ILO, assessment, target); a CO starts with "CO1" or
// "1.0", an ILO with "ILO1" or a number, and the other columns' lines belong to the ILO they sit beside.
const COAEP_HEADS = [
    { key: 'co', test: /course\s*outcome/i },
    { key: 'ilo', test: /intended\s*learning|\bilos?\b/i },
    { key: 'assess', test: /assessment/i },
    { key: 'target', test: /performance\s*target|target/i },
];
const readCoaep = (lines) => {
    let cols = null;
    let headerY = null;
    const body = [];
    for (const line of lines) {
        const found = COAEP_HEADS.map(h => ({ key: h.key, cell: line.cells.find(c => h.test.test(c.text)) })).filter(f => f.cell);
        if (found.length >= 3) {
            // the column header (it repeats on every page): sets the columns, never content
            if (!cols) cols = found.map(f => ({ key: f.key, x0: f.cell.x0 })).sort((a, b) => a.x0 - b.x0);
            headerY = line.y;
            body.push({ header: true });
            continue;
        }
        if (!cols || headerY === null) continue;
        if (/must be SMART|sample performance target|^reminders|^prepared by|^date submitted/i.test(line.text)) { headerY = null; continue; }
        body.push(line);
    }
    if (!cols) return { cos: [] };

    // A table row starts where the gap to the line above is clearly wider than the gap between wrapped lines.
    const gaps = [];
    for (let i = 1; i < body.length; i++) if (!body[i].header && !body[i - 1].header) gaps.push(body[i].y - body[i - 1].y);
    // the spacing of wrapped lines: a low percentile, since in short rows half the gaps are row gaps
    const sortedGaps = gaps.filter(g => g > 0).sort((a, b) => a - b);
    const pitch = sortedGaps[Math.floor(sortedGaps.length * 0.2)] || 12;

    const at = (cell) => cols.reduce((best, c) => (cell.x0 >= c.x0 - 6 ? c : best), cols[0]).key;
    // When the form bullets its assessments, only a bulleted line starts a new one (a wrapped name continues).
    const BULLET = /^[•·▪●◦]/;
    const bulleted = body.some(l => !l.header && l.cells.some(c => at(c) === 'assess' && BULLET.test(c.text)));
    // Without bullet text (a PDF draws them as shapes), a line continues the assessment above only when that line
    // ran to the column's right edge, which is why it wrapped; a short line above means a new item.
    const assessCol = cols.findIndex(c => c.key === 'assess');
    const assessRight = assessCol >= 0 && cols[assessCol + 1] ? cols[assessCol + 1].x0 : null;
    const assessWidth = assessRight !== null ? assessRight - cols[assessCol].x0 : null;
    let lastAssessX1 = null;
    const cos = [];
    let co = null;
    let ilo = null;
    let prevY = null;
    for (const line of body) {
        if (line.header) { prevY = null; continue; }
        const byCol = {};
        for (const c of line.cells) (byCol[at(c)] = byCol[at(c)] || []).push(c.text);
        const join = (k) => (byCol[k] || []).join(' ').replace(/^[•·]\s*/, '').trim();
        // a new row: a clearly wider gap, or a second performance target starting under one already read
        const targetStarts = /^(at least|\d+\s*%)/i.test(join('target'));
        const newRow = prevY === null || line.y - prevY > pitch * 1.35 || (targetStarts && !!(ilo && ilo.performanceTarget));
        prevY = line.y;
        const coText = join('co');
        // a CO starts with its number ("1 Analyze …", "CO1: …", "1.0 …")
        const coStart = /^(?:CO\s*-?\s*\d{1,2}\b[\s:.)-]*|\d{1,2}(?:\.0)?\s+)(?=\S)/i.exec(coText);
        if (coStart) { co = { statement: coText.slice(coStart[0].length), ilos: [] }; cos.push(co); ilo = null; }
        else if (coText && co) co.statement += ' ' + coText;
        else if (coText) { co = { statement: coText, ilos: [] }; cos.push(co); ilo = null; }
        if (!co) continue;
        const iloText = join('ilo');
        if (iloText && (newRow || coStart || !ilo || /^ILO\s*\d+/i.test(iloText))) {
            ilo = { outcome: iloText.replace(/^ILO\s*\d+\s*[:.)-]?\s*/i, ''), assessments: [], performanceTarget: '' };
            lastAssessX1 = null;
            co.ilos.push(ilo);
        } else if (iloText && ilo) ilo.outcome += ' ' + iloText;
        if (!ilo) continue;
        let startNext = false;
        const assessCells = line.cells.filter(c => at(c) === 'assess');
        const wrappedFromAbove = lastAssessX1 !== null && assessRight !== null && lastAssessX1 > assessRight - assessWidth * 0.2;
        if (assessCells.length) lastAssessX1 = Math.max(...assessCells.map(c => c.x1));
        for (const raw of byCol.assess || []) {
            if (BULLET.test(raw) && !raw.replace(BULLET, '').trim()) { startNext = true; continue; }
            const text = raw.replace(/^[•·▪●◦\-–]\s*/, '').trim();
            if (!text || text === '—') continue;
            const lastA = ilo.assessments[ilo.assessments.length - 1];
            const starts = !lastA || (bulleted ? (startNext || BULLET.test(raw))
                : assessRight !== null ? !wrappedFromAbove : !/^[a-z(&]/.test(text));
            startNext = false;
            if (!starts && lastA) lastA.name += ' ' + text;
            else text.split(/\s*;\s*/).filter(Boolean).forEach(name => ilo.assessments.push({ name }));
        }
        const target = join('target');
        if (target && target !== '—') ilo.performanceTarget = (ilo.performanceTarget + ' ' + target).trim();
    }
    const tidy = (s) => String(s || '').replace(/(^|\s)[«»•·+*](?=\s|$)/g, ' ').replace(/\s+/g, ' ').replace(/(\w)- (\w)/g, '$1-$2').trim();
    return {
        cos: cos.map(c => ({
            statement: tidy(c.statement),
            ilos: c.ilos.map(i => ({ outcome: tidy(i.outcome), assessments: i.assessments.map(a => ({ name: tidy(a.name) })), performanceTarget: tidy(i.performanceTarget) })),
        })).filter(c => c.statement || c.ilos.length),
    };
};

const READERS = { 'po-peo': readPoPeo, 'co-po': readCoPo, coaep: readCoaep, front: (lines) => ({ text: lines.map(l => l.text).join('\n') }) };

const usable = (kind, data) => (kind === 'po-peo' ? data.peos.length > 0 || data.outcomes.length > 0
    : kind === 'front' ? data.text.trim().length > 20 : data.cos.length > 0);

// ───────────────────────────── the AI reader (Gemini) ─────────────────────────────

const AI_PROMPT = {
    'po-peo': 'This is a university program document. Transcribe the Program Educational Objectives (PEOs) and the Program Outcomes (POs). For each PO, list which PEO numbers are ticked for it and which graduate attributes are ticked (1=EC, 2=CL, 3=ERC, 4=LL). Copy the statements exactly; do not invent anything.',
    'co-po': 'This is a course outcome to program outcome (CO-PO) table. For each course outcome, copy its statement exactly and give the mark (I, E, D or empty) under each PO column, in PO order. Do not invent anything.',
    coaep: 'This is a Course Outcomes Assessment and Evaluation Plan (COAEP). For each course outcome, copy its statement, then each of its intended learning outcomes (ILOs) with their assessment tools and performance target, exactly as written. Do not invent anything.',
    front: 'Transcribe all the text on these pages exactly, in reading order.',
};
const S = { type: 'STRING' };
const AI_SCHEMA = {
    'po-peo': { type: 'OBJECT', properties: {
        peos: { type: 'ARRAY', items: { type: 'OBJECT', properties: { statement: S }, required: ['statement'] } },
        outcomes: { type: 'ARRAY', items: { type: 'OBJECT', properties: { text: S, peos: { type: 'ARRAY', items: { type: 'INTEGER' } }, gas: { type: 'ARRAY', items: { type: 'INTEGER' } } }, required: ['text'] } },
    }, required: ['peos', 'outcomes'] },
    'co-po': { type: 'OBJECT', properties: { cos: { type: 'ARRAY', items: { type: 'OBJECT', properties: { description: S, poMappings: { type: 'ARRAY', items: S } }, required: ['description'] } } }, required: ['cos'] },
    coaep: { type: 'OBJECT', properties: { cos: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
        statement: S,
        ilos: { type: 'ARRAY', items: { type: 'OBJECT', properties: { outcome: S, assessments: { type: 'ARRAY', items: S }, performanceTarget: S }, required: ['outcome'] } },
    }, required: ['statement'] } } }, required: ['cos'] },
    front: { type: 'OBJECT', properties: { text: S }, required: ['text'] },
};

const configuredAi = (env = process.env) => {
    if (String(env.LPMS_SCAN_AI || '').toLowerCase() !== 'gemini' || !env.GEMINI_API_KEY) return null;
    return async (buffer, mime, kind) => {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 60 * 1000);
        try {
            const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
                method: 'POST',
                signal: ctrl.signal,
                headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: AI_PROMPT[kind] }, { inline_data: { mime_type: mime, data: buffer.toString('base64') } }] }],
                    generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: AI_SCHEMA[kind] },
                }),
            });
            if (!res.ok) throw new Error(`AI reader answered ${res.status}`);
            const body = await res.json();
            const text = (body?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
            return JSON.parse(text || '{}');
        } finally { clearTimeout(timer); }
    };
};

// What the AI gives, brought into the import shapes (and nothing the import would refuse).
const fromAi = (kind, raw) => {
    const s = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
    if (kind === 'po-peo') {
        const peos = (raw.peos || []).map(p => ({ statement: s(p.statement), missionAligned: true })).filter(p => p.statement);
        const within = (xs, max) => [...new Set((xs || []).map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= max))].sort((a, b) => a - b);
        return { peos, outcomes: (raw.outcomes || []).map(o => ({ text: s(o.text), peos: within(o.peos, peos.length), gas: within(o.gas, 4) })).filter(o => o.text) };
    }
    if (kind === 'co-po') {
        const width = Math.max(0, ...(raw.cos || []).map(c => (c.poMappings || []).length));
        return { cos: (raw.cos || []).map(c => ({ description: s(c.description), poMappings: Array.from({ length: width }, (_, i) => (/^[IED]$/i.test(s((c.poMappings || [])[i])) ? s(c.poMappings[i]).toUpperCase() : '')) })).filter(c => c.description) };
    }
    if (kind === 'coaep') {
        return { cos: (raw.cos || []).map(c => ({
            statement: s(c.statement),
            ilos: (c.ilos || []).map(i => ({ outcome: s(i.outcome), assessments: (i.assessments || []).map(a => ({ name: s(a) })).filter(a => a.name), performanceTarget: s(i.performanceTarget) })).filter(i => i.outcome),
        })).filter(c => c.statement || c.ilos.length) };
    }
    return { text: s(raw.text) };
};

// ───────────────────────────── entry point ─────────────────────────────

const scanDocument = async (buffer, kind, { ai } = {}) => {
    if (!KINDS.includes(kind)) throw new ScanError('Unknown document.');
    if (!Buffer.isBuffer(buffer) || !buffer.length) throw new ScanError('Choose a file.');
    if (buffer.length > MAX_BYTES) throw new ScanError('The file is larger than 12 MB.');
    const type = sniffKind(buffer);
    if (!type) throw new ScanError('Upload a PDF or a picture (PNG, JPG or WEBP).');
    const warnings = [];

    // A PDF with text is read exactly.
    if (type === 'pdf') {
        let pages;
        try { pages = await pdfWords(buffer); } catch { throw new ScanError('This PDF could not be opened. It may be damaged or password-protected.'); }
        if (pages.some(p => p.length > 10)) {
            const data = READERS[kind](withoutChrome(pages.flatMap(p => linesOf(p))));
            if (!usable(kind, data)) throw new ScanError(UNREADABLE);
            return { data, source: 'pdf', warnings };
        }
    }

    // A picture, or a scanned PDF: the AI reader when configured, else OCR.
    const reader = ai === undefined ? configuredAi() : ai;
    if (reader) {
        try {
            const data = fromAi(kind, await reader(buffer, MIME[type], kind));
            if (usable(kind, data)) return { data, source: 'ai', warnings };
            warnings.push('The AI reader found nothing usable; read by OCR instead.');
        } catch {
            warnings.push('The AI reader could not be reached; read by OCR instead.');
        }
    }
    const pictures = type === 'pdf' ? await pdfPictures(buffer).catch(() => []) : [buffer];
    if (!pictures.length) throw new ScanError(UNREADABLE);
    const lines = [];
    for (const picture of pictures) {
        let words;
        try { words = await ocrWords(picture); } catch (err) { if (err instanceof ScanError) throw err; throw new ScanError(UNREADABLE); }
        lines.push(...linesOf(words));
    }
    const data = READERS[kind](withoutChrome(lines));
    if (!usable(kind, data)) throw new ScanError(UNREADABLE);
    warnings.push(kind === 'co-po' ? 'Read by OCR: check every I / E / D mark before saving.'
        : kind === 'po-peo' ? 'Read by OCR: check every tick before saving.'
            : kind === 'coaep' ? 'Read by OCR: check the wording before saving.' : 'Read by OCR.');
    return { data, source: 'ocr', warnings };
};

// The front pages' text against the program's records: which PEO and PO statements appear in it.
const frontPageCheck = (text, { peos = [], outcomes = [] }) => {
    const hay = norm(text);
    const found = (statement) => {
        const n = norm(statement);
        return n.length > 0 && (hay.includes(n) || hay.includes(n.slice(0, 60)));
    };
    return {
        vision: /vision/i.test(text),
        mission: /mission/i.test(text),
        peos: peos.map((p, i) => ({ label: `PEO ${i + 1}`, found: found(p.statement) })),
        outcomes: outcomes.map((o, i) => ({ label: `PO${i + 1}`, found: found(o.text) })),
    };
};

module.exports = { scanDocument, frontPageCheck, sniffKind, linesOf, readPoPeo, readCoPo, readCoaep, fromAi, configuredAi, closeOcr, ScanError, KINDS };
