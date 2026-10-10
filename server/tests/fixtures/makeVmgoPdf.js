/**
 * Builds SYNTHETIC University VMGO PDFs for the parser tests — no PDF library,
 * just hand-written PDF operators with the 14 standard fonts.
 *
 * This is not the real university document. It reproduces that document's
 * LAYOUT and its known traps, so the tests exercise the same failure modes:
 *   - two-column table: "VISION" / "STATEMENT" on two lines in the left column,
 *     at the same heights as the paragraph lines on the right (the arrangement
 *     that makes line-by-line text extraction interleave the columns);
 *   - gray UNIVERSITY header bar, and a SCHOOL block below that must be ignored;
 *   - "objectives.UNC shall" / "standards.UNC pledges" (missing space);
 *   - "independently , reflect" (space before the comma);
 *   - an end-of-line hyphen ("commu-" / "nity");
 *   - numbered core values with bold titles — item 4 with NO period after it;
 *   - un-numbered graduate attributes with bold titles, the list running onto
 *     page 2.
 *
 * When the real PDF is present at sample-uploads/university-vmgo.pdf the tests
 * run against it as well.
 */

const PAGE_W = 612;
const PAGE_H = 792;
const LABEL_X = 60;
const CONTENT_X = 200;
const LEAD = 14;

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

/**
 * A line of text runs: [{ text, bold }]. Font switches inside one BT block, so
 * each run starts exactly where the previous one ended — the same way a word
 * processor writes "Bold title. Regular description" on one line.
 */
export function textLine(x, y, runs, size = 11) {
  let s = 'BT ' + x + ' ' + y + ' Td ';
  for (const r of runs) s += '/' + (r.bold ? 'F2' : 'F1') + ' ' + size + ' Tf (' + esc(r.text) + ') Tj ';
  return s + 'ET\n';
}

/** Assemble a PDF from per-page content streams. */
export function buildPdf(pageStreams) {
  const objects = [];
  const add = (body) => { objects.push(body); return objects.length; };

  const catalogId = add(null);
  const pagesId = add(null);
  const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const pageIds = [];
  for (const stream of pageStreams) {
    const contentId = add('<< /Length ' + Buffer.byteLength(stream, 'latin1') + ' >>\nstream\n' + stream + 'endstream');
    pageIds.push(add(
      '<< /Type /Page /Parent ' + pagesId + ' 0 R /MediaBox [0 0 ' + PAGE_W + ' ' + PAGE_H + '] '
      + '/Resources << /Font << /F1 ' + f1 + ' 0 R /F2 ' + f2 + ' 0 R >> >> /Contents ' + contentId + ' 0 R >>'
    ));
  }
  objects[catalogId - 1] = '<< /Type /Catalog /Pages ' + pagesId + ' 0 R >>';
  objects[pagesId - 1] = '<< /Type /Pages /Kids [' + pageIds.map((id) => id + ' 0 R').join(' ') + '] /Count ' + pageIds.length + ' >>';

  let out = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, 'latin1'));
    out += (i + 1) + ' 0 obj\n' + body + '\nendobj\n';
  });
  const xref = Buffer.byteLength(out, 'latin1');
  out += 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
  for (const o of offsets) out += String(o).padStart(10, '0') + ' 00000 n \n';
  out += 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root ' + catalogId + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
  return Buffer.from(out, 'latin1');
}

export const R = (text) => ({ text, bold: false });
export const B = (text) => ({ text, bold: true });

// Each row: label lines (left) and content lines (right), drawn top-down.
const ROWS = [
  {
    label: ['VISION', 'STATEMENT'],
    lines: [
      [R('Our vision is to be the top university of choice for Bicolanos everywhere,')],
      [R('a community that forms graduates who make a difference in the lives of')],
      [R('others and help them become builders of better tomorrows for all.')],
    ],
  },
  {
    label: ['MISSION', 'STATEMENT'],
    lines: [
      [R('We commit to provide quality, relevant and accessible education that')],
      [R('nurtures the dreams of every learner and serves the wider commu-')],
      [R('nity through instruction, research and extension.')],
    ],
  },
  {
    label: ['EDUCATIONAL', 'POLICY'],
    lines: [
      [R('The University designs every program around clear learning objectives.UNC shall')],
      [R('review its curricula regularly to keep them relevant to industry and society.')],
      [R('Instruction is measured against national and international standards.UNC pledges')],
      [R('to support its faculty in delivering student-centred learning.')],
    ],
  },
  {
    label: ['CORE', 'VALUES'],
    numbered: true,
    lines: [
      [[B('We Champion Excellence.'), R(' We consistently strive for excellence in everything')], [R('we do.')]],
      [[B('We Nurture Dreams.'), R(' We help every member of our community realize their')], [R('aspirations.')]],
      [[B('We Do The Right Things Right.'), R(' We act with integrity and accountability.')]],
      [[B('We Are Dynamic and Creative'), R(' We anticipate the forces of change and respond')], [R('with innovative solutions.')]],
      [[B('We Respect Each Other and Work As A Team.'), R(' We value every person and')], [R('collaborate toward shared goals.')]],
    ],
  },
];

