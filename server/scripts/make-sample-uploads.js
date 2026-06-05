/**
 * Generates sample bulk-upload spreadsheets that match the importers:
 *   • sample_courses.xlsx             → uploadCourses (course + prerequisite in one sheet)
 *   • sample_course_offerings.xlsx    → uploadCourseOfferings
 *   • sample_course_assignments.xlsx  → uploadCourseAssignments
 *
 * Run:  node scripts/make-sample-uploads.js   (from the server/ folder)
 * Output lands in ../sample-uploads/.
 */
import xlsx from 'xlsx';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', '..', 'sample-uploads');
fs.mkdirSync(outDir, { recursive: true });

// --- Courses + Prerequisites (single sheet) ---------------------------------
// Required: Course No., Course Title. Everything else optional.
// Prerequisites = other Course No. values in this same file, separated by , ; | or /
const courses = [
  { 'Course No.': 'BIT101', 'Course Title': 'Introduction to Computing',        'Credit': '3 LEC, 0 LAB', 'Contact Hours': '3 Hrs Lec',          'Classification': 'Core Courses',         'CMO': 'CMO No. 25 S. 2015', 'Year Level': 'FIRST YEAR',  'Term': '1st Semester SY 2025-2026', 'Prerequisites': '' },
  { 'Course No.': 'BIT201', 'Course Title': 'Database Systems',                 'Credit': '2 LEC, 1 LAB', 'Contact Hours': '2 Hrs Lec, 3 Hrs Lab', 'Classification': 'Core Courses',         'CMO': 'CMO No. 8 S. 2017',  'Year Level': 'SECOND YEAR', 'Term': '1st Semester SY 2025-2026', 'Prerequisites': 'BIT101' },
  { 'Course No.': 'BIT205', 'Course Title': 'Data Structures and Algorithms',   'Credit': '2 LEC, 1 LAB', 'Contact Hours': '2 Hrs Lec, 3 Hrs Lab', 'Classification': 'Core Courses',         'CMO': 'CMO No. 7 S. 2016',  'Year Level': 'SECOND YEAR', 'Term': '2nd Semester SY 2025-2026', 'Prerequisites': 'BIT101' },
  { 'Course No.': 'BIT302', 'Course Title': 'Web Development II',               'Credit': '2 LEC, 1 LAB', 'Contact Hours': '2 Hrs Lec, 3 Hrs Lab', 'Classification': 'Professional Courses', 'CMO': 'CMO No. 12 S. 2018', 'Year Level': 'THIRD YEAR',  'Term': '1st Semester SY 2025-2026', 'Prerequisites': 'BIT201' },
  { 'Course No.': 'BIT202', 'Course Title': 'Software Engineering',             'Credit': '3 LEC, 0 LAB', 'Contact Hours': '3 Hrs Lec',          'Classification': 'Core Courses',         'CMO': 'CMO No. 9 S. 2017',  'Year Level': 'THIRD YEAR',  'Term': '2nd Semester SY 2025-2026', 'Prerequisites': 'BIT205' },
  { 'Course No.': 'BIT207', 'Course Title': 'Web Security and Performance',     'Credit': '2 LEC, 1 LAB', 'Contact Hours': '2 Hrs Lec, 3 Hrs Lab', 'Classification': 'Elective',             'CMO': 'CMO No. 18 S. 2019', 'Year Level': 'THIRD YEAR',  'Term': '1st Semester SY 2025-2026', 'Prerequisites': 'BIT302; BIT201' },
];

// --- Course Offerings (separate importer) -----------------------------------
// Required: CODE, DESCRIPTION (a.k.a. COURSE TITLE / TITLE). INSTRUCTOR must
// match a Faculty name in the selected period, else it's saved unresolved.
const offerings = [
  { 'CODE': 'BIT101', 'DESCRIPTION': 'Introduction to Computing',      'UNITS': 3, 'TERM': '1st Semester', 'YEAR LEVEL': 'FIRST YEAR',  'INSTRUCTOR': 'Maria Santos' },
  { 'CODE': 'BIT201', 'DESCRIPTION': 'Database Systems',               'UNITS': 3, 'TERM': '1st Semester', 'YEAR LEVEL': 'SECOND YEAR', 'INSTRUCTOR': 'Juan Dela Cruz' },
  { 'CODE': 'BIT302', 'DESCRIPTION': 'Web Development II',             'UNITS': 3, 'TERM': '1st Semester', 'YEAR LEVEL': 'THIRD YEAR',  'INSTRUCTOR': '' },
];

