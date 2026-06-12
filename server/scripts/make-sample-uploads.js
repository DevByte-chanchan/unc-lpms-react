/**
 * Generates realistic, cross-consistent sample bulk-upload spreadsheets — one
 * per importer in the app. The data is internally consistent (program heads,
 * course instructors and assigned faculty all refer to people in the Faculty
 * sheet; course codes line up across catalog / offerings / assignments /
 * consultants), so uploading them in order yields a fully verified dataset.
 *
 *   sample_departments.xlsx          → uploadDepartments
 *   sample_faculty.xlsx              → uploadFaculty
 *   sample_programs.xlsx             → uploadPrograms          (program head ↔ Faculty)
 *   sample_courses.xlsx              → uploadCourses           (catalog: Course Offerings page)
 *   sample_course_offerings.xlsx     → uploadCourseOfferings
 *   sample_industry_consultants.xlsx → uploadConsultants       (assigned course ↔ offerings)
 *   sample_course_assignments.xlsx   → uploadCourseAssignments (course ↔ catalog, faculty ↔ Faculty)
 *
 * Recommended upload order (so every row matches its master list and verifies):
 *   1) Departments  2) Faculty  3) Programs  4) Courses + Course Offerings
 *   5) Industry Consultants  6) Course Assignments
 *
 * Run:  node scripts/make-sample-uploads.js   (from the server/ folder)
 * Output lands in ../sample-uploads/. Close the files in Excel first, or any
 * open one is skipped with a warning (the rest still regenerate).
 */
import xlsx from 'xlsx';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', '..', 'sample-uploads');
fs.mkdirSync(outDir, { recursive: true });

const TERM = '1st Semester SY 2027-2028'; // matches the active term in the demo DB
const DATE_ASSIGNED = '2027-08-18';        // within that term

// --- Departments ------------------------------------------------------------
// Required: Name, Code. Optional: Dean.
const departments = [
  { 'Name': 'College of Computer Studies',         'Code': 'CCS', 'Dean': 'Dr. Evelyn S. Marquez' },
  { 'Name': 'College of Engineering',              'Code': 'COE', 'Dean': 'Engr. Ramon T. Villanueva' },
  { 'Name': 'College of Business and Accountancy', 'Code': 'CBA', 'Dean': 'Dr. Teresita L. Gomez' },
  { 'Name': 'College of Arts and Sciences',        'Code': 'CAS', 'Dean': 'Dr. Lourdes A. Bautista' },
];

