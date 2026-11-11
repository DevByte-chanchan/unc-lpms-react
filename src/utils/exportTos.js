// Build the OVPAA viewer's file object for one approved TOS: the generated
// TOS Report in the official UNC form layout (one document, no tabs).
//
// Same pattern as the Learning Plan export (exportSyllabus.js on
// feature/learning-plan-submissions-management-v2): get the data → build the
// HTML → Blob → object URL → a DocumentViewerModal file object.
//
// Data source: the TOS module's API (/api/courses/:code/outcomes, …/:period/items,
// …/:period/status, …/:period/attachments) is not part of this app yet, so the
// TOS comes from the repository row's `tos` (data/mockTosContent.js), which has
// the same shape. When the API lands, load it in loadTos() and nothing else changes.
//
// The caller owns the blob URLs: call revokeExportFiles(file) when the viewer closes.
import { buildTosReportHtml } from './tosPdfHtml.js';
import { fetchFormInfo } from './formSettings.js';
import { getSealDataUrl } from './sealDataUrl.js';
import { mockTOS } from '../data/mockApprovedSubmissions.js';

export const NOT_APPROVED = "This TOS hasn't been approved yet.";

const fileCode = (s) => String(s || '').replace(/[^A-Za-z0-9-]+/g, '');

// "1st Semester 2026-2027" → "1st Semester SY 2026-2027" (the form's wording).
const withSY = (label) => String(label || '').replace(/^(.*?(?:Semester|Summer))\s+(?!SY\b)(\d{4}\s*-\s*\d{4})$/i, '$1 SY $2');

async function loadTos(row, courseCode) {
  const source = row || mockTOS.find((r) => r.course_id === courseCode);
  if (!source || !source.tos) throw new Error('No TOS was found for ' + (courseCode || 'this course') + '.');
  return source;
}

const htmlUrl = (html) => URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));

/**
 * { row?, courseCode?, period?, logoDataUrl?, formInfo? } → viewer file object
 *   { title, kicker, course_id, course_name, period_label, file_name, file_url }
 */
export async function buildTosExportFiles({ row, courseCode, period, logoDataUrl, formInfo } = {}) {
  const source = await loadTos(row, courseCode);
  const t = source.tos;
  if (t.status !== 'approved' || !source.approved_date) throw new Error(NOT_APPROVED);

  const [logo, forms] = await Promise.all([
    logoDataUrl ? Promise.resolve(logoDataUrl) : getSealDataUrl(),
    formInfo ? Promise.resolve(formInfo) : fetchFormInfo(),
  ]);

  const code = source.course_id;
  const exam = period || t.examPeriod || 'Midterm';
  // A TOS with its own term (the Registrar's ACT222L sample) keeps it; otherwise the row's term.
  const rowTerm = source.period_label && source.period_label !== '—' ? withSY(source.period_label) : '';
  const ownTerm = t.semester ? `${t.semester} SY ${t.schoolYear || ''}`.trim() : '';
  const tos = {
    ...t,
    courseCode: code,
    courseName: source.course_name,
    program: source.program,
    periodLabel: ownTerm || rowTerm,
    examPeriod: exam,
    faculty: source.instructor_name,
    submittedAt: source.submission_date,
    approvedAt: source.approved_date,
  };

  const fc = fileCode(code);
  const fe = fileCode(exam);
  return {
    title: `TOS ${code} — ${exam}`,
    kicker: 'Table of Specification · Approved',
    course_id: code,
    course_name: source.course_name,
    period_label: [tos.yearLevel, tos.periodLabel].filter(Boolean).join(' — '),
    file_name: `TOS-Report_${fc}_${fe}.pdf`,
    file_url: htmlUrl(buildTosReportHtml(tos, logo, { formInfo: forms })),
  };
}

// Frees a viewer file object's generated document (its `file_url`, and any `documents`).
export function revokeExportFiles(file) {
  if (file && typeof file.file_url === 'string' && file.file_url.startsWith('blob:')) URL.revokeObjectURL(file.file_url);
  for (const d of (file && file.documents) || []) {
    if (d && typeof d.file_url === 'string' && d.file_url.startsWith('blob:')) URL.revokeObjectURL(d.file_url);
  }
}