// --- Course Assignments (separate importer) ---------------------------------
// Columns mirror the Course Assignment table: COURSE NO. · COURSE OFFERING ·
// ASSIGNED FACULTY · DATE ASSIGNED. The importer matches COURSE NO. against the
// Course catalog (course_no) and ASSIGNED FACULTY against the period's Faculty
// list; a row is "Verified" when both match and the faculty is Active. DATE
// ASSIGNED is informational — the importer auto-stamps the assignment date on
// upload, so this column is for display parity with the table.
//
// Workflow modelled here: June Arreb Danila (BSIT's Program Head) already has
// the BSIT Course Offerings, and assigns each course to OTHER faculty (the
// Active instructors/professors who'll teach them). He then uploads this file.
const DATE_ASSIGNED = '2027-08-18'; // within the active term (1st Sem 2027-2028)
// YEAR LEVEL mirrors each course's year level in the BSIT Course Offerings; it
// imports onto the assignment row and drives the page's 1st–4th year filter.
const assignments = [
  { 'COURSE NO.': 'BIT201',  'COURSE OFFERING': 'Database Systems',                       'YEAR LEVEL': '2nd Year', 'ASSIGNED FACULTY': 'Marceline Avila',   'DATE ASSIGNED': DATE_ASSIGNED },
  { 'COURSE NO.': 'BIT202',  'COURSE OFFERING': 'Software Engineering',                    'YEAR LEVEL': '3rd Year', 'ASSIGNED FACULTY': 'Dennis Ignacio',    'DATE ASSIGNED': DATE_ASSIGNED },
  { 'COURSE NO.': 'BIT203',  'COURSE OFFERING': 'Mobile Application Development',          'YEAR LEVEL': '3rd Year', 'ASSIGNED FACULTY': 'Bianca G. Reyes',   'DATE ASSIGNED': DATE_ASSIGNED },
  { 'COURSE NO.': 'BIT204',  'COURSE OFFERING': 'Network Security',                        'YEAR LEVEL': '3rd Year', 'ASSIGNED FACULTY': 'Danny B. Casimero', 'DATE ASSIGNED': DATE_ASSIGNED },
  { 'COURSE NO.': 'BIT205',  'COURSE OFFERING': 'Data Structures and Algorithms',          'YEAR LEVEL': '2nd Year', 'ASSIGNED FACULTY': 'Bowen Higgins',     'DATE ASSIGNED': DATE_ASSIGNED },
  { 'COURSE NO.': 'BIT206',  'COURSE OFFERING': 'Introduction to Artificial Intelligence', 'YEAR LEVEL': '3rd Year', 'ASSIGNED FACULTY': 'Saige Fuentes',     'DATE ASSIGNED': DATE_ASSIGNED },
  { 'COURSE NO.': 'BIT207',  'COURSE OFFERING': 'Web Security and Performance',            'YEAR LEVEL': '3rd Year', 'ASSIGNED FACULTY': 'Michael R. Lee',    'DATE ASSIGNED': DATE_ASSIGNED },
  { 'COURSE NO.': 'BIT302',  'COURSE OFFERING': 'Web Development II',                      'YEAR LEVEL': '2nd Year', 'ASSIGNED FACULTY': 'Christine A. Dizon','DATE ASSIGNED': DATE_ASSIGNED },
  { 'COURSE NO.': 'BIT313L', 'COURSE OFFERING': 'Human and Computer Interaction',          'YEAR LEVEL': '3rd Year', 'ASSIGNED FACULTY': 'Harold T. Lim',     'DATE ASSIGNED': DATE_ASSIGNED },
];

function writeBook(rows, sheetName, fileName) {
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(rows);
  xlsx.utils.book_append_sheet(wb, ws, sheetName);
  const file = path.join(outDir, fileName);
  xlsx.writeFile(wb, file);
  console.log('wrote ' + file);
}

writeBook(courses,  'Courses',          'sample_courses.xlsx');
writeBook(offerings, 'Course Offerings', 'sample_course_offerings.xlsx');
writeBook(assignments, 'Course Assignments', 'sample_course_assignments.xlsx');
console.log('Done. Files are in: ' + outDir);