// --- Faculty ----------------------------------------------------------------
// Required: Name, Role. Optional: Department (matched to the Department list),
// Status (defaults Active), Sex, Birthdate, Email, Contact Number.
// Includes every program head + every instructor referenced elsewhere, plus a
// couple of non-Active rows to exercise On Leave / Inactive statuses.
const CCS = 'College of Computer Studies';
const faculty = [
  // Program heads (names match the Programs sheet's Program Head column)
  { 'Name': 'June Arreb Danila',  'Role': 'Program Head',        'Department': CCS,                      'Status': 'Active',   'Sex': 'Male',   'Birthdate': '1985-03-14', 'Email': 'jdanila@unc.edu.ph',   'Contact Number': '0917 555 0101' },
  { 'Name': 'Alan Turing',        'Role': 'Program Head',        'Department': CCS,                      'Status': 'Active',   'Sex': 'Male',   'Birthdate': '1982-06-23', 'Email': 'aturing@unc.edu.ph',   'Contact Number': '0917 555 0102' },
  { 'Name': 'Sarah Jenkins',      'Role': 'Program Head',        'Department': CCS,                      'Status': 'Active',   'Sex': 'Female', 'Birthdate': '1987-09-02', 'Email': 'sjenkins@unc.edu.ph',  'Contact Number': '0917 555 0103' },
  { 'Name': 'Thomas Bayes',       'Role': 'Program Head',        'Department': CCS,                      'Status': 'Active',   'Sex': 'Male',   'Birthdate': '1980-11-18', 'Email': 'tbayes@unc.edu.ph',    'Contact Number': '0917 555 0104' },
  { 'Name': 'Margaret Hamilton',  'Role': 'Program Head',        'Department': CCS,                      'Status': 'Active',   'Sex': 'Female', 'Birthdate': '1986-01-27', 'Email': 'mhamilton@unc.edu.ph', 'Contact Number': '0917 555 0105' },
  { 'Name': 'John Backus',        'Role': 'Program Head',        'Department': CCS,                      'Status': 'Active',   'Sex': 'Male',   'Birthdate': '1979-07-05', 'Email': 'jbackus@unc.edu.ph',   'Contact Number': '0917 555 0106' },
  { 'Name': 'Robert Noyce',       'Role': 'Program Head',        'Department': 'College of Engineering','Status': 'Active',   'Sex': 'Male',   'Birthdate': '1981-04-30', 'Email': 'rnoyce@unc.edu.ph',    'Contact Number': '0917 555 0107' },
  // Instructors / professors (assigned to courses + offerings below)
  { 'Name': 'Danny B. Casimero',  'Role': 'Professor',           'Department': CCS,                      'Status': 'Active',   'Sex': 'Male',   'Birthdate': '1976-05-22', 'Email': 'dcasimero@unc.edu.ph', 'Contact Number': '0918 555 0108' },
  { 'Name': 'Dennis Ignacio',     'Role': 'Associate Professor', 'Department': CCS,                      'Status': 'Active',   'Sex': 'Male',   'Birthdate': '1984-02-19', 'Email': 'dignacio@unc.edu.ph',  'Contact Number': '0918 555 0109' },
  { 'Name': 'Michael R. Lee',     'Role': 'Associate Professor', 'Department': CCS,                      'Status': 'Active',   'Sex': 'Male',   'Birthdate': '1983-09-15', 'Email': 'mlee@unc.edu.ph',      'Contact Number': '0918 555 0110' },
  { 'Name': 'Marceline Avila',    'Role': 'Assistant Professor', 'Department': CCS,                      'Status': 'Active',   'Sex': 'Female', 'Birthdate': '1990-08-12', 'Email': 'mavila@unc.edu.ph',    'Contact Number': '0918 555 0111' },
  { 'Name': 'Saige Fuentes',      'Role': 'Assistant Professor', 'Department': CCS,                      'Status': 'Active',   'Sex': 'Female', 'Birthdate': '1991-03-28', 'Email': 'sfuentes@unc.edu.ph',  'Contact Number': '0918 555 0112' },
  { 'Name': 'Harold T. Lim',      'Role': 'Assistant Professor', 'Department': CCS,                      'Status': 'Active',   'Sex': 'Male',   'Birthdate': '1988-11-21', 'Email': 'hlim@unc.edu.ph',      'Contact Number': '0918 555 0113' },
  { 'Name': 'Bianca G. Reyes',    'Role': 'Instructor',          'Department': CCS,                      'Status': 'Active',   'Sex': 'Female', 'Birthdate': '1993-12-03', 'Email': 'breyes@unc.edu.ph',    'Contact Number': '0918 555 0114' },
  { 'Name': 'Bowen Higgins',      'Role': 'Instructor',          'Department': CCS,                      'Status': 'Active',   'Sex': 'Male',   'Birthdate': '1994-10-09', 'Email': 'bhiggins@unc.edu.ph',  'Contact Number': '0918 555 0115' },
  { 'Name': 'Christine A. Dizon', 'Role': 'Instructor',          'Department': CCS,                      'Status': 'Active',   'Sex': 'Female', 'Birthdate': '1992-06-07', 'Email': 'cdizon@unc.edu.ph',    'Contact Number': '0918 555 0116' },
  { 'Name': 'Gregorio P. Santos', 'Role': 'Professor',           'Department': CCS,                      'Status': 'On Leave', 'Sex': 'Male',   'Birthdate': '1975-01-10', 'Email': 'gsantos@unc.edu.ph',   'Contact Number': '0919 555 0117' },
  { 'Name': 'Maria Elena Cruz',   'Role': 'Instructor',          'Department': CCS,                      'Status': 'Inactive', 'Sex': 'Female', 'Birthdate': '1989-04-16', 'Email': 'mecruz@unc.edu.ph',    'Contact Number': '0919 555 0118' },
];

