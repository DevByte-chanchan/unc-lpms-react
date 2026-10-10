/**
 * Generates the four "people" sample bulk-upload spreadsheets — the uploads
 * that decide who gets LPMS access. Everyone in them has a UNC school email in
 * the form firstname.surname@unc.edu.ph (see schoolEmail below), and the names
 * line up with the demo logins so upload → access → sign-in can be shown end
 * to end.
 *
 *   sample_departments.xlsx          → uploadDepartments
 *   sample_faculty.xlsx              → uploadFaculty
 *   sample_programs.xlsx             → uploadPrograms          (program head ↔ Faculty)
 *   sample_industry_consultants.xlsx → uploadConsultants       (assigned course ↔ catalog)
 *
 * The course / curriculum / assignment samples in sample-uploads/ are
 * hand-made and NOT written here, so running this can't overwrite them. They
 * refer to faculty by name (e.g. "Bianca G. Reyes", "DANNY B. CASIMERO"), so
 * don't rename anyone below who appears in them.
 *
 * Recommended upload order (so every row matches its master list and verifies):
 *   1) Departments  2) Faculty  3) Programs  4) Courses
 *   5) Industry Consultants  6) Course Assignments
 *
 * Run:  npm run samples   (from the server/ folder; in Docker: docker exec ca-api npm run samples)
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

// --- School email rule --------------------------------------------------------
// firstname.surname@unc.edu.ph: honorifics stripped, first given-name word,
// middle names/initials dropped, surname = last word with any de/dela/delos/
// del/san/sta particles before it joined on ("San Lorenzo" → "sanlorenzo"),
// lowercase, accents removed, no spaces/dots/hyphens inside a part.
const HONORIFICS = new Set(['dr', 'engr', 'mr', 'ms', 'mrs', 'prof', 'atty']);
const PARTICLES = new Set(['de', 'dela', 'delos', 'del', 'san', 'sta', 'la', 'los']);
const LEADING_PARTICLES = new Set(['de', 'dela', 'delos', 'del', 'san', 'sta']);

const clean = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');

function schoolEmail(fullName) {
  const words = fullName.trim().split(/\s+/).filter((w) => !HONORIFICS.has(clean(w)));
  if (words.length < 2) throw new Error(`Can't build an email from "${fullName}"`);
  let i = words.length - 1;
  const surname = [words[i]];
  // Join particles in front of the last word ("de los Santos", "Dela Cruz").
  // "la"/"los" only count when they follow another particle ("de la", "de los").
  while (i > 1 && PARTICLES.has(clean(words[i - 1]))) {
    const w = clean(words[i - 1]);
    if (!LEADING_PARTICLES.has(w) && !(i > 2 && LEADING_PARTICLES.has(clean(words[i - 2])))) break;
    surname.unshift(words[--i]);
  }
  return `${clean(words[0])}.${surname.map(clean).join('')}@unc.edu.ph`;
}

// The rule would give these people someone else's email, so they get an
// explicit one instead (the mail admin's usual fix: add the middle name).
const EMAIL_OVERRIDES = {
  // schoolEmail() gives maria.santos@unc.edu.ph — the Director of Libraries' seed login.
  'Dr. Maria Elena Santos': 'mariaelena.santos@unc.edu.ph',
};
const emailFor = (name) => EMAIL_OVERRIDES[name] ?? schoolEmail(name);

// Seed-only demo logins (server/utils/seedUsers.js) that no upload may claim.
const SEED_ONLY_EMAILS = ['sophia.sterling@unc.edu.ph', 'maria.santos@unc.edu.ph', 'carlos.garcia@unc.edu.ph'];

// --- Departments ------------------------------------------------------------
// Required: Name, Code. Optional: Dean, Dean Email.
const departments = [
  { 'Name': 'School of Social & Natural Sciences',        'Code': 'SSNS',  'Dean': 'Dr. Maria Elena Santos' },
  { 'Name': 'School of Business and Accountancy',         'Code': 'SBA',   'Dean': 'Dr. Teresita L. Gomez' },
  { 'Name': 'School of Computer & Information Sciences',  'Code': 'SCIS',  'Dean': 'Edrian Lait' },
  { 'Name': 'College of Criminal Justice Education',      'Code': 'CJE',   'Dean': 'Atty. Ramon D. Fernandez' },
  { 'Name': 'School of Teacher Education',                'Code': 'STE',   'Dean': 'Dr. Carmela V. Reyes' },
  { 'Name': 'College of Engineering and Architecture',    'Code': 'CEA',   'Dean': 'Engr. Ramon T. Villanueva' },
  { 'Name': 'School of Nursing & Allied Health Sciences', 'Code': 'SNAHS', 'Dean': 'Dr. Lourdes A. Bautista' },
].map(({ Name, Code, Dean }) => ({ 'Name': Name, 'Code': Code, 'Dean': Dean, 'Dean Email': emailFor(Dean) }));

// --- Faculty ----------------------------------------------------------------
// Required: Name, Role. Optional: Department (matched to the Department list),
// Status (defaults Active), Sex, Birthdate, Email, Contact Number.
// Includes every program head + every instructor referenced elsewhere, plus a
// couple of non-Active rows to exercise On Leave / Inactive statuses. A row
// with its own Email keeps it; every other row gets emailFor(Name).
const SCIS = 'School of Computer & Information Sciences';
const faculty = [
  // Dean + program heads (names match the Departments / Programs sheets)
  { 'Name': 'Edrian Lait',          'Role': 'Dean',                'Department': SCIS,                     'Status': 'Active',   'Sex': 'Male',   'Birthdate': '1978-08-09', 'Contact Number': '0917 555 0119' },
  { 'Name': 'Kristine San Lorenzo', 'Role': 'Program Head',        'Department': SCIS,                     'Status': 'Active',   'Sex': 'Female', 'Birthdate': '1988-05-11', 'Contact Number': '0917 555 0120' },
  { 'Name': 'June Arreb Danila',    'Role': 'Associate Professor', 'Department': SCIS,                     'Status': 'Active',   'Sex': 'Male',   'Birthdate': '1985-03-14', 'Contact Number': '0917 555 0101' },
  { 'Name': 'Alan Turing',          'Role': 'Program Head',        'Department': SCIS,                     'Status': 'Active',   'Sex': 'Male',   'Birthdate': '1982-06-23', 'Contact Number': '0917 555 0102' },
  { 'Name': 'Sarah Jenkins',        'Role': 'Program Head',        'Department': SCIS,                     'Status': 'Active',   'Sex': 'Female', 'Birthdate': '1987-09-02', 'Contact Number': '0917 555 0103' },
  { 'Name': 'Thomas Bayes',         'Role': 'Program Head',        'Department': SCIS,                     'Status': 'Active',   'Sex': 'Male',   'Birthdate': '1980-11-18', 'Contact Number': '0917 555 0104' },
  { 'Name': 'Margaret Hamilton',    'Role': 'Program Head',        'Department': SCIS,                     'Status': 'Active',   'Sex': 'Female', 'Birthdate': '1986-01-27', 'Contact Number': '0917 555 0105' },
  { 'Name': 'John Backus',          'Role': 'Program Head',        'Department': SCIS,                     'Status': 'Active',   'Sex': 'Male',   'Birthdate': '1979-07-05', 'Contact Number': '0917 555 0106' },
  { 'Name': 'Robert Noyce',         'Role': 'Program Head',        'Department': 'College of Engineering', 'Status': 'Active',   'Sex': 'Male',   'Birthdate': '1981-04-30', 'Contact Number': '0917 555 0107' },
  // Instructors / professors (assigned to courses + offerings in the other samples)
  { 'Name': 'Danny B. Casimero',    'Role': 'Professor',           'Department': SCIS,                     'Status': 'Active',   'Sex': 'Male',   'Birthdate': '1976-05-22', 'Contact Number': '0918 555 0108' },
  { 'Name': 'Dennis Ignacio',       'Role': 'Associate Professor', 'Department': SCIS,                     'Status': 'Active',   'Sex': 'Male',   'Birthdate': '1984-02-19', 'Contact Number': '0918 555 0109' },
  { 'Name': 'Michael R. Lee',       'Role': 'Associate Professor', 'Department': SCIS,                     'Status': 'Active',   'Sex': 'Male',   'Birthdate': '1983-09-15', 'Contact Number': '0918 555 0110' },
  { 'Name': 'Marceline Avila',      'Role': 'Assistant Professor', 'Department': SCIS,                     'Status': 'Active',   'Sex': 'Female', 'Birthdate': '1990-08-12', 'Contact Number': '0918 555 0111' },
  { 'Name': 'Saige Fuentes',        'Role': 'Assistant Professor', 'Department': SCIS,                     'Status': 'Active',   'Sex': 'Female', 'Birthdate': '1991-03-28', 'Contact Number': '0918 555 0112' },
  { 'Name': 'Harold T. Lim',        'Role': 'Assistant Professor', 'Department': SCIS,                     'Status': 'Active',   'Sex': 'Male',   'Birthdate': '1988-11-21', 'Contact Number': '0918 555 0113' },
  { 'Name': 'Bianca G. Reyes',      'Role': 'Instructor',          'Department': SCIS,                     'Status': 'Active',   'Sex': 'Female', 'Birthdate': '1993-12-03', 'Contact Number': '0918 555 0114' },
  { 'Name': 'Bowen Higgins',        'Role': 'Instructor',          'Department': SCIS,                     'Status': 'Active',   'Sex': 'Male',   'Birthdate': '1994-10-09', 'Contact Number': '0918 555 0115' },
  { 'Name': 'Christine A. Dizon',   'Role': 'Instructor',          'Department': SCIS,                     'Status': 'Active',   'Sex': 'Female', 'Birthdate': '1992-06-07', 'Contact Number': '0918 555 0116' },
  { 'Name': 'Olivia Vance',         'Role': 'Instructor',          'Department': SCIS,                     'Status': 'Active',   'Sex': 'Female', 'Birthdate': '1990-02-21', 'Contact Number': '0918 555 0121' },
  { 'Name': 'Monica Norton',        'Role': 'Instructor',          'Department': SCIS,                     'Status': 'Active',   'Sex': 'Female', 'Birthdate': '1995-07-17', 'Contact Number': '0918 555 0122' },
  // Non-Active rows: these people must NOT get access.
  { 'Name': 'Gregorio P. Santos',   'Role': 'Professor',           'Department': SCIS,                     'Status': 'On Leave', 'Sex': 'Male',   'Birthdate': '1975-01-10', 'Contact Number': '0919 555 0117' },
  { 'Name': 'Maria Elena Cruz',     'Role': 'Instructor',          'Department': SCIS,                     'Status': 'Inactive', 'Sex': 'Female', 'Birthdate': '1989-04-16', 'Contact Number': '0919 555 0118' },
  // Deliberate test row: a personal (non-UNC) address exercises the held-email path.
  { 'Name': 'Marco Dela Rosa',      'Role': 'Instructor',          'Department': SCIS,                     'Status': 'Active',   'Sex': 'Male',   'Birthdate': '1992-09-25', 'Contact Number': '0919 555 0123', 'Email': 'marco.delarosa@gmail.com' },
].map(({ Email, 'Contact Number': contact, ...row }) => ({ ...row, 'Email': Email ?? emailFor(row.Name), 'Contact Number': contact }));

// --- Programs ---------------------------------------------------------------
// Required: Code, Name. Program Head is matched to the Faculty list (honorifics
// are stripped, so "Dr. Alan Turing" still matches "Alan Turing").
const programs = [
  { 'Code': 'BSIT', 'Name': 'Bachelor of Science in Information Technology', 'Program Head': 'Kristine San Lorenzo', 'Status': 'Active' },
  { 'Code': 'BSCS', 'Name': 'Bachelor of Science in Computer Science',       'Program Head': 'Alan Turing',          'Status': 'Active' },
  { 'Code': 'BSIS', 'Name': 'Bachelor of Science in Information Systems',    'Program Head': 'Sarah Jenkins',        'Status': 'Active' },
  { 'Code': 'BSDA', 'Name': 'Bachelor of Science in Data Analytics',         'Program Head': 'Thomas Bayes',         'Status': 'Active' },
  { 'Code': 'BSSE', 'Name': 'Bachelor of Science in Software Engineering',   'Program Head': 'Margaret Hamilton',    'Status': 'Active' },
  { 'Code': 'BSCE', 'Name': 'Bachelor of Science in Computer Engineering',   'Program Head': 'Robert Noyce',         'Status': 'Active' },
  { 'Code': 'ACT',  'Name': 'Associate in Computer Technology',              'Program Head': 'John Backus',          'Status': 'Active' },
];

// --- Industry Consultants ---------------------------------------------------
// Required: Name. Assigned Course = Course Offering code(s), comma/; separated;
// each must exist in the term's Course Offerings (else flagged for manual fix).
// Company / Expertise are extra context columns (ignored by the importer).
const consultants = [
  { 'Name': 'Engr. Paolo Mendoza',   'Company': 'Accenture Philippines', 'Expertise': 'Cybersecurity',          'Assigned Course': 'BIT304' },
  { 'Name': 'Ms. Andrea Villanueva', 'Company': 'Globe Telecom',         'Expertise': 'Web & Cloud',            'Assigned Course': 'BIT301' },
  { 'Name': 'Mr. Carlo Tan',         'Company': 'Canva',                 'Expertise': 'UX / Product Design',    'Assigned Course': 'BIT313L' },
  { 'Name': 'Dr. Liza Fernandez',    'Company': 'DOST-ASTI',             'Expertise': 'Software Engineering',   'Assigned Course': 'BIT303; BIT401' },
  { 'Name': 'Mr. Rafael Ong',        'Company': 'Oracle Philippines',    'Expertise': 'Databases',              'Assigned Course': 'BIT201' },
  { 'Name': 'Roberto Cruz',          'Company': 'Smart Communications',  'Expertise': 'Full-Stack Development', 'Assigned Course': 'BIT302' },
].map(({ Name, ...rest }) => ({ 'Name': Name, 'Email': emailFor(Name), ...rest }));

// --- Checks -----------------------------------------------------------------
// Every email must be unique across all four files and must not claim a
// seed-only demo login; every program head must be an Active Program Head.
const owners = new Map(); // email → { file, name }
const bare = (n) => n.trim().split(/\s+/).filter((w) => !HONORIFICS.has(clean(w))).join(' ');
const claim = (email, file, fullName) => {
  const key = email.toLowerCase();
  const name = bare(fullName);
  if (SEED_ONLY_EMAILS.includes(key)) throw new Error(`${name} (${file}) would get ${email}, a seed-only demo login`);
  const prev = owners.get(key);
  // The same person may appear in two files (a dean is also a faculty row).
  if (prev && prev.name !== name) throw new Error(`Email collision on ${email}: ${prev.name} (${prev.file}) vs ${name} (${file})`);
  owners.set(key, { file, name });
};
departments.forEach((d) => claim(d['Dean Email'], 'departments', d.Dean));
faculty.forEach((f) => claim(f.Email, 'faculty', f.Name));
consultants.forEach((c) => claim(c.Email, 'consultants', c.Name));
for (const p of programs) {
  const head = faculty.find((f) => f.Name === p['Program Head']);
  if (!head || head.Role !== 'Program Head' || head.Status !== 'Active') {
    throw new Error(`${p.Code}'s head "${p['Program Head']}" is not an Active Program Head in the faculty list`);
  }
}

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
writeBook(consultants, 'Industry Consultants', 'sample_industry_consultants.xlsx');
console.log('Done. Files are in: ' + outDir);
