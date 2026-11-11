// The generated TOS Report, copied from the Registrar's TOS form
// ([TOS] ACT222L FINAL(CASIMERO).docx): same page, header, footer and typography
// as the Learning Plan export (docPageHtml.js), with the TOS form's own header.
//
//   buildTosReportHtml     — the details lines, the TOS table and the signatures,
//                            element by element as on the form.
//
// All numbers come from tosMath.js, so the document and the on-screen TOS
// tables agree. Zero, empty or missing values are empty cells — never "—" or "0".
// Every value is escaped: typed text is shown as text, never as markup.
import { escapeHtml, escapeMultiline } from './sanitize.js';
import { DEFAULT_FORM_INFO } from './formInfo.js';
import { pageHeader, pageFooter, docHead, docFoot, FORM_HEADERS } from './docPageHtml.js';
import { aggregateTos, COGNITIVE_LEVELS, blankIfZero } from './tosMath.js';

const text = (v) => escapeHtml(String(blankIfZero(v)));

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// "2025-05-11" → "MAY 11, 2025" (the form's style); '' when missing.
export const fmtFormDate = (s) => {
  if (!s) return '';
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return String(s).toUpperCase();
  return (MONTHS[m - 1] + ' ' + d + ', ' + y).toUpperCase();
};

export const fmtSize = (bytes) => {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB';
  return (n / (1024 * 1024)).toFixed(1) + ' MB';
};

const formFor = (formInfo) => ({
  ...FORM_HEADERS.tos,
  ...DEFAULT_FORM_INFO.tos,
  ...((formInfo || {}).tos || {}),
});

// "2nd Semester SY 2024-2025" → { semester: "2ND SEMESTER", schoolYear: "2024 - 2025" }
export function splitTerm(tos) {
  const label = String(tos.periodLabel || '');
  const semester = tos.semester || (label.match(/^(.*?(?:Semester|Summer))/i) || [])[1] || '';
  const sy = tos.schoolYear || (label.match(/(\d{4}\s*-\s*\d{4})/) || [])[1] || '';
  return {
    semester: semester.trim().toUpperCase(),
    schoolYear: sy.replace(/\s*-\s*/, ' - '),
  };
}

// The value of a details line: underlined like the form; an empty underline when missing.
const detail = (v) => `<span class="val${v ? '' : ' empty'}">${escapeHtml(v || '')}</span>`;

// Course / Semester on the left, the exam period and School Year on the right.
function detailsLines(tos) {
  const { semester, schoolYear } = splitTerm(tos);
  const course = [tos.courseCode, tos.courseName ? String(tos.courseName).toUpperCase() : ''].filter(Boolean).join(' - ');
  const period = String(tos.examPeriod || '').toLowerCase();
  const mark = (on) => `<span class="mark">${on ? '&#x2713;' : ''}</span>`;
  return `<div class="tos-details first-only">
    <div class="drow">
      <div class="dleft"><span class="lbl">Course:</span>${detail(course)}</div>
      <div class="dright">${mark(period.startsWith('mid'))} Midterm ${mark(period.startsWith('fin'))} Final</div>
    </div>
    <div class="drow">
      <div class="dleft"><span class="lbl">Semester:</span>${detail(semester)}</div>
      <div class="dright"><span class="lbl">School Year</span>${detail(schoolYear)}</div>
    </div>
  </div>`;
}

// One sheet holding everything; REPAG_SCRIPT spreads the rows over as many sheets as needed.
const flowPage = (logo, form, { firstOnly, table, tail }) => `<div class="page flow-pg unpaged">
  ${pageHeader(logo, form)}
  ${firstOnly}
  ${table}
  ${tail ? `<div class="flow-tail">${tail}</div>` : ''}
  ${pageFooter(1, 1, form)}
</div>`;

const docTitle = (tos, what) => `${what} — ${tos.courseCode || ''} ${tos.examPeriod || ''}`.trim();

const FORM_CSS = `
  body { font-size: 10pt; }
  .tos-details { font-size: 10pt; margin: 1mm 0 3mm; }
  .tos-details .drow { display: flex; justify-content: space-between; gap: 12mm; margin-bottom: 1.5mm; }
  .tos-details .dleft { flex: 1; min-width: 0; }
  .tos-details .dright { flex: 0 0 auto; min-width: 70mm; }
  .tos-details .lbl { display: inline-block; min-width: 18mm; }
  .tos-details .dright .lbl { min-width: 24mm; }
  .tos-details .val { text-decoration: underline; text-underline-offset: 2px; }
  .tos-details .val.empty { display: inline-block; min-width: 45mm; border-bottom: 1px solid #000; height: 1.1em; vertical-align: bottom; text-decoration: none; }
  .tos-details .mark { display: inline-block; min-width: 9mm; border-bottom: 1px solid #000; text-align: center; font-weight: bold; height: 1.15em; vertical-align: bottom; line-height: 1.15; }
  table.form-table { font-size: 10pt; table-layout: fixed; }
  table.form-table th, table.form-table td { border: 1px solid #000; padding: 0.6mm 1.2mm; vertical-align: top; background: #fff; color: #000; line-height: 1.25; }
  /* Header words never break mid-word ("Understanding" fits its column, as on the form). */
  table.form-table th { font-weight: normal; text-align: center; vertical-align: middle; font-size: 10pt; padding: 0.8mm 0.4mm; overflow-wrap: normal; word-break: keep-all; }
  table.form-table th.bold { font-weight: bold; }
  table.form-table td.c { text-align: center; vertical-align: middle; }
  table.form-table td.r { text-align: right; }
  table.form-table td.b { font-weight: bold; }
`;