// --- Programs ---------------------------------------------------------------
// Required: Code, Name. Program Head is matched to the Faculty list (honorifics
// are stripped, so "Dr. Alan Turing" still matches "Alan Turing").
const programs = [
  { 'Code': 'BSIT', 'Name': 'Bachelor of Science in Information Technology', 'Program Head': 'June Arreb Danila', 'Status': 'Active' },
  { 'Code': 'BSCS', 'Name': 'Bachelor of Science in Computer Science',       'Program Head': 'Alan Turing',       'Status': 'Active' },
  { 'Code': 'BSIS', 'Name': 'Bachelor of Science in Information Systems',    'Program Head': 'Sarah Jenkins',     'Status': 'Active' },
  { 'Code': 'BSDA', 'Name': 'Bachelor of Science in Data Analytics',        'Program Head': 'Thomas Bayes',      'Status': 'Active' },
  { 'Code': 'BSSE', 'Name': 'Bachelor of Science in Software Engineering',  'Program Head': 'Margaret Hamilton', 'Status': 'Active' },
  { 'Code': 'BSCE', 'Name': 'Bachelor of Science in Computer Engineering',  'Program Head': 'Robert Noyce',      'Status': 'Active' },
  { 'Code': 'ACT',  'Name': 'Associate in Computer Technology',             'Program Head': 'John Backus',       'Status': 'Active' },
];

// --- Courses (catalog — uploaded on the Course Offerings page) --------------
// Required: Course No., Course Title. Program is matched (by code/name) to a
// program in the term. Prerequisites reference other Course No. values here.
const courses = [
  { 'Program': 'BSIT', 'Course No.': 'BIT101',  'Course Title': 'Introduction to Computing',      'Credit': '3 LEC, 0 LAB', 'Contact Hours': '3 Hrs Lec',            'Classification': 'Core Courses',         'CMO': 'CMO No. 25 S. 2015', 'Year Level': 'FIRST YEAR',  'Term': TERM, 'Prerequisites': '' },
  { 'Program': 'BSIT', 'Course No.': 'BIT102',  'Course Title': 'Computer Programming 1',         'Credit': '2 LEC, 1 LAB', 'Contact Hours': '2 Hrs Lec, 3 Hrs Lab', 'Classification': 'Core Courses',         'CMO': 'CMO No. 25 S. 2015', 'Year Level': 'FIRST YEAR',  'Term': TERM, 'Prerequisites': '' },
  { 'Program': 'BSIT', 'Course No.': 'BIT201',  'Course Title': 'Database Systems',               'Credit': '2 LEC, 1 LAB', 'Contact Hours': '2 Hrs Lec, 3 Hrs Lab', 'Classification': 'Core Courses',         'CMO': 'CMO No. 8 S. 2017',  'Year Level': 'SECOND YEAR', 'Term': TERM, 'Prerequisites': 'BIT102' },
  { 'Program': 'BSIT', 'Course No.': 'BIT202',  'Course Title': 'Object-Oriented Programming',    'Credit': '2 LEC, 1 LAB', 'Contact Hours': '2 Hrs Lec, 3 Hrs Lab', 'Classification': 'Core Courses',         'CMO': 'CMO No. 8 S. 2017',  'Year Level': 'SECOND YEAR', 'Term': TERM, 'Prerequisites': 'BIT102' },
  { 'Program': 'BSIT', 'Course No.': 'BIT205',  'Course Title': 'Data Structures and Algorithms', 'Credit': '2 LEC, 1 LAB', 'Contact Hours': '2 Hrs Lec, 3 Hrs Lab', 'Classification': 'Core Courses',         'CMO': 'CMO No. 7 S. 2016',  'Year Level': 'SECOND YEAR', 'Term': TERM, 'Prerequisites': 'BIT102' },
  { 'Program': 'BSIT', 'Course No.': 'BIT301',  'Course Title': 'Web Development',                'Credit': '2 LEC, 1 LAB', 'Contact Hours': '2 Hrs Lec, 3 Hrs Lab', 'Classification': 'Professional Courses', 'CMO': 'CMO No. 12 S. 2018', 'Year Level': 'THIRD YEAR',  'Term': TERM, 'Prerequisites': 'BIT201' },
  { 'Program': 'BSIT', 'Course No.': 'BIT302',  'Course Title': 'Web Development II',             'Credit': '2 LEC, 1 LAB', 'Contact Hours': '2 Hrs Lec, 3 Hrs Lab', 'Classification': 'Professional Courses', 'CMO': 'CMO No. 12 S. 2018', 'Year Level': 'THIRD YEAR',  'Term': TERM, 'Prerequisites': 'BIT301' },
  { 'Program': 'BSIT', 'Course No.': 'BIT303',  'Course Title': 'Software Engineering',           'Credit': '3 LEC, 0 LAB', 'Contact Hours': '3 Hrs Lec',            'Classification': 'Professional Courses', 'CMO': 'CMO No. 9 S. 2017',  'Year Level': 'THIRD YEAR',  'Term': TERM, 'Prerequisites': 'BIT202' },
  { 'Program': 'BSIT', 'Course No.': 'BIT304',  'Course Title': 'Network Security',              'Credit': '2 LEC, 1 LAB', 'Contact Hours': '2 Hrs Lec, 3 Hrs Lab', 'Classification': 'Professional Courses', 'CMO': 'CMO No. 20 S. 2020', 'Year Level': 'THIRD YEAR',  'Term': TERM, 'Prerequisites': 'BIT201' },
  { 'Program': 'BSIT', 'Course No.': 'BIT313L', 'Course Title': 'Human and Computer Interaction', 'Credit': '2 LEC, 1 LAB', 'Contact Hours': '2 Hrs Lec, 3 Hrs Lab', 'Classification': 'Professional Courses', 'CMO': 'CMO No. 25 S. 2015', 'Year Level': 'THIRD YEAR',  'Term': TERM, 'Prerequisites': 'BIT202' },
  { 'Program': 'BSIT', 'Course No.': 'BIT401',  'Course Title': 'Capstone Project 1',             'Credit': '3 LEC, 0 LAB', 'Contact Hours': '3 Hrs Lec',            'Classification': 'Professional Courses', 'CMO': 'CMO No. 25 S. 2015', 'Year Level': 'FOURTH YEAR', 'Term': TERM, 'Prerequisites': 'BIT303' },
];

