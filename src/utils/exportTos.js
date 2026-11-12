// Build the viewer's file object for one approved TOS: the generated
// TOS Report in the official UNC form layout (matching the OVPAA preview).
import { buildTosReportHtml } from './tosPdfHtml.js';
import { fetchFormInfo } from './formSettings.js';
import { getSealDataUrl } from './sealDataUrl.js';
import { ACT222L_TOS } from '../data/tosFixtures.js';
import { buildMockTos, yearLevelFor } from '../data/mockTosContent.js';

export const NOT_APPROVED = "This TOS hasn't been approved yet.";

const fileCode = (s) => String(s || '').replace(/[^A-Za-z0-9-]+/g, '');

// "1st Semester 2026-2027" → "1st Semester SY 2026-2027" (the form's wording).
const withSY = (label) => String(label || '').replace(/^(.*?(?:Semester|Summer))\s+(?!SY\b)(\d{4}\s*-\s*\d{4})$/i, '$1 SY $2');

const htmlUrl = (html) => URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));

/**
 * { row?, courseCode?, courseName?, period?, logoDataUrl?, formInfo?, outcomes?, questions?, semester?, schoolYear?, signatories? } → viewer file object
 *   { title, kicker, course_id, course_name, period_label, file_name, file_url }
 */
export async function buildTosExportFiles({
  row,
  courseCode,
  courseName,
  period,
  logoDataUrl,
  formInfo,
  outcomes,
  questions,
  semester,
  schoolYear,
  signatories,
  instructorName,
} = {}) {
  const code = (courseCode || row?.course_id || row?.code || 'ACT222L').trim();
  const name = (courseName || row?.course_name || row?.name || 'Web Development II').trim();
  const safeCode = code.replace(/\s+/g, '');

  let tosData;
  let source;

  if (row && row.tos) {
    source = row;
    tosData = row.tos;
  } else if (outcomes && outcomes.length) {
    // If live outcomes were passed from the editor
    tosData = {
      status: 'approved',
      courseCode: code,
      courseName: name,
      examPeriod: period || 'Final',
      semester: semester || '2nd Semester',
      schoolYear: schoolYear || '2024-2025',
      yearLevel: yearLevelFor(code) || 'SECOND YEAR',
      outcomes,
      questions: questions || [],
      signatories: signatories || {
        preparedBy: { name: instructorName || 'Danny Boy M. Casimero', date: new Date().toISOString().slice(0, 10) },
        approvedBy: { name: 'June Arreb Danila', date: new Date().toISOString().slice(0, 10) },
      },
    };
    source = {
      course_id: code,
      course_name: name,
      instructor_name: instructorName || '',
      submission_date: tosData.signatories.preparedBy.date,
      approved_date: tosData.signatories.approvedBy.date,
      period_label: `${tosData.semester} SY ${tosData.schoolYear}`,
      tos: tosData,
    };
  } else if (safeCode === 'ACT222L' || safeCode.includes('ACT222L')) {
    tosData = JSON.parse(JSON.stringify(ACT222L_TOS));
    tosData.yearLevel = 'SECOND YEAR';
    source = {
      course_id: 'ACT222L',
      course_name: 'Web Development II',
      instructor_name: '',
      submission_date: '2025-05-11',
      approved_date: '2025-05-16',
      period_label: '2nd Semester SY 2024-2025',
      tos: tosData,
    };
  } else {
    tosData = buildMockTos({
      courseId: code,
      courseName: name,
      dept: 'SCIS',
      instructor: instructorName || row?.instructor || 'Danny Boy M. Casimero',
      submitted: row?.dateSubmitted || '2025-05-11',
      phAccepted: row?.dateStatus || '2025-05-16',
      coAssignId: 1,
    });
    source = {
      course_id: code,
      course_name: name,
      instructor_name: instructorName || row?.instructor || '',
      submission_date: row?.dateSubmitted || '2025-05-11',
      approved_date: row?.dateStatus || '2025-05-16',
      period_label: row?.period_label || `${semester || '1st Semester'} SY ${schoolYear || '2026-2027'}`,
      tos: tosData,
    };
  }

  const [logo, forms] = await Promise.all([
    logoDataUrl ? Promise.resolve(logoDataUrl) : getSealDataUrl(),
    formInfo ? Promise.resolve(formInfo) : fetchFormInfo(),
  ]);

  const exam = period || tosData.examPeriod || 'Final';
  const rowTerm = source.period_label && source.period_label !== '—' ? withSY(source.period_label) : '';
  const ownTerm = tosData.semester ? `${tosData.semester} SY ${tosData.schoolYear || ''}`.trim() : '';

  const finalTos = {
    ...tosData,
    courseCode: code,
    courseName: name,
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
    course_name: name,
    period_label: [finalTos.yearLevel, finalTos.periodLabel].filter(Boolean).join(' — '),
    file_name: `TOS-Report_${fc}_${fe}.pdf`,
    file_url: htmlUrl(buildTosReportHtml(finalTos, logo, { formInfo: forms })),
  };
}

// Frees a viewer file object's generated document (its `file_url`, and any `documents`).
export function revokeExportFiles(file) {
  if (file && typeof file.file_url === 'string' && file.file_url.startsWith('blob:')) URL.revokeObjectURL(file.file_url);
  for (const d of (file && file.documents) || []) {
    if (d && typeof d.file_url === 'string' && d.file_url.startsWith('blob:')) URL.revokeObjectURL(d.file_url);
  }
}
