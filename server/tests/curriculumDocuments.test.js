/**
 * Program of Study: keeping the PDFs, calculating the numbers, fixing duplicates.
 *
 * The pure parts (course numbers, parser, checks) run without a database. The
 * rest runs against the real database on SCRATCH terms (school years 2101+ and
 * 2201+), a scratch program code and a scratch storage folder
 * (CURRICULUM_STORAGE_DIR), all removed afterwards; the live terms, programs and
 * server/storage/curriculum/ are never touched. Undo is exercised through the
 * same two calls POST /imports/:id/undo makes (restoreSnapshot +
 * undoBatchDocuments), because that route only undoes in the live active term.
 */
/* global process, Buffer */ // Node globals: the root ESLint config lints server/ with browser globals.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Op } from 'sequelize';
import { sequelize } from '../config/sequelize.js';
import db from '../models/index.js';
import api from '../routes/index.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { hashPassword } from '../controllers/authController.js';
import { courseNumbers, fromCourse, formatCredit, formatContactHrs } from '../utils/courseNumbers.js';
import { parseProgramOfStudyPdf } from '../utils/programOfStudyParser.js';
import { checkProgramOfStudy } from '../utils/programOfStudyChecks.js';
import { storedPath, undoBatchDocuments } from '../services/curriculumDocuments.js';
import { restoreSnapshot } from '../utils/importUndo.js';
import { cloneCurriculumFromPriorPeriod } from '../utils/curriculumClone.js';
import { planDedupe, applyDedupe } from '../utils/dedupeCourses.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(__dirname, 'fixtures', 'programOfStudy');
const PDF1 = 'Rev-2-_BSIT-_-PROGRAM-OF-STUDY-1.pdf';
const PDF2 = 'Rev-2-_BSIT-_-PROGRAM-OF-STUDY-2.pdf';
const readFixture = (name) => fs.readFile(path.join(FIX, name));

// ---------------------------------------------------------------------------
// 12. courseNumbers — no database

test('courseNumbers: BIT213L (2/2/4/8) and BIT111L (2/1/3/5)', () => {
  const a = courseNumbers({ lec: 2, lab: 2, totalUnits: 4, hrsPerWeek: 8 });
  assert.equal(a.credit_units, 4);
  assert.equal(a.lec_hrs_week, 2);
  assert.equal(a.lab_hrs_week, 6);
  assert.equal(a.hrs_per_lab_unit, 3);
  assert.equal(a.contact_hrs_semester, 144);
  assert.equal(a.lec_hrs_semester, 36);
  assert.equal(a.lab_hrs_semester, 108);
  assert.equal(a.instructional_hrs, 128);

  const b = courseNumbers({ lec: 2, lab: 1, totalUnits: 3, hrsPerWeek: 5 });
  assert.deepEqual([b.credit_units, b.lab_hrs_week, b.contact_hrs_semester, b.instructional_hrs], [3, 3, 90, 80]);
  assert.deepEqual([b.lec_hrs_semester, b.lab_hrs_semester], [36, 54]);
});

test('courseNumbers: non-credit SOCARTS1 keeps its hours; GEE-LITE has no lab', () => {
  const s = courseNumbers({ lec: 2, lab: 0, hrsPerWeek: 2, nonCredit: true });
  assert.equal(s.credit_units, 0);
  assert.equal(s.hrs_per_week, 2);
  assert.equal(s.contact_hrs_semester, 36);
  const g = courseNumbers({ lec: 3, lab: 0, hrsPerWeek: 3 });
  assert.equal(g.lab_hrs_week, 0);
  assert.equal(g.hrs_per_lab_unit, null);
  // A lecture-only course with more hours than units keeps the PDF's hours.
  const n = courseNumbers({ lec: 3, lab: 0, hrsPerWeek: 4 });
  assert.equal(n.lec_hrs_week, 4);
  assert.equal(n.lab_hrs_week, 0);
});