// --- Course Offerings (course_offerings table) ------------------------------
// Required: CODE, DESCRIPTION. INSTRUCTOR is matched to a Faculty name in the
// period (else saved unresolved). CREDIT + CONTACT HOURS mirror the catalog so
// the sheet carries the full course info (UNITS = their lecture+lab total).
// This term's offered subset of the catalog.
const offerings = [
  { 'CODE': 'BIT101',  'DESCRIPTION': 'Introduction to Computing',      'CREDIT': '3 LEC, 0 LAB', 'CONTACT HOURS': '3 Hrs Lec',            'UNITS': 3, 'TERM': '1st Semester', 'YEAR LEVEL': 'FIRST YEAR',  'INSTRUCTOR': 'Bianca G. Reyes' },
  { 'CODE': 'BIT102',  'DESCRIPTION': 'Computer Programming 1',         'CREDIT': '2 LEC, 1 LAB', 'CONTACT HOURS': '2 Hrs Lec, 3 Hrs Lab', 'UNITS': 3, 'TERM': '1st Semester', 'YEAR LEVEL': 'FIRST YEAR',  'INSTRUCTOR': 'Bowen Higgins' },
  { 'CODE': 'BIT201',  'DESCRIPTION': 'Database Systems',               'CREDIT': '2 LEC, 1 LAB', 'CONTACT HOURS': '2 Hrs Lec, 3 Hrs Lab', 'UNITS': 3, 'TERM': '1st Semester', 'YEAR LEVEL': 'SECOND YEAR', 'INSTRUCTOR': 'Marceline Avila' },
  { 'CODE': 'BIT202',  'DESCRIPTION': 'Object-Oriented Programming',    'CREDIT': '2 LEC, 1 LAB', 'CONTACT HOURS': '2 Hrs Lec, 3 Hrs Lab', 'UNITS': 3, 'TERM': '1st Semester', 'YEAR LEVEL': 'SECOND YEAR', 'INSTRUCTOR': 'Christine A. Dizon' },
  { 'CODE': 'BIT205',  'DESCRIPTION': 'Data Structures and Algorithms', 'CREDIT': '2 LEC, 1 LAB', 'CONTACT HOURS': '2 Hrs Lec, 3 Hrs Lab', 'UNITS': 3, 'TERM': '1st Semester', 'YEAR LEVEL': 'SECOND YEAR', 'INSTRUCTOR': 'Dennis Ignacio' },
  { 'CODE': 'BIT301',  'DESCRIPTION': 'Web Development',                'CREDIT': '2 LEC, 1 LAB', 'CONTACT HOURS': '2 Hrs Lec, 3 Hrs Lab', 'UNITS': 3, 'TERM': '1st Semester', 'YEAR LEVEL': 'THIRD YEAR',  'INSTRUCTOR': 'Saige Fuentes' },
  { 'CODE': 'BIT303',  'DESCRIPTION': 'Software Engineering',           'CREDIT': '3 LEC, 0 LAB', 'CONTACT HOURS': '3 Hrs Lec',            'UNITS': 3, 'TERM': '1st Semester', 'YEAR LEVEL': 'THIRD YEAR',  'INSTRUCTOR': 'Danny B. Casimero' },
  { 'CODE': 'BIT304',  'DESCRIPTION': 'Network Security',              'CREDIT': '2 LEC, 1 LAB', 'CONTACT HOURS': '2 Hrs Lec, 3 Hrs Lab', 'UNITS': 3, 'TERM': '1st Semester', 'YEAR LEVEL': 'THIRD YEAR',  'INSTRUCTOR': 'Michael R. Lee' },
  { 'CODE': 'BIT313L', 'DESCRIPTION': 'Human and Computer Interaction', 'CREDIT': '2 LEC, 1 LAB', 'CONTACT HOURS': '2 Hrs Lec, 3 Hrs Lab', 'UNITS': 3, 'TERM': '1st Semester', 'YEAR LEVEL': 'THIRD YEAR',  'INSTRUCTOR': 'Harold T. Lim' },
  { 'CODE': 'BIT401',  'DESCRIPTION': 'Capstone Project 1',            'CREDIT': '3 LEC, 0 LAB', 'CONTACT HOURS': '3 Hrs Lec',            'UNITS': 3, 'TERM': '1st Semester', 'YEAR LEVEL': 'FOURTH YEAR', 'INSTRUCTOR': 'Danny B. Casimero' },
];

