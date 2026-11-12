'use strict';

// The registrar's SUBJECT OFFERINGS export (the Dean's .xls): the OFFICIAL list of who teaches what, by section.
// Ported from feature/course-assignment (utils/teachingAssignmentParser.js), Subject Offerings layout only:
//
//   SCHOOL OF COMPUTER AND INFORMATION SCIENCES
//   SUBJECT OFFERINGS
//   First Sem S/Y 2026-2027
//   CODE | COURSE NO    | DESCRIPTION                 | UNIT(S) | TIME | DAYS | FACULTY            | ROOM
//   3065 | BIT213L-OBa  | Object-Oriented Programming | 4       | ...  | W    |                    | VR1
//        | BIT213L-OBaL |                             |         | ...  | TH   | CASIMERO DANNY BOY | JH-27
//
// CODE is a numeric offer id; the course is COURSE NO. A row with a blank CODE continues the row above (a lab, or a
// second meeting), and the faculty is often only on the lab row, so faculty is collected across the whole block.
// Pure functions, apart from readWorkbook (which only reads the bytes it is given).

const xlsx = require('xlsx');

const clean = (v) => String(v == null ? '' : v).trim();
const canonical = (v) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

const ALIASES = {
    code: ['code', 'offercode', 'offerid'],
    courseNo: ['courseno', 'coursenumber', 'coursecode', 'subjectcode'],
    description: ['description', 'coursedescription', 'coursetitle', 'coursename', 'title', 'subject'],
    faculty: ['faculty', 'facultyname', 'instructor', 'instructorname', 'teacher', 'professor'],
};

// A section is `O` + program letter + block letter (OBa, OBaL) or LIS's numbered blocks (P7a). Strict, because
// course codes have hyphens of their own (GEE-LITE).
const looksLikeSection = (tail) => /^(O[A-Za-z]{1,2}|P\d[A-Za-z]{0,2})L?$/.test(clean(tail));

// BIT213L-OBaL -> { baseCode: 'BIT213L', section: 'OBa' }: the trailing L of a SECTION marks its lab meeting.
const splitCourseNo = (courseNo) => {
    const s = clean(courseNo);
    const dash = s.lastIndexOf('-');
    if (dash <= 0 || !looksLikeSection(s.slice(dash + 1))) return { baseCode: s.toUpperCase(), section: '' };
    let section = s.slice(dash + 1);
    if (section.length >= 3 && section.endsWith('L')) section = section.slice(0, -1);
    return { baseCode: s.slice(0, dash).toUpperCase(), section };
};

// "First Sem S/Y 2026-2027" -> { schoolYear: '2026-2027', semester: '1st' } (either may be null).
const termFromText = (text) => {
    const t = String(text || '');
    const year = t.match(/(\d{4})\s*-\s*(\d{4})/);
    const sem = /\b(2nd|second)\b/i.test(t) ? '2nd' : /\b(1st|first)\b/i.test(t) ? '1st' : /summer/i.test(t) ? 'Summer' : null;
    return { schoolYear: year ? `${year[1]}-${year[2]}` : null, semester: sem };
};

// The first non-empty sheet, as rows of cells. `bytes`: the uploaded file.
const readWorkbook = (bytes) => {
    const workbook = xlsx.read(bytes, { type: 'buffer', cellDates: false });
    for (const name of workbook.SheetNames) {
        const sheet = workbook.Sheets[name];
        if (!sheet || !sheet['!ref']) continue;
        const matrix = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: true });
        if (matrix.some(r => (r || []).some(c => clean(c) !== ''))) return matrix;
    }
    return [];
};

const findHeader = (matrix) => {
    for (let i = 0; i < Math.min(matrix.length, 40); i++) {
        const cells = (matrix[i] || []).map(canonical);
        const columns = {};
        for (const [field, names] of Object.entries(ALIASES)) {
            const at = cells.findIndex(c => names.includes(c));
            if (at >= 0) columns[field] = at;
        }
        if (columns.code !== undefined && columns.courseNo !== undefined) return { index: i, columns };
    }
    return null;
};

