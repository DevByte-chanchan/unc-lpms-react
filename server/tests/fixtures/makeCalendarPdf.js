/**
 * A SYNTHETIC text PDF of the 2026-2027 school calendar for the reader tests:
 * the same rows as the sample picture (schoolCalendar2026Rows.js), laid out like
 * it — a "NO. OF SCHOOL DAYS" box on the left (with its own "Summer 2027", the
 * trap), the First Semester block in the middle, Second Semester and Summer
 * stacked on the right. Hand-written PDF operators, the standard Helvetica fonts.
 */
/* global Buffer */
import { CALENDAR_2026_ROWS } from './schoolCalendar2026Rows.js';

const W = 792; // landscape letter
const H = 612;
const SIZE = 7;
const LEAD = 10;

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
// WinAnsi: "ñ" is 0xF1, the same as latin1.
const text = (x, y, s, bold = false, size = SIZE) => 'BT /' + (bold ? 'F2' : 'F1') + ' ' + size + ' Tf ' + x + ' ' + y + ' Td (' + esc(s) + ') Tj ET\n';

function block(b, { x, dateX, eventX, top }) {
  let s = text(x, top, b.title, true, 8);
  s += text(x + 10, top - LEAD, b.rangeText, true);
  let y = top - 2 * LEAD - 4;
  for (const r of b.rows) {
    s += text(dateX, y, r.dateText);
    s += text(eventX, y, r.event, /Examination|Exam |Classes|classes/.test(r.event));
    y -= LEAD;
  }
  return { stream: s, bottom: y };
}

export function makeCalendarPdf(rows = CALENDAR_2026_ROWS) {
  let s = text(250, H - 40, 'ACADEMIC YEAR 2026-2027', true, 14);
  // The school-days box: month / count pairs, and a "Summer 2027" heading.
  let y = H - 40;
  s += text(20, y, 'NO. OF SCHOOL DAYS', true);
  for (const [m, n] of [['Jul', 11], ['Aug', 24], ['Sept', 20], ['Oct', 27], ['Nov', 21]]) { y -= LEAD; s += text(20, y, m + '  ' + n + ' days'); }
  y -= 2 * LEAD;
  s += text(20, y, 'Summer 2027', true);
  for (const [m, n] of [['May', 23], ['Jun', 11]]) { y -= LEAD; s += text(20, y, m + '  ' + n + ' days'); }

  const [first, second, summer] = rows.blocks;
  s += block(first, { x: 190, dateX: 150, eventX: 225, top: H - 90 }).stream;
  const b2 = block(second, { x: 520, dateX: 480, eventX: 555, top: H - 40 });
  s += b2.stream;
  s += block(summer, { x: 560, dateX: 480, eventX: 555, top: b2.bottom - 20 }).stream;

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [5 0 R] /Count 1 >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents 6 0 R >>',
    '<< /Length ' + Buffer.byteLength(s, 'latin1') + ' >>\nstream\n' + s + 'endstream',
  ];
  let out = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, 'latin1'));
    out += (i + 1) + ' 0 obj\n' + body + '\nendobj\n';
  });
  const xref = Buffer.byteLength(out, 'latin1');
  out += 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
  for (const o of offsets) out += String(o).padStart(10, '0') + ' 00000 n \n';
  out += 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
  return Buffer.from(out, 'latin1');
}