// ─────────────────────────────── TOS Report ───────────────────────────────

// Column widths from the form's table grid (twips): 3645, 1470, 1020, 1260, 6 × 1410 (of 15855).
const REPORT_COLS = [3645, 1470, 1020, 1260, 1410, 1410, 1410, 1410, 1410, 1410];
const colgroup = (cols) => {
  const sum = cols.reduce((s, w) => s + w, 0);
  return '<colgroup>' + cols.map((w) => `<col style="width:${((w / sum) * 100).toFixed(3)}%">`).join('') + '</colgroup>';
};

const REPORT_CSS = FORM_CSS + `
  table.tos-table tr.co-row td { background: #DEEAF6; }
  .sig-block { display: flex; gap: 20mm; margin-top: 4mm; font-size: 10pt; }
  .sig { flex: 1; }
  .sig .name { font-weight: bold; text-transform: uppercase; margin-top: 3mm; min-height: 1.3em; }
  .sig .name.empty { border-bottom: 1px solid #000; width: 70mm; }
  .sig .caption { font-size: 9pt; }
  .sig .date { margin-top: 1.5mm; }
  .sig .date .dv { font-weight: bold; }
  .sig .date .dv.empty { display: inline-block; min-width: 40mm; border-bottom: 1px solid #000; height: 1.1em; vertical-align: bottom; }
`;

function signatureBlock(sig = {}) {
  const prepared = sig.preparedBy || {};
  const approved = sig.approvedBy || {};
  const name = (n) => (n ? `<div class="name">${escapeHtml(String(n).toUpperCase())}</div>` : '<div class="name empty"></div>');
  const date = (d) => {
    const v = fmtFormDate(d);
    return `<div class="date">Date: <span class="dv${v ? '' : ' empty'}">${escapeHtml(v)}</span></div>`;
  };
  return `<div class="sig-block">
    <div class="sig">
      <div>Prepared by:</div>
      ${name(prepared.name)}
      ${date(prepared.date)}
    </div>
    <div class="sig">
      <div>Approved by:</div>
      ${name(approved.name)}
      ${approved.name ? '' : '<div class="caption">Program Head/Dean</div>'}
      ${date(approved.date)}
    </div>
  </div>`;
}

export function buildTosReportHtml(tos, logoDataUrl, { formInfo } = {}) {
  const form = formFor(formInfo);
  const { cos, totals } = aggregateTos(tos.outcomes, tos.questions || tos.items);

  const thead = `<thead>
    <tr>
      <th rowspan="2">COs &amp; ILOs</th>
      <th rowspan="2">No of Hours or Class sessions</th>
      <th rowspan="2">%</th>
      <th rowspan="2">Points</th>
      <th colspan="6" class="bold">Cognitive Levels</th>
    </tr>
    <tr>${COGNITIVE_LEVELS.map((l) => `<th>${l}</th>`).join('')}</tr>
  </thead>`;

  let body = '';
  for (const co of cos) {
    body += `<tr class="co-row keep-next">
      <td class="b">${text(co.co)}</td>
      <td class="b c">${text(co.totalHours)}</td>
      <td class="b c">${text(co.percentage)}</td>
      <td class="b c">${text(co.points)}</td>
      ${'<td></td>'.repeat(6)}
    </tr>`;
    for (const ilo of co.ilos) {
      const label = `<b>${text(ilo.id)}:</b>${ilo.description ? '&nbsp; ' + escapeMultiline(ilo.description) : ''}`;
      body += `<tr class="ilo-row">
        <td>${label}</td>
        <td class="c">${text(ilo.hours)}</td>
        <td class="c">${text(ilo.percentage)}</td>
        <td class="c">${text(ilo.points)}</td>
        ${ilo.cells.map((c) => `<td class="c">${escapeHtml(c.text)}</td>`).join('')}
      </tr>`;
    }
  }
  body += `<tr class="total-row">
    <td class="r">Total</td>
    <td class="c b">${text(totals.hours)}</td>
    <td class="c b">${text(totals.percentage)}</td>
    <td class="c b">${text(totals.formPoints)}</td>
    ${totals.levels.map((p) => `<td class="c b">${text(p)}</td>`).join('')}
  </tr>`;

  return docHead(docTitle(tos, 'TOS Report'), REPORT_CSS)
    + flowPage(logoDataUrl, form, {
      firstOnly: detailsLines(tos),
      table: `<table class="flow-table form-table tos-table">${colgroup(REPORT_COLS)}${thead}<tbody>${body}</tbody></table>`,
      tail: signatureBlock(tos.signatories),
    })
    + docFoot;
}