test('fromCourse reads the stored strings back into the same numbers', () => {
  for (const c of [
    { lec: 2, lab: 2, hrsPerWeek: 8 }, { lec: 2, lab: 1, hrsPerWeek: 5 },
    { lec: 3, lab: 0, hrsPerWeek: 4 }, { lec: 2, lab: 0, hrsPerWeek: 2, nonCredit: true },
    { lec: 2, lab: 1, hrsPerWeek: 3 },
  ]) {
    const stored = { credit: formatCredit(c), contact_hrs: formatContactHrs(c) };
    assert.deepEqual(fromCourse(stored), courseNumbers(c), JSON.stringify(stored));
  }
  assert.equal(formatCredit({ lec: 2, lab: 0, nonCredit: true }), '(2) LEC, 0 LAB');
  assert.equal(formatContactHrs({ lec: 2, lab: 1, hrsPerWeek: 5 }), '2 Hrs Lec, 3 Hrs Lab');
  assert.equal(fromCourse({ credit: '3 units', contact_hrs: '3 Hrs Lec' }), null);
  assert.equal(fromCourse({ credit: '3 LEC, 0 LAB', contact_hrs: null }), null);
});

// ---------------------------------------------------------------------------
// The parser and 13. the calculated checks on the real files — no database

const parsedPair = Promise.all([PDF1, PDF2].map(async (n) => parseProgramOfStudyPdf(await readFixture(n))));

test('parser: header, parts and rows of the real BSIT Program of Study', async () => {
  const [one, two] = await parsedPair;
  for (const p of [one, two]) {
    assert.equal(p.header.revision, '04');
    assert.equal(p.header.cmo, 'CMO No. 25 S. 2015');
    assert.equal(p.header.effectivity, '1st Semester SY 2022-2023');
    assert.equal(p.header.program_name, 'BS Information Technology');
  }
  assert.equal(one.part_label, '1st–2nd Year');
  assert.equal(two.part_label, '3rd–4th Year');
  assert.equal(two.programTotal, 153);
  const by = new Map([...one.courses, ...two.courses].map((c) => [c.code, c]));
  assert.deepEqual([by.get('BIT213L').lec, by.get('BIT213L').lab, by.get('BIT213L').total, by.get('BIT213L').hrs], [2, 2, 4, 8]);
  assert.equal(by.get('SOCARTS1').nonCredit, true);
  // Prerequisites that wrap onto lines above and below their row.
  assert.equal(by.get('BIT314L').prereqRaw, 'BIT213L, BIT221L, BIT222L');
  assert.equal(by.get('BIT412L').prereqRaw, 'BIT322L, BIT324L, BIT325L');
  assert.equal(by.get('BIT411L').prereqRaw, 'BIT323L');
  assert.equal(by.get('PE3k').year, 2);
  assert.equal(by.get('PE3k').semester, 1);
});

test('checks: totals, 153, lab ratio, lecture-only notes, prerequisite order', async () => {
  const files = await parsedPair;
  const r = checkProgramOfStudy(files, { prefixes: ['BSIT', 'BIT'], programCode: 'BSIT' });
  assert.deepEqual(r.semesters.filter((s) => !s.ok), [], 'every semester total matches');
  assert.equal(r.program.checked, true);
  assert.equal(r.program.actual, 153);
  assert.equal(r.program.ok, true);
  const flagged = (pred) => [...r.rows].filter(([, v]) => v.some(pred)).map(([k]) => k).sort();
  assert.deepEqual(flagged((i) => /lab hour/.test(i.message)), ['BIT-SPE3']);
  assert.deepEqual(flagged((i) => /hrs\/week\. Kept as printed/.test(i.message)), ['NSTP1K', 'NSTP2K', 'SVA']);
  assert.deepEqual(flagged((i) => /not an earlier semester/.test(i.message)), []);
  assert.deepEqual(flagged((i) => i.field === 'Units'), []);

  const half = checkProgramOfStudy([files[0]], { prefixes: ['BSIT', 'BIT'], programCode: 'BSIT' });
  assert.equal(half.program.checked, false);
  assert.match(half.program.message, /only when all years are uploaded/);
});

// ---------------------------------------------------------------------------
// Database tests

let reachable = true;
try { await sequelize.authenticate(); } catch { reachable = false; }
const skip = !reachable && 'database not reachable';

const PREFIX = 'pos-test-' + process.pid + '-';
const PASSWORD = 'Correct-Horse-9';
const PROGRAM_CODE = 'ZP' + (process.pid % 100000);

async function startApi() {
  const app = express();
  app.use(express.json());
  app.use('/api', api);
  app.use(errorHandler);
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  return { server, base: 'http://127.0.0.1:' + server.address().port + '/api' };
}