const ATTRIBUTES_P1 = [
  [[B('Excellent Communicator.'), R(' Ability to effectively use oral and written skills')], [R('in diverse settings.')]],
];
const ATTRIBUTES_P2 = [
  [[B('Creative Leader.'), R(' Ability to lead others in creating innovative solutions.')]],
  [[B('Ethically Responsible Citizen.'), R(' Commitment to act with integrity and')], [R('concern for the common good.')]],
  [[B('Lifelong Learner.'), R(' Ability to learn independently , reflect on experience')], [R('and keep growing personally and professionally.')]],
];

/** The synthetic two-page VMGO PDF. */
export function makeVmgoPdf() {
  const p1 = [];
  let y = PAGE_H - 72;
  // Gray UNIVERSITY header bar across the table.
  p1.push('0.8 g ' + (LABEL_X - 6) + ' ' + (y - 6) + ' ' + (PAGE_W - 2 * LABEL_X + 12) + ' 20 re f 0 g\n');
  p1.push(textLine(270, y, [B('UNIVERSITY')], 12));
  y -= 30;

  for (const row of ROWS) {
    const top = y;
    row.label.forEach((l, i) => p1.push(textLine(LABEL_X, top - i * LEAD, [B(l)], 10)));
    if (row.numbered) {
      row.lines.forEach((item, n) => {
        item.forEach((runs, i) => {
          if (i === 0) p1.push(textLine(CONTENT_X, y, [R((n + 1) + '.')]));
          p1.push(textLine(CONTENT_X + 16, y, runs));
          y -= LEAD;
        });
      });
    } else {
      for (const runs of row.lines) { p1.push(textLine(CONTENT_X, y, runs)); y -= LEAD; }
    }
    y = Math.min(y, top - row.label.length * LEAD) - 12;
  }

  // GRADUATE ATTRIBUTES starts at the bottom of page 1 and continues on page 2.
  const gaTop = y;
  ['GRADUATE', 'ATTRIBUTES'].forEach((l, i) => p1.push(textLine(LABEL_X, gaTop - i * LEAD, [B(l)], 10)));
  for (const item of ATTRIBUTES_P1) for (const runs of item) { p1.push(textLine(CONTENT_X, y, runs)); y -= LEAD; }
  p1.push(textLine(PAGE_W / 2, 30, [R('1')], 9));   // page number footer

  const p2 = [];
  y = PAGE_H - 72;
  for (const item of ATTRIBUTES_P2) for (const runs of item) { p2.push(textLine(CONTENT_X, y, runs)); y -= LEAD; }

  // A SCHOOL block below — same labels, must NOT be imported.
  y -= 20;
  p2.push('0.8 g ' + (LABEL_X - 6) + ' ' + (y - 6) + ' ' + (PAGE_W - 2 * LABEL_X + 12) + ' 20 re f 0 g\n');
  p2.push(textLine(220, y, [B('SCHOOL OF COMPUTER AND INFORMATION SCIENCES')], 12));
  y -= 30;
  p2.push(textLine(LABEL_X, y, [B('VISION')], 10));
  p2.push(textLine(LABEL_X, y - LEAD, [B('STATEMENT')], 10));
  p2.push(textLine(CONTENT_X, y, [R('The School aims to be a center of excellence in computing.')]));
  p2.push(textLine(PAGE_W / 2, 30, [R('2')], 9));

  return buildPdf([p1.join(''), p2.join('')]);
}

/** A PDF with no text layer — just a filled shape, like a scanned page. */
export function makeScannedPdf() {
  return buildPdf(['0.5 g 72 72 468 648 re f\n']);
}

/** A PDF with text but none of the VMGO labels. */
export function makeUnrelatedPdf() {
  return buildPdf([textLine(72, 700, [R('Quarterly enrollment report for the first semester of the year.')])]);
}
