/**
 * The final course assignment list, as rows for Course Assignment > Download:
 * the Excel file (built here with SheetJS) and the PDF (built in the browser
 * from the same rows, format=json), so both always agree with each other.
 *
 * Columns: Course Code · Course Name · Year Level · Lead Faculty ·
 * Contributors · Sections · Status · Date Assigned · Notified
 *
 * The rows are the table's: the program's assignments that are not in the
 * Archive (Inactive / Archived), by course code. Names in normal case.
 */
import xlsx from 'xlsx';
import { displayName } from './nameCase.js';
import { sectionCount } from './teachingLoad.js';

export const EXPORT_COLUMNS = ['Course Code', 'Course Name', 'Year Level', 'Lead Faculty', 'Contributors', 'Sections', 'Status', 'Date Assigned', 'Notified'];
export const ARCHIVED_STATUSES = ['Inactive', 'Archived'];
const NOTIFIED_STATES = ['sent', 'told', 'bell'];

// "FIRST YEAR" / "1st Year" → "1st Year"
const YEAR_WORDS = { first: '1st Year', second: '2nd Year', third: '3rd Year', fourth: '4th Year', fifth: '5th Year' };
export function yearLabel(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  const w = s.toLowerCase().match(/\b(first|second|third|fourth|fifth)\b/);
  if (w) return YEAR_WORDS[w[1]];
  const n = s.match(/\b([1-5])(?:st|nd|rd|th)?\b/);
  return n ? YEAR_WORDS[['', 'first', 'second', 'third', 'fourth', 'fifth'][Number(n[1])]] : s;
}

/** "Nov 11, 2026" in Manila, as the table shows it; '' when missing. */
export function dateLabel(v) {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' });
}

/** "Yes (Email sent)" / "No (Invitation held)" from the Lead's delivery status. */
export function notifiedLabel(lead) {
  if (!lead) return '';
  return (NOTIFIED_STATES.includes(lead.state) ? 'Yes' : 'No') + (lead.label ? ' (' + lead.label + ')' : '');
}

/**
 * @param rows      plain assignment rows (contributors / sections parsed)
 * @param delivery  Map row.id → { lead } (services/assignmentDelivery.js deliveryFor)
 * @returns [{ 'Course Code': …, … }] in EXPORT_COLUMNS order
 */
export function exportRecords(rows, delivery = new Map()) {
  return (rows || [])
    .filter((r) => !ARCHIVED_STATUSES.includes(r.status))
    .sort((a, b) => String(a.course_code).localeCompare(String(b.course_code)))
    .map((r) => {
      const contributors = (Array.isArray(r.contributors) ? r.contributors : [])
        .map((c) => (c && c.faculty_name ? displayName(c.faculty_name) : null)).filter(Boolean);
      const d = delivery.get(r.id);
      return {
        'Course Code': r.course_code || '',
        'Course Name': r.course_name || '',
        'Year Level': yearLabel(r.year_level),
        'Lead Faculty': r.faculty_name ? displayName(r.faculty_name) : '',
        Contributors: contributors.join(', '),
        Sections: sectionCount(r) || '',
        Status: r.status || '',
        'Date Assigned': r.faculty_name ? dateLabel(r.date_assigned) : '',
        Notified: r.faculty_name ? notifiedLabel(d && d.lead) : '',
      };
    });
}

/** "Course-Assignments_BSIT_2nd-Semester-2026-2027" (no extension). */
export function exportBaseName(programCode, termLabel) {
  const part = (s) => String(s || '').trim().replace(/[^A-Za-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return ['Course-Assignments', part(programCode) || 'Program', part(termLabel) || 'Term'].join('_');
}

/** The .xlsx: a title block (university, program, term), then the table. */
export function buildAssignmentsXlsx(records, { programCode = '', programName = '', termLabel = '' } = {}) {
  const title = [
    ['UNIVERSITY OF NUEVA CACERES'],
    ['Course Assignments' + (programCode ? ' — ' + programCode : '') + (programName ? ' (' + programName + ')' : '')],
    [termLabel],
    [],
  ];
  const sheet = xlsx.utils.aoa_to_sheet(title);
  xlsx.utils.sheet_add_json(sheet, records, { header: EXPORT_COLUMNS, origin: title.length });
  sheet['!cols'] = [{ wch: 12 }, { wch: 42 }, { wch: 10 }, { wch: 26 }, { wch: 34 }, { wch: 9 }, { wch: 12 }, { wch: 14 }, { wch: 26 }];
  const book = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(book, sheet, 'Course Assignments');
  return xlsx.write(book, { type: 'buffer', bookType: 'xlsx' });
}