function client(base) {
  let cookie = null;
  const call = async (method, p, body, { raw = false } = {}) => {
    const headers = {};
    if (cookie) headers.cookie = cookie;
    let payload;
    if (body instanceof FormData) payload = body;
    else if (body !== undefined) { headers['content-type'] = 'application/json'; payload = JSON.stringify(body); }
    const res = await fetch(base + p, { method, headers, body: payload });
    const set = res.headers.get('set-cookie');
    if (set) { const pair = set.split(';')[0]; cookie = pair.endsWith('=') ? null : pair; }
    if (raw) return { status: res.status, headers: res.headers, buf: Buffer.from(await res.arrayBuffer()) };
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not JSON */ }
    return { status: res.status, json };
  };
  return {
    get: (p, o) => call('GET', p, undefined, o),
    post: (p, b) => call('POST', p, b ?? {}),
    login: (email) => call('POST', '/auth/login', { email, password: PASSWORD }),
  };
}

const form = (files, fields) => {
  const fd = new FormData();
  for (const f of files) fd.append('file', new Blob([f.buf], { type: f.type || 'application/pdf' }), f.name);
  for (const [k, v] of Object.entries(fields)) fd.append(k, typeof v === 'string' ? v : JSON.stringify(v));
  return fd;
};

const storageFiles = async (dir) => (await fs.readdir(dir)).filter((n) => n.endsWith('.pdf')).sort();