// { schoolYear, semester, sections: [{ courseNo, section, title, faculty: [names] }] }, or null when the sheet is
// not a Subject Offerings export.
const parseSubjectOfferings = (matrix) => {
    const header = findHeader(matrix);
    if (!header) return null;
    const { index, columns } = header;
    const at = (row, field) => (columns[field] === undefined ? '' : clean(row[columns[field]]));
    const titleRow = matrix.slice(0, index).map(r => clean((r || [])[0])).find(t => /S\/Y|\bsem/i.test(t)) || '';

    const sections = new Map();
    let open = null; // the section of the last CODE row; a blank row closes it
    for (let i = index + 1; i < matrix.length; i++) {
        const row = matrix[i] || [];
        const code = at(row, 'code');
        const courseNo = at(row, 'courseNo');
        if (!code && !courseNo) { open = null; continue; }
        if (!courseNo) continue;
        const { baseCode, section } = splitCourseNo(courseNo);
        const key = `${baseCode}-${section.toUpperCase()}`;
        if (!code && (!open || open !== key)) continue; // a continuation with nothing above it: never a section of its own
        if (!sections.has(key)) sections.set(key, { courseNo: baseCode, section, title: '', faculty: [] });
        const entry = sections.get(key);
        if (!entry.title) entry.title = at(row, 'description');
        const name = at(row, 'faculty');
        if (name && !entry.faculty.includes(name)) entry.faculty.push(name);
        if (code) open = key;
    }
    return { ...termFromText(titleRow), sections: [...sections.values()] };
};

// Names are "SURNAME, FIRST" in LPMS and "SURNAME FIRST MIDDLE" in the export. Same person when the surnames agree
// and every word of the shorter name is in the longer one (initials ignored).
const nameWords = (name) => String(name || '').toUpperCase().replace(/[^A-Z\s]/g, ' ').split(/\s+/).filter(w => w.length > 1);
const sameName = (a, b) => {
    const x = nameWords(a);
    const y = nameWords(b);
    if (!x.length || !y.length || x[0] !== y[0]) return false;
    const [short, long] = x.length <= y.length ? [x, y] : [y, x];
    return short.every(w => long.includes(w));
};
// ponytail: name matching only; add an employee id column to Users if two faculty share a name.
const matchUser = (name, users) => {
    const found = users.filter(u => sameName(name, u.name));
    return found.length === 1 ? found[0] : null;
};

// One row per course of the program in the term: the pre-assignment beside the official sections, and how they
// compare.
//   match          the pre-assigned instructor teaches it officially
//   different      officially taught by someone else
//   official-only  on the official list, not pre-assigned
//   pre-only       pre-assigned, not on the official list
//   no-faculty     on the official list with no faculty named yet
// Before an official list is imported (hasOfficial false) a row is just 'assigned' or 'unassigned'.
const compare = ({ courses, assignments, sections, users, hasOfficial = true }) => {
    const byCourse = new Map();
    for (const s of sections) {
        if (!byCourse.has(s.courseNo)) byCourse.set(s.courseNo, []);
        byCourse.get(s.courseNo).push(s);
    }
    return courses.map((course) => {
        const code = String(course.course_no || '').toUpperCase();
        const pre = assignments.find(a => String(a.course_id) === String(course.course_id) && String(a.program_id) === String(course.program_id)) || null;
        const official = (byCourse.get(code) || []).map(s => ({
            section: s.section,
            faculty: s.faculty.map(name => ({ name, user: matchUser(name, users) })),
        }));
        const names = official.flatMap(s => s.faculty);
        const officialUsers = [...new Map(names.filter(f => f.user).map(f => [f.user.user_id, f.user])).values()];
        let status;
        if (!hasOfficial) status = pre ? 'assigned' : 'unassigned';
        else if (!official.length) status = pre ? 'pre-only' : 'unassigned';
        else if (!names.length) status = 'no-faculty';
        else if (!pre) status = 'official-only';
        else status = names.some(f => f.user && String(f.user.user_id) === String(pre.instructor_user_id)) ? 'match' : 'different';
        return {
            course_id: course.course_id,
            program_id: course.program_id,
            course_no: course.course_no,
            course_title: course.course_title,
            year_lvl: course.year_lvl || null,
            pre,
            official,
            // The account to switch to, when the official list names exactly one known instructor.
            suggested: officialUsers.length === 1 ? { user_id: officialUsers[0].user_id, name: officialUsers[0].name } : null,
            status,
        };
    });
};

module.exports = { readWorkbook, parseSubjectOfferings, splitCourseNo, termFromText, sameName, compare };
