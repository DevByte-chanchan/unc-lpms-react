// The final course assignment list in the official UNC form layout, for
// Course Assignment > Download > PDF. Same page as the TOS / Syllabus exports
// (docPageHtml.js: landscape 330 × 216 mm, the seal header, REPAG_SCRIPT), with
// its own header lines (university, program, term) and a "Page x of y" footer.
//
// The rows are GET /course-offering-assignments/export?format=json — the same
// rows as the Excel file. Every value is escaped.
import { escapeHtml } from './sanitize.js';
import { pageHeader, docHead, docFoot } from './docPageHtml.js';

const COLUMNS = [
  // [label, share of the width, cell class]
  ['Course Code', 9, ''],
  ['Course Name', 19, ''],
  ['Year Level', 7, 'c'],
  ['Lead Faculty', 13, ''],
  ['Contributors', 15, ''],
  ['Sections', 6, 'c'],
  ['Status', 7, 'c'],
  ['Date Assigned', 9, 'c'],
  ['Notified', 15, ''],
];

const CSS = `
  table.assign-table { font-size: 9pt; table-layout: fixed; }
  table.assign-table th { background: #404040; color: #fff; font-size: 8.5pt; padding: 1mm 1mm; }
  table.assign-table td { padding: 0.8mm 1.2mm; vertical-align: top; }
  table.assign-table td.c { text-align: center; }
  table.assign-table tbody tr:nth-child(even) td { background: #F3F4F6; }
  .meta { display: flex; justify-content: space-between; font-size: 9pt; margin: 0 0 2mm; }
`;

/** The header lines: "UNIVERSITY OF NUEVA CACERES", the list, the program, the term. */
export const assignmentsForm = ({ programCode, programName, termLabel }) => ({
  lines: [
    { text: 'UNIVERSITY OF NUEVA CACERES', size: '11pt', weight: 'bold' },
    { text: 'COURSE ASSIGNMENTS', size: '11pt', weight: 'bold' },
    { text: [programCode, programName].filter(Boolean).join(' — '), size: '10pt', weight: 'normal' },
    { text: termLabel || '', size: '10pt', weight: 'normal' },
  ],
  control: { size: '9pt', labelWeight: 'bold', valueWeight: 'normal', align: 'center', missing: '', width: '130px' },
  docControlNo: '',
});

const footer = `<div class="doc-footer" style="position:absolute; left:85px; right:85px; bottom:26px; display:flex; justify-content:flex-end; padding-top:4px; font-size:8.5pt; font-family:Arial,Helvetica,sans-serif;">
  <span>Page <span class="pgno">1</span> of <span class="pgtot">1</span></span>
</div>`;

/**
 * @param data  { programCode, programName, termLabel, rows: [{ 'Course Code': …, … }] }
 * @param logo  the seal as a data: URL (sealDataUrl.js)
 * @param generatedAt  when (shown under the header)
 */
export function buildAssignmentsPdfHtml(data, logo, { generatedAt = new Date() } = {}) {
  const rows = (data && data.rows) || [];
  const form = assignmentsForm(data || {});
  const colgroup = '<colgroup>' + COLUMNS.map(([, w]) => `<col style="width:${w}%">`).join('') + '</colgroup>';
  const thead = '<thead><tr>' + COLUMNS.map(([label]) => `<th>${escapeHtml(label)}</th>`).join('') + '</tr></thead>';
  const body = rows.length
    ? rows.map((r) => '<tr>' + COLUMNS.map(([label, , cls]) => `<td${cls ? ` class="${cls}"` : ''}>${escapeHtml(String(r[label] ?? ''))}</td>`).join('') + '</tr>').join('')
    : `<tr><td colspan="${COLUMNS.length}" class="c">No course assignments.</td></tr>`;
  const when = generatedAt.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' });
  const meta = `<div class="meta first-only"><span>${rows.length} course${rows.length === 1 ? '' : 's'}</span><span>Generated ${escapeHtml(when)}</span></div>`;
  const title = 'Course Assignments — ' + [data && data.programCode, data && data.termLabel].filter(Boolean).join(' — ');
  return docHead(title, CSS)
    + `<div class="page flow-pg unpaged">
  ${pageHeader(logo, form)}
  ${meta}
  <table class="flow-table assign-table">${colgroup}${thead}<tbody>${body}</tbody></table>
  ${footer}
</div>`
    + docFoot;
}
