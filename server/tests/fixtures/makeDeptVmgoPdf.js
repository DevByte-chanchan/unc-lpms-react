/**
 * Builds SYNTHETIC department VMGO PDFs for the department parser tests, in
 * the same two-column layout as makeVmgoPdf.js (label column left, content
 * right, gray full-width header bars).
 *
 * Traps reproduced:
 *   - two-line labels ("VISION" / "STATEMENT") interleaving with the content;
 *   - goals and objectives as plain numbered sentences with NO bold title,
 *     one of them wrapping onto a second line;
 *   - core values with bold titles and no numbers;
 *   - an end-of-line hyphen and a missing space after a period;
 *   - a label the parser doesn't know, wrapped over two lines
 *     ("PROGRAM EDUCATIONAL" / "OBJECTIVES") — the second line must NOT be
 *     read as the department's OBJECTIVES label;
 *   - optional UNIVERSITY block above, optional second department block, and
 *     a "one-block" variant with no header bar at all.
 */
import { buildPdf, textLine, R, B } from './makeVmgoPdf.js';

const PAGE_W = 612;
const PAGE_H = 792;
const LABEL_X = 60;
const CONTENT_X = 200;
const LEAD = 14;

export const SCIS_HEADER = 'SCHOOL OF COMPUTER AND INFORMATION SCIENCES';
export const CEA_HEADER = 'COLLEGE OF ENGINEERING AND ARCHITECTURE';

export const SCIS_GOALS = [
  'To produce competent computing professionals who are responsive to the needs of industry and society.',
  'To advance computing knowledge through research.',
  'To serve partner communities through technology-based extension programs.',
];
export const SCIS_OBJECTIVES = [
  'Deliver outcomes-based computing programs aligned with national standards.',
  'Engage faculty and students in research that addresses local problems.',
  'Strengthen linkages with industry partners for internships and employment.',
  'Provide continuing professional development for faculty.',
];
export const SCIS_CORE_VALUES = ['Integrity', 'Innovation', 'Service'];

const UNIVERSITY_ROWS = [
  {
    label: ['VISION', 'STATEMENT'],
    lines: [
      [R('Our vision is to be the top university of choice for Bicolanos everywhere,')],
      [R('a community that forms graduates who make a difference in the lives of others.')],
    ],
  },
  {
    label: ['MISSION', 'STATEMENT'],
    lines: [
      [R('We commit to provide quality, relevant and accessible education that')],
      [R('nurtures the dreams of every learner.')],
    ],
  },
];

export const SCIS_ROWS = [
  {
    label: ['VISION', 'STATEMENT'],
    lines: [
      [R('The School of Computer and Information Sciences envisions itself as a center')],
      [R('of excellence in computing education in the Bicol Region.')],
    ],
  },
  {
    label: ['MISSION', 'STATEMENT'],
    lines: [
      [R('The School commits to develop ethical and innovative computing pro-')],
      [R('fessionals through quality instruction.It pursues research and extension')],
      [R('that serve the community.')],
    ],
  },
  {
    label: ['GOALS'],
    numbered: true,
    lines: [
      [[R('To produce competent computing professionals who are responsive to the')], [R('needs of industry and society.')]],
      [[R('To advance computing knowledge through research.')]],
      [[R('To serve partner communities through technology-based extension programs.')]],
    ],
  },
  {
    label: ['OBJECTIVES'],
    numbered: true,
    lines: SCIS_OBJECTIVES.map((s) => [[R(s)]]),
  },
  {
    label: ['CORE', 'VALUES'],
    lines: [
      [B('Integrity.'), R(' We act honestly and transparently.')],
      [B('Innovation.'), R(' We create new solutions with technology.')],
      [B('Service.'), R(' We share what we know with the community.')],
    ],
  },
];

/** The label the parser doesn't know, split across two lines. */
export const PEO_ROW = {
  label: ['PROGRAM EDUCATIONAL', 'OBJECTIVES'],
  numbered: true,
  lines: [
    [[R('Graduates practice computing professionally and ethically.')]],
    [[R('Graduates pursue lifelong learning and advanced studies.')]],
  ],
};

export const CEA_ROWS = [
  {
    label: ['VISION', 'STATEMENT'],
    lines: [[R('The College aims to be a leading engineering and architecture school.')]],
  },
  {
    label: ['MISSION', 'STATEMENT'],
    lines: [[R('The College forms engineers and architects who build sustainable communities.')]],
  },
];

/** Draw rows top-down from `y` onto page `out`; returns the new y. */
function drawRows(out, rows, y) {
  for (const row of rows) {
    const top = y;
    row.label.forEach((l, i) => out.push(textLine(LABEL_X, top - i * LEAD, [B(l)], 10)));
    if (row.numbered) {
      row.lines.forEach((item, n) => {
        item.forEach((runs, i) => {
          if (i === 0) out.push(textLine(CONTENT_X, y, [R((n + 1) + '.')]));
          out.push(textLine(CONTENT_X + 16, y, runs));
          y -= LEAD;
        });
      });
    } else {
      for (const runs of row.lines) { out.push(textLine(CONTENT_X, y, runs)); y -= LEAD; }
    }
    y = Math.min(y, top - row.label.length * LEAD) - 12;
  }
  return y;
}

function drawHeader(out, text, y) {
  out.push('0.8 g ' + (LABEL_X - 6) + ' ' + (y - 6) + ' ' + (PAGE_W - 2 * LABEL_X + 12) + ' 20 re f 0 g\n');
  // Roughly centred, as in a Word table's merged header row.
  out.push(textLine(Math.max(LABEL_X + 50, PAGE_W / 2 - text.length * 3.6), y, [B(text)], 12));
  return y - 30;
}

/**
 * blocks: [{ header, rows }] — header null for a header-less one-block file.
 * Each block after the first starts on a new page; the university block, when
 * asked for, comes first on its own page.
 */
export function makeDeptVmgoPdf({ university = false, blocks = [{ header: SCIS_HEADER, rows: SCIS_ROWS }] } = {}) {
  const pages = [];
  if (university) {
    const p = [];
    drawRows(p, UNIVERSITY_ROWS, drawHeader(p, 'UNIVERSITY', PAGE_H - 72));
    p.push(textLine(PAGE_W / 2, 30, [R(String(pages.length + 1))], 9));
    pages.push(p.join(''));
  }
  for (const block of blocks) {
    const p = [];
    let y = PAGE_H - 72;
    if (block.header) y = drawHeader(p, block.header, y);
    drawRows(p, block.rows, y);
    p.push(textLine(PAGE_W / 2, 30, [R(String(pages.length + 1))], 9));
    pages.push(p.join(''));
  }
  return buildPdf(pages);
}
