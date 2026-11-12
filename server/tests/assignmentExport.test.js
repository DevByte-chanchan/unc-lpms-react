/**
 * The Course Assignment export: the table's rows (Archive left out, by code),
 * names in normal case, year levels, notified labels, the file name, and an
 * .xlsx that reads back with the same values.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import xlsx from 'xlsx';
import { exportRecords, exportBaseName, buildAssignmentsXlsx, yearLabel, EXPORT_COLUMNS } from '../utils/assignmentExport.js';

const rows = [
  { id: 2, course_code: 'BIT222L', course_name: 'Web Development 2', year_level: 'SECOND YEAR', faculty_name: 'SAIGE FUENTES', contributors: [], status: 'Active', date_assigned: '2026-11-11T03:00:00Z' },
  { id: 1, course_code: 'BIT121L', course_name: 'Discrete Structures', year_level: '1st Year', faculty_name: 'Alan Turing',
    contributors: [{ faculty_id: 9, faculty_name: 'DELA CRUZ, JUAN' }, { faculty_id: 8, faculty_name: 'Ana Reyes' }],
    sections: [{ faculty_name: 'Alan Turing', sections: ['BIT121L-OBa', 'BIT121L-OBb'] }], status: 'On Leave', date_assigned: '2026-11-10T20:00:00Z' },
  { id: 3, course_code: 'BIT999L', course_name: 'Old', faculty_name: 'X Y', status: 'Archived' },
  { id: 4, course_code: 'BIT300L', course_name: 'No Lead Yet', faculty_name: null, status: 'Unassigned', date_assigned: '2026-11-11' },
];
const delivery = new Map([[1, { lead: { state: 'sent', label: 'Email sent' } }], [2, { lead: { state: 'held', label: 'Invitation held' } }]]);

test('exportRecords: the table rows, in normal case', () => {
  const out = exportRecords(rows, delivery);
  assert.deepEqual(out.map((r) => r['Course Code']), ['BIT121L', 'BIT222L', 'BIT300L'], 'by code; Archived left out');
  assert.deepEqual(Object.keys(out[0]), EXPORT_COLUMNS);
  assert.equal(out[0]['Lead Faculty'], 'Alan Turing');
  assert.equal(out[1]['Lead Faculty'], 'Saige Fuentes', 'ALL CAPS shown in normal case');
  assert.equal(out[0].Contributors, 'Dela Cruz, Juan, Ana Reyes');
  assert.equal(out[0].Sections, 2);
  assert.equal(out[0]['Date Assigned'], 'Nov 11, 2026', 'the day in Manila');
  assert.equal(out[0].Notified, 'Yes (Email sent)');
  assert.equal(out[1].Notified, 'No (Invitation held)');
  assert.equal(out[1]['Year Level'], '2nd Year');
  assert.equal(out[2]['Lead Faculty'], '');
  assert.equal(out[2]['Date Assigned'], '', 'no Lead, no date');
});

test('yearLabel and exportBaseName', () => {
  assert.equal(yearLabel('FOURTH YEAR'), '4th Year');
  assert.equal(yearLabel('3'), '3rd Year');
  assert.equal(yearLabel(''), '');
  assert.equal(exportBaseName('BSIT', '2nd Semester 2026-2027'), 'Course-Assignments_BSIT_2nd-Semester-2026-2027');
});

test('buildAssignmentsXlsx: reads back with the title block and the rows', () => {
  const buf = buildAssignmentsXlsx(exportRecords(rows, delivery), { programCode: 'BSIT', programName: 'Bachelor of Science in Information Technology', termLabel: '2nd Semester 2026-2027' });
  const book = xlsx.read(buf, { type: 'buffer' });
  const aoa = xlsx.utils.sheet_to_json(book.Sheets['Course Assignments'], { header: 1 });
  assert.equal(aoa[0][0], 'UNIVERSITY OF NUEVA CACERES');
  assert.equal(aoa[2][0], '2nd Semester 2026-2027');
  assert.deepEqual(aoa[4], EXPORT_COLUMNS);
  assert.deepEqual(aoa[5].slice(0, 4), ['BIT121L', 'Discrete Structures', '1st Year', 'Alan Turing']);
  assert.equal(aoa.length, 5 + 3);
});