test('Program of Study import, kept PDFs, duplicates, clone, dedupe', { skip }, async (t) => {
  const storage = await fs.mkdtemp(path.join(os.tmpdir(), 'pos-storage-'));
  const savedEnv = process.env.CURRICULUM_STORAGE_DIR;
  process.env.CURRICULUM_STORAGE_DIR = storage;
  const { server, base } = await startApi();
  const periods = [];
  const programs = [];

  const cleanup = async () => {
    const ids = periods.map((p) => p.id);
    if (ids.length) {
      const courseIds = (await db.Course.findAll({ where: { period_id: ids }, attributes: ['course_id'], raw: true })).map((c) => c.course_id);
      await db.Prerequisite.destroy({ where: { [Op.or]: [{ course_id: courseIds }, { course_prerequisite_id: courseIds }] } });
      await db.ConsultantCourse.destroy({ where: { course_id: courseIds } });
      await db.ProgramCourseOffering.destroy({ where: { course_id: courseIds } });
      await db.CourseOfferingAssignment.destroy({ where: { period_id: ids } });
      await db.CourseAssignmentHistory.destroy({ where: { period_id: ids } });
      await db.Course.destroy({ where: { period_id: ids } });
      await db.ImportBatch.destroy({ where: { period_id: ids } });
    }
    await db.CurriculumDocument.destroy({ where: { program_id: programs.map((p) => p.id) } });
    if (programs.length) await db.Program.destroy({ where: { id: programs.map((p) => p.id) } });
    await db.UserAccount.destroy({ where: { email: { [Op.like]: PREFIX + '%' } } });
    if (ids.length) await db.AcademicPeriod.destroy({ where: { id: ids } });
  };
  t.after(async () => {
    await cleanup();
    await new Promise((r) => server.close(r));
    if (savedEnv === undefined) delete process.env.CURRICULUM_STORAGE_DIR; else process.env.CURRICULUM_STORAGE_DIR = savedEnv;
    await fs.rm(storage, { recursive: true, force: true });
  });

  const makePeriod = async (schoolYear, semester) => {
    const p = await db.AcademicPeriod.create({ label: 'POS test ' + process.pid + '-' + periods.length + ' ' + schoolYear + ' S' + semester, school_year: schoolYear, semester: String(semester), status: 'Closed' });
    periods.push(p);
    return p;
  };
  const makeProgram = async (periodId) => {
    const p = await db.Program.create({ code: PROGRAM_CODE, name: 'BS Information Technology', status: 'Active', period_id: periodId });
    programs.push(p);
    return p;
  };
  const seedCourse = async (periodId, programId, fields) => {
    const c = await db.Course.create({ semester: 1, period_id: periodId, archived: false, credit: '2 LEC, 1 LAB', contact_hrs: '2 Hrs Lec, 3 Hrs Lab', ...fields });
    if (programId) await db.ProgramCourseOffering.create({ course_id: c.course_id, program_id: programId, revision_number: 1 });
    return c;
  };

  const head = await db.UserAccount.create({
    email: PREFIX + 'head@unc.edu.ph', display_name: 'POS Test Head', roles: ['Program Head'],
    password_hash: await hashPassword(PASSWORD), must_change_password: false, status: 'Active',
  });
  const as = client(base);
  assert.equal((await as.login(head.email)).status, 200);

  const P = await makePeriod('2101-2102', 1);
  const prog = await makeProgram(P.id);
  // Stored files are shared by hash, and a live program may hold these very PDFs
  // (a file in use is never deleted). A trailing PDF comment gives this run its
  // own hashes, so its "file deleted" checks can't be blocked by live rows.
  const tag = Buffer.from('\n%pos-test-' + process.pid + '-' + Date.now() + '\n');
  const pdfs = [{ name: PDF1, buf: Buffer.concat([await readFixture(PDF1), tag]) }, { name: PDF2, buf: Buffer.concat([await readFixture(PDF2), tag]) }];
  const fields = { period_id: String(P.id), programId: String(prog.id) };

  // 8. Leftovers with old codes, plus an assignment on BIT202.
  const old201 = await seedCourse(P.id, prog.id, { course_no: 'BIT201', course_title: 'Database Systems', year_lvl: 'SECOND YEAR' });
  const old202 = await seedCourse(P.id, prog.id, { course_no: 'BIT202', course_title: 'Object-Oriented Programming', year_lvl: 'SECOND YEAR' });
  const old205 = await seedCourse(P.id, prog.id, { course_no: 'BIT205', course_title: 'Data Structures and Algorithms', year_lvl: 'SECOND YEAR' });
  const off202 = await db.ProgramCourseOffering.findOne({ where: { course_id: old202.course_id } });
  await db.CourseOfferingAssignment.create({
    course_code: 'BIT202', course_name: 'Object-Oriented Programming', course_id: old202.course_id, pc_offering_id: off202.pc_offering_id,
    program_id: prog.id, faculty_name: 'Test Faculty', status: 'Pending Match', period_id: P.id,
  });

  // --- Preview stores nothing; it lists the leftovers and sums the semester (8, 14)
  const preview = await as.post('/courses/upload?preview=1', form(pdfs, fields));
  assert.equal(preview.status, 200, JSON.stringify(preview.json));
  const pos = preview.json.programOfStudy;
  assert.equal(await db.CurriculumDocument.count({ where: { program_id: prog.id } }), 0, 'preview keeps no row');
  assert.deepEqual(await storageFiles(storage), [], 'preview keeps no file');
  const rec = new Map(pos.reconcile.map((r) => [r.course_no, r]));
  assert.equal(rec.get('BIT201').decision, 'archive');
  assert.equal(rec.get('BIT201').reason, 'Duplicate of BIT211L');
  assert.equal(rec.get('BIT202').reason, 'Duplicate of BIT213L');
  assert.equal(rec.get('BIT202').links.assignments, 1);
  assert.match(rec.get('BIT205').reason, /^Belongs to 1st Year · 2nd Semester/);
  assert.equal(rec.get('BIT205').decision, 'archive');
  // 14. 1st Semester: 8 + 6 + 7 + 6 courses; non-credit units count 0; years add up.
  assert.equal(pos.summary.courses, 27);
  assert.equal(pos.summary.units, 20 + 18 + 21 + 18);
  assert.equal(pos.summary.hrs, 27 + 28 + 27 + 20);
  assert.equal(pos.summary.byYear.reduce((n, y) => n + y.courses, 0), pos.summary.courses);
  assert.equal(pos.summary.byYear.reduce((n, y) => n + y.units, 0), pos.summary.units);
  const row213 = preview.json.rows.find((r) => r.cells['Course No.'] === 'BIT213L');
  assert.equal(row213.cells.Units, '2 LEC + 2 LAB = 4');
  assert.equal(row213.cells.Hours, '8/wk · 144/sem');
  assert.equal(row213.cells.Instructional, '128 h');
  assert.ok(!preview.json.rows.some((r) => r.cells['Course No.'] === 'BIT123L'), 'only the term\'s semester is imported');

  // --- 1. Commit: two active rows, two files; leftovers archived, BIT202's assignment moved (8)
  const archiveIds = pos.reconcile.filter((r) => r.decision === 'archive').map((r) => r.course_id);
  const commit = await as.post('/courses/upload', form(pdfs, { ...fields, reconcile: { archive: archiveIds } }));
  assert.equal(commit.status, 201, JSON.stringify(commit.json));
  assert.equal(commit.json.inserted, 27);
  const docs1 = await db.CurriculumDocument.findAll({ where: { program_id: prog.id, status: 'active' }, order: [['id', 'ASC']] });
  assert.deepEqual(docs1.map((d) => d.part_label), ['1st–2nd Year', '3rd–4th Year']);
  assert.ok(docs1.every((d) => d.revision === '04' && d.cmo === 'CMO No. 25 S. 2015'));
  assert.equal((await storageFiles(storage)).length, 2);
  const batch1 = await db.ImportBatch.findByPk(docs1[0].import_batch_id);
  assert.ok(batch1, 'the documents carry their import batch');
  for (const c of [old201, old202, old205]) assert.equal((await db.Course.findByPk(c.course_id)).archived, true, c.course_no);
  const bit213 = await db.Course.findOne({ where: { period_id: P.id, course_no: 'BIT213L' } });
  assert.equal(bit213.credit, '2 LEC, 2 LAB');
  assert.equal(bit213.contact_hrs, '2 Hrs Lec, 6 Hrs Lab');
  const moved = await db.CourseOfferingAssignment.findAll({ where: { period_id: P.id } });
  assert.equal(moved.length, 1);
  assert.equal(moved[0].course_code, 'BIT213L');
  assert.equal(moved[0].faculty_name, 'Test Faculty');
  assert.ok(await db.CourseAssignmentHistory.findOne({ where: { period_id: P.id, note: 'Merged from BIT202' } }), 'the move is in the history');

  // The course API returns the numbers and the source file.
  const detail = await as.get('/courses/' + bit213.course_id);
  assert.equal(detail.json.numbers.instructional_hrs, 128);
  assert.equal(detail.json.source.part_label, '1st–2nd Year');
  const listed = await as.get('/courses?period_id=' + P.id);
  assert.equal(listed.json.find((c) => c.course_no === 'BIT111L').numbers.instructional_hrs, 80);

  // --- 5. The list and the file
  const list = await as.get('/curriculum-documents?program_id=' + prog.id);
  assert.equal(list.status, 200);
  assert.equal(list.json.active.length, 2);
  assert.equal(list.json.active[0].url, '/api/curriculum-documents/' + docs1[0].id + '/file');
  assert.equal(list.json.active[0].uploaded_by_name, 'POS Test Head');
  const file = await as.get('/curriculum-documents/' + docs1[0].id + '/file', { raw: true });
  assert.equal(file.status, 200);
  assert.equal(file.headers.get('content-type'), 'application/pdf');
  assert.match(file.headers.get('content-disposition'), /^inline; filename="Rev-2-_BSIT-_-PROGRAM-OF-STUDY-1\.pdf"/);
  assert.equal(file.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(file.headers.get('cache-control'), 'private, max-age=300');
  assert.ok(file.buf.equals(pdfs[0].buf), 'the very same bytes');
  const dl = await as.get('/curriculum-documents/' + docs1[0].id + '/file?download=1', { raw: true });
  assert.match(dl.headers.get('content-disposition'), /^attachment;/);
  const anon = client(base);
  assert.equal((await anon.get('/curriculum-documents/' + docs1[0].id + '/file', { raw: true })).status, 401);
  assert.equal((await anon.get('/curriculum-documents?program_id=' + prog.id)).status, 401);

  // --- 6. Path safety: only a plain sha256 resolves, and only inside the folder
  for (const bad of ['../../etc/passwd', '..', 'a'.repeat(63), 'A'.repeat(64), 'a'.repeat(64) + '/../x', '']) {
    assert.equal(storedPath(bad), null, JSON.stringify(bad));
  }
  assert.equal(path.dirname(storedPath('b'.repeat(64))), path.resolve(storage));
  const tampered = await db.CurriculumDocument.create({ program_id: prog.id, sha256: '../../../../etc/passwd', original_name: 'x.pdf', status: 'active' }).catch(() => null);
  if (tampered) {
    assert.equal((await as.get('/curriculum-documents/' + tampered.id + '/file', { raw: true })).status, 404);
    await tampered.destroy();
  }
  for (const id of ['abc', '-1', '0', '1.5', '999999999']) {
    assert.equal((await as.get('/curriculum-documents/' + id + '/file', { raw: true })).status, 404, id);
  }

  // --- 2. Re-uploading the same files: no new rows, no new files
  const again = await as.post('/courses/upload', form(pdfs, fields));
  assert.equal(again.status, 201, JSON.stringify(again.json));
  assert.equal(again.json.inserted, 0);
  assert.equal(await db.CurriculumDocument.count({ where: { program_id: prog.id } }), 2);
  assert.equal((await storageFiles(storage)).length, 2);

  // --- 11. courses:dedupe on another term of the same program
  const C = await makePeriod('2101-2102', 1).then(async (p) => p);
  const progC = await makeProgram(C.id);
  await seedCourse(C.id, progC.id, { course_no: 'BIT211L', course_title: 'Database Management (Info Mgt) 1', year_lvl: 'SECOND YEAR' });
  const c213 = await seedCourse(C.id, progC.id, { course_no: 'BIT213L', course_title: 'Object-Oriented Programming', year_lvl: 'SECOND YEAR' });
  const c202 = await seedCourse(C.id, progC.id, { course_no: 'BIT202', course_title: 'Object-Oriented Programming', year_lvl: 'SECOND YEAR' });
  await seedCourse(C.id, progC.id, { course_no: 'BIT201', course_title: 'Database Systems', year_lvl: 'SECOND YEAR' });
  await seedCourse(C.id, progC.id, { course_no: 'BIT205', course_title: 'Data Structures and Algorithms', year_lvl: 'SECOND YEAR' });
  await seedCourse(C.id, progC.id, { course_no: 'BIT212L', course_title: 'Web Development 1', year_lvl: 'SECOND YEAR' });
  await seedCourse(C.id, progC.id, { course_no: 'bit212l ', course_title: 'Web Development 1', year_lvl: 'SECOND YEAR' });
  await seedCourse(C.id, progC.id, { course_no: 'BIT999', course_title: 'Hand-added Elective', year_lvl: 'SECOND YEAR' });
  const offC = await db.ProgramCourseOffering.findOne({ where: { course_id: c202.course_id } });
  await db.CourseOfferingAssignment.create({ course_code: 'BIT202', course_id: c202.course_id, pc_offering_id: offC.pc_offering_id, program_id: progC.id, faculty_name: 'Dedupe Faculty', status: 'Pending Match', period_id: C.id });

  const before = JSON.stringify(await db.Course.findAll({ where: { period_id: C.id }, raw: true, order: [['course_id', 'ASC']] }));
  const plan = await planDedupe({ periodId: C.id });
  assert.equal(JSON.stringify(await db.Course.findAll({ where: { period_id: C.id }, raw: true, order: [['course_id', 'ASC']] })), before, 'the dry run changes nothing');
  const archives = plan.filter((a) => a.archive).map((a) => a.archive.course_no.trim().toUpperCase()).sort();
  assert.deepEqual(archives, ['BIT201', 'BIT202', 'BIT205', 'BIT212L']);
  assert.ok(!plan.some((a) => a.archive && a.archive.course_no === 'BIT999'), 'a real hand-added course is left alone');
  const applied = await applyDedupe(plan.filter((a) => a.archive));
  assert.equal(applied.archived, 4);
  assert.equal(applied.moved.assignments, 1);
  const movedC = await db.CourseOfferingAssignment.findOne({ where: { period_id: C.id } });
  assert.equal(movedC.course_id, c213.course_id);
  assert.equal(await db.Course.count({ where: { period_id: C.id } }), 8, 'archived, never deleted');
  assert.deepEqual((await planDedupe({ periodId: C.id })).filter((a) => a.archive), [], 'a second run finds nothing');

  // --- 3. A new revision (different files) supersedes the old rows
  const newer = pdfs.map((p) => ({ name: p.name.replace('Rev-2', 'Rev-3'), buf: Buffer.concat([p.buf, Buffer.from('\n%new revision\n')]) }));
  const rev = await as.post('/courses/upload', form(newer, fields));
  assert.equal(rev.status, 201, JSON.stringify(rev.json));
  const after = await as.get('/curriculum-documents?program_id=' + prog.id);
  assert.equal(after.json.active.length, 2);
  assert.ok(after.json.active.every((d) => d.original_name.startsWith('Rev-3')));
  assert.deepEqual(after.json.previous.map((d) => d.id).sort(), docs1.map((d) => d.id).sort());
  assert.equal((await storageFiles(storage)).length, 4);

  // --- 4. Undo of that import: its rows removed, the old ones active, its files gone
  const revDocs = await db.CurriculumDocument.findAll({ where: { program_id: prog.id, status: 'active' } });
  const undone = await undoBatchDocuments(revDocs[0].import_batch_id);
  assert.equal(undone.removed, 2);
  assert.equal(undone.restored, 2);
  assert.equal(undone.deletedFiles.length, 2);
  assert.deepEqual((await db.CurriculumDocument.findAll({ where: { program_id: prog.id, status: 'active' } })).map((d) => d.id).sort(), docs1.map((d) => d.id).sort());
  assert.deepEqual((await storageFiles(storage)).sort(), docs1.map((d) => d.sha256 + '.pdf').sort());
  // 5. A removed row answers 404.
  assert.equal((await as.get('/curriculum-documents/' + revDocs[0].id + '/file', { raw: true })).status, 404);

  // --- 8. Undo of the first import puts the leftovers and the assignment back
  await restoreSnapshot('courses', P.id, JSON.parse(batch1.snapshot));
  await undoBatchDocuments(batch1.id);
  for (const c of [old201, old202, old205]) assert.equal((await db.Course.findByPk(c.course_id)).archived, false, c.course_no);
  const back = await db.CourseOfferingAssignment.findAll({ where: { period_id: P.id } });
  assert.deepEqual(back.map((a) => a.course_code), ['BIT202']);
  assert.equal(await db.Course.count({ where: { period_id: P.id, course_no: 'BIT213L' } }), 0);
  assert.equal(await db.CurriculumDocument.count({ where: { program_id: prog.id, status: 'active' } }), 0);
  assert.deepEqual(await storageFiles(storage), [], 'nothing points at the files any more');

  // --- 10. Re-uploading a spreadsheet row with an existing code updates it
  const csv = Buffer.from('Course No.,Course Title,Year Level\nBIT202,Object-Oriented Programming (renamed),2nd Year\n');
  const xl = await as.post('/courses/upload', form([{ name: 'courses.csv', buf: csv, type: 'text/csv' }], fields));
  assert.equal(xl.status, 201, JSON.stringify(xl.json));
  assert.equal(xl.json.inserted, 0);
  assert.equal(xl.json.updated, 1);
  assert.equal(await db.Course.count({ where: { period_id: P.id, course_no: 'BIT202' } }), 1);

  // createCourse: an existing code is updated; a same-title course asks first.
  const dupCode = await as.post('/courses', { period_id: P.id, course_no: 'bit202', course_title: 'Object-Oriented Programming' });
  assert.equal(dupCode.status, 200);
  assert.equal(dupCode.json.updated_existing, true);
  const dupTitle = await as.post('/courses', { period_id: P.id, course_no: 'BIT777', course_title: 'Object Oriented Programming' });
  assert.equal(dupTitle.status, 409);
  assert.equal(dupTitle.json.message, 'BIT202 — Object-Oriented Programming already exists. Add anyway?');
  assert.equal((await as.post('/courses', { period_id: P.id, course_no: 'BIT777', course_title: 'Object Oriented Programming', confirm_duplicate: true })).status, 201);

  // --- 9. Clone: archived courses stay behind, no code twice
  const A = await makePeriod('2201-2202', 1);
  const B = await makePeriod('2201-2202', 2);
  await seedCourse(A.id, null, { course_no: 'BIT301', course_title: 'Kept', year_lvl: 'THIRD YEAR' });
  await seedCourse(A.id, null, { course_no: 'bit301', course_title: 'Same code again', year_lvl: 'THIRD YEAR' });
  await seedCourse(A.id, null, { course_no: 'BIT302', course_title: 'Archived leftover', year_lvl: 'THIRD YEAR', archived: true });
  await seedCourse(B.id, null, { course_no: 'BIT303', course_title: 'Already here', year_lvl: 'THIRD YEAR' });
  await seedCourse(A.id, null, { course_no: 'BIT303', course_title: 'Already here (old)', year_lvl: 'THIRD YEAR' });
  const cloned = await cloneCurriculumFromPriorPeriod(B.id);
  assert.equal(cloned.source, A.id);
  const bCodes = (await db.Course.findAll({ where: { period_id: B.id }, raw: true })).map((c) => c.course_no.trim().toUpperCase()).sort();
  assert.deepEqual(bCodes, ['BIT301', 'BIT303']);
});