// --- Industry Consultants ---------------------------------------------------
// Required: Name. Assigned Course = Course Offering code(s), comma/; separated;
// each must exist in the term's Course Offerings (else flagged for manual fix).
// Company / Expertise are extra context columns (ignored by the importer).
const consultants = [
  { 'Name': 'Engr. Paolo Mendoza',   'Company': 'Accenture Philippines', 'Expertise': 'Cybersecurity',        'Assigned Course': 'BIT304' },
  { 'Name': 'Ms. Andrea Villanueva', 'Company': 'Globe Telecom',         'Expertise': 'Web & Cloud',          'Assigned Course': 'BIT301' },
  { 'Name': 'Mr. Carlo Tan',         'Company': 'Canva',                 'Expertise': 'UX / Product Design',  'Assigned Course': 'BIT313L' },
  { 'Name': 'Dr. Liza Fernandez',    'Company': 'DOST-ASTI',             'Expertise': 'Software Engineering', 'Assigned Course': 'BIT303; BIT401' },
  { 'Name': 'Mr. Rafael Ong',        'Company': 'Oracle Philippines',    'Expertise': 'Databases',            'Assigned Course': 'BIT201' },
];

// --- Course Assignments -----------------------------------------------------
// COURSE NO. is matched to the Course catalog; ASSIGNED FACULTY to the Faculty
// list. A row's status mirrors the assigned faculty's status. YEAR LEVEL
// mirrors the course's year level and drives the 1st–4th year filter.
const assignments = [
  { 'COURSE NO.': 'BIT101',  'COURSE OFFERING': 'Introduction to Computing',      'YEAR LEVEL': '1st Year', 'ASSIGNED FACULTY': 'Bianca G. Reyes',    'DATE ASSIGNED': DATE_ASSIGNED },
  { 'COURSE NO.': 'BIT102',  'COURSE OFFERING': 'Computer Programming 1',         'YEAR LEVEL': '1st Year', 'ASSIGNED FACULTY': 'Bowen Higgins',      'DATE ASSIGNED': DATE_ASSIGNED },
  { 'COURSE NO.': 'BIT201',  'COURSE OFFERING': 'Database Systems',               'YEAR LEVEL': '2nd Year', 'ASSIGNED FACULTY': 'Marceline Avila',    'DATE ASSIGNED': DATE_ASSIGNED },
  { 'COURSE NO.': 'BIT202',  'COURSE OFFERING': 'Object-Oriented Programming',    'YEAR LEVEL': '2nd Year', 'ASSIGNED FACULTY': 'Christine A. Dizon', 'DATE ASSIGNED': DATE_ASSIGNED },
  { 'COURSE NO.': 'BIT205',  'COURSE OFFERING': 'Data Structures and Algorithms', 'YEAR LEVEL': '2nd Year', 'ASSIGNED FACULTY': 'Dennis Ignacio',     'DATE ASSIGNED': DATE_ASSIGNED },
  { 'COURSE NO.': 'BIT301',  'COURSE OFFERING': 'Web Development',                'YEAR LEVEL': '3rd Year', 'ASSIGNED FACULTY': 'Saige Fuentes',      'DATE ASSIGNED': DATE_ASSIGNED },
  { 'COURSE NO.': 'BIT303',  'COURSE OFFERING': 'Software Engineering',           'YEAR LEVEL': '3rd Year', 'ASSIGNED FACULTY': 'Danny B. Casimero',  'DATE ASSIGNED': DATE_ASSIGNED },
  { 'COURSE NO.': 'BIT304',  'COURSE OFFERING': 'Network Security',               'YEAR LEVEL': '3rd Year', 'ASSIGNED FACULTY': 'Michael R. Lee',     'DATE ASSIGNED': DATE_ASSIGNED },
  { 'COURSE NO.': 'BIT313L', 'COURSE OFFERING': 'Human and Computer Interaction', 'YEAR LEVEL': '3rd Year', 'ASSIGNED FACULTY': 'Harold T. Lim',      'DATE ASSIGNED': DATE_ASSIGNED },
  { 'COURSE NO.': 'BIT401',  'COURSE OFFERING': 'Capstone Project 1',             'YEAR LEVEL': '4th Year', 'ASSIGNED FACULTY': 'Danny B. Casimero',  'DATE ASSIGNED': DATE_ASSIGNED },
];

function writeBook(rows, sheetName, fileName) {
  const file = path.join(outDir, fileName);
  try {
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(rows);
    xlsx.utils.book_append_sheet(wb, ws, sheetName);
    xlsx.writeFile(wb, file);
    console.log('wrote ' + file);
  } catch (err) {
    console.warn('SKIPPED ' + fileName + ' — ' + (err && err.message) + ' (is it open in Excel?)');
  }
}

writeBook(departments, 'Departments',          'sample_departments.xlsx');
writeBook(faculty,     'Faculty',              'sample_faculty.xlsx');
writeBook(programs,    'Programs',             'sample_programs.xlsx');
writeBook(courses,     'Courses',              'sample_courses.xlsx');
writeBook(offerings,   'Course Offerings',     'sample_course_offerings.xlsx');
writeBook(consultants, 'Industry Consultants', 'sample_industry_consultants.xlsx');
writeBook(assignments, 'Course Assignments',   'sample_course_assignments.xlsx');
console.log('Done. Files are in: ' + outDir);
