/**
 * npm run demo:reset            (Docker: docker exec -it ca-api npm run demo:reset)
 * npm run demo:reset -- --yes   no question asked (scripts, e2e)
 *
 * Puts the database in the demo state, the same every time:
 *   1. refuses to run with NODE_ENV=production;
 *   2. asks first (unless --yes): it ERASES every upload, term and account;
 *   3. purges the data (utils/freshStart.js, as npm run db:fresh) and
 *   4. seeds the admin and the demo accounts (utils/seedUsers.js);
 *   5. creates the term: 1st Semester of the current school year, with the
 *      sample calendar's dates (the 2026-2027 school calendar, moved to this
 *      school year);
 *   6. loads the sample files in order — departments → faculty → programs →
 *      courses → course assignments → industry consultants — through the real upload routes: the
 *      app is started in this process and the files are posted as the demo
 *      VPAA, Dean and Program Head, so the same middleware, checks and
 *      controllers run as for a person uploading. The demo consultant's sample
 *      course (BIT302) isn't in the BSIT catalog, so they are given BSIT's first
 *      3rd-year course through the Program Head's Manage route;
 *   7. prints a summary and the demo sign-in emails. Never the passwords:
 *      they stay in server/.env (ADMIN_PASSWORD) and utils/seedUsers.js.
 *
 * Quiet: nothing the reset loads is emailed, whatever MAIL_MODE says — mail is
 * off inside this process (some upload paths email at once). What the uploads
 * would have sent shows as not sent / held; the invitations they scheduled
 * wait (Invite now sends one), and the term's assignments count as already
 * told, as after a deploy.
 *
 * Files: sample-uploads/ (departments, faculty, programs, course assignments)
 * and tests/fixtures/programOfStudy/ (the BSIT Program of Study, both parts).
 */
import path from 'node:path';
import fs from 'node:fs/promises';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import db from '../models/index.js';
import api from '../routes/index.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { prepareSchema } from '../utils/prepareSchema.js';
import { freshStart, extraTables, planTables, assertNotProduction, FreshStartError } from '../utils/freshStart.js';
import { DEMO_ACCOUNTS } from '../utils/seedUsers.js';
import { currentState, recordTold } from '../services/notices.js';
import { storageDir as curriculumStorageDir } from '../services/curriculumDocuments.js';
import { storageDir as calendarStorageDir } from '../services/schoolCalendars.js';

dotenv.config();

const here = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.resolve(here, '..');
const SAMPLES = path.resolve(SERVER, '..', 'sample-uploads');
const POS_DIR = path.resolve(SERVER, 'tests', 'fixtures', 'programOfStudy');

export const DEMO_FILES = Object.freeze({
  departments: path.join(SAMPLES, 'sample_departments.xlsx'),
  faculty: path.join(SAMPLES, 'sample_faculty.xlsx'),
  programs: path.join(SAMPLES, 'sample_programs.xlsx'),
  courses: [path.join(POS_DIR, 'Rev-2-_BSIT-_-PROGRAM-OF-STUDY-1.pdf'), path.join(POS_DIR, 'Rev-2-_BSIT-_-PROGRAM-OF-STUDY-2.pdf')],
  assignments: path.join(SAMPLES, 'sample_course_assignments_1st_sem.xls'),
  consultants: path.join(SAMPLES, 'sample_industry_consultants.xlsx'),
});
export const DEMO_PROGRAM = 'BSIT';

// The sample school calendar's 1st Semester (sample-uploads/school_calendar_2026-2027.png).
const SAMPLE_FIRST_SEM_2026 = {
  start_date: '2026-07-20', classes_start: '2026-07-20', prelim_exam: '2026-08-20',
  midterm_exam: '2026-09-25', semifinal_exam: '2026-10-23', final_exam: '2026-11-21', end_date: '2026-11-25',
};

/** "2026-2027" for a date: a school year starts in June. */
export function schoolYearOf(now = new Date()) {
  const y = now.getFullYear();
  const start = now.getMonth() >= 5 ? y : y - 1;
  return start + '-' + (start + 1);
}

/**
 * The demo term: 1st Semester of `schoolYear`, the sample dates moved to it.
 * An end date already past is left empty, so the demo term stays the open,
 * current one instead of closing itself on the next page load.
 */
export function demoTerm(schoolYear, today = new Date()) {
  const shift = Number(schoolYear.slice(0, 4)) - 2026;
  const dates = {};
  for (const [k, v] of Object.entries(SAMPLE_FIRST_SEM_2026)) dates[k] = (Number(v.slice(0, 4)) + shift) + v.slice(4);
  const todayYmd = today.toISOString().slice(0, 10);
  if (dates.end_date < todayYmd) dates.end_date = null;
  return { label: '1st Semester ' + schoolYear, school_year: schoolYear, semester: '1', ...dates };
}

async function confirm() {
  if (process.argv.includes('--yes')) return true;
  if (!process.stdin.isTTY) {
    console.error('[demo] This erases the database. Run it in a terminal to confirm, or pass --yes.');
    return false;
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const target = (process.env.DB_HOST || '127.0.0.1') + ':' + (process.env.DB_PORT || 3307) + '/' + (process.env.DB_NAME || 'course_assignment');
  const answer = await rl.question('Erase ' + target + ' (every upload, term and account) and load the demo? Type "reset" to go on: ');
  rl.close();
  return answer.trim().toLowerCase() === 'reset';
}

let heldTotal = 0;

/** A tiny client for the app started below: cookie session, JSON or multipart. */
function client(base) {
  let cookie = null;
  const call = async (method, p, body) => {
    const headers = { connection: 'close' };
    if (cookie) headers.cookie = cookie;
    let payload;
    if (body instanceof FormData) payload = body;
    else if (body !== undefined) { headers['content-type'] = 'application/json'; payload = JSON.stringify(body); }
    const res = await fetch(base + p, { method, headers, body: payload });
    const set = res.headers.get('set-cookie');
    if (set) { const pair = set.split(';')[0]; cookie = pair.endsWith('=') ? null : pair; }
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not JSON */ }
    return { status: res.status, json };
  };
  return { get: (p) => call('GET', p), post: (p, b) => call('POST', p, b), patch: (p, b) => call('PATCH', p, b) };
}

async function signIn(base, role) {
  const demo = DEMO_ACCOUNTS.find((a) => a.roles[0] === role || a.roles.includes(role));
  if (!demo) throw new Error('No demo account with the ' + role + ' role (utils/seedUsers.js).');
  const c = client(base);
  const r = await c.post('/auth/login', { email: demo.email, password: demo.password });
  if (r.status !== 200) throw new Error('Could not sign in as the demo ' + role + ' (' + r.status + ').');
  return c;
}

async function form(files, fields) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, String(v));
  for (const f of [].concat(files)) fd.append('file', new Blob([await fs.readFile(f)]), path.basename(f));
  return fd;
}

async function upload(c, route, files, fields, what) {
  const r = await c.post(route, await form(files, fields));
  heldTotal += await quiet(fields.period_id);
  if (r.status !== 200 && r.status !== 201) {
    throw new Error(what + ' upload failed (' + r.status + '): ' + ((r.json && r.json.message) || 'no message'));
  }
  return r.json || {};
}

/**
 * Hold what an upload queued, before an API's email worker (every 15 s) can
 * send it: uploads queue invitations and notices ~40 s ahead (the undo window),
 * so this runs right after each one. Returns how many invitations it held.
 */
async function quiet(periodId) {
  const [held] = await db.AccountInvitation.update({ status: 'waiting', send_after: null }, { where: { status: 'scheduled' } });
  const dirty = await db.AccountNotice.findAll({ where: { period_id: periodId, dirty: true } });
  for (const n of dirty) {
    const account = await db.UserAccount.findByPk(n.user_account_id);
    if (account) await recordTold(account.id, periodId, await currentState(account, periodId), { result: 'Loaded by the demo reset; not emailed.' });
    await n.reload();
    await n.update({ dirty: false, first_dirty_at: null });
  }
  return held;
}

async function main() {
  assertNotProduction(process.env);
  // Nothing leaves this process: the demo's people are real UNC addresses.
  process.env.MAIL_MODE = 'off';
  if (!(await confirm())) { console.log('[demo] Nothing changed.'); return 1; }
  for (const f of [DEMO_FILES.departments, DEMO_FILES.faculty, DEMO_FILES.programs, ...DEMO_FILES.courses, DEMO_FILES.assignments, DEMO_FILES.consultants]) {
    await fs.access(f).catch(() => { throw new Error('Missing sample file: ' + path.relative(path.resolve(SERVER, '..'), f)); });
  }

  const { sequelize, ...models } = db;
  await sequelize.authenticate();
  await prepareSchema(); // an empty database gets its tables, as the API's boot would make them

  // 3–4. Purge and seed (the db:fresh steps).
  const known = planTables(models).wipe;
  const extra = await extraTables(sequelize, known);
  await freshStart({
    sequelize, models, env: process.env, extra,
    uploadsDir: path.join(SERVER, 'uploads'),
    // The folders the app itself uses (CURRICULUM_STORAGE_DIR / SCHOOL_CALENDAR_STORAGE_DIR).
    curriculumDir: curriculumStorageDir(),
    calendarsDir: calendarStorageDir(),
  });
  console.log('[demo] data purged, demo accounts seeded');

  // The app, in this process, on a free port. No email worker.
  const app = express();
  app.use(express.json());
  app.use('/api', api);
  app.use(errorHandler);
  const server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const base = 'http://127.0.0.1:' + server.address().port + '/api';
  try {
    const vpaa = await signIn(base, 'VPAA');
    const dean = await signIn(base, 'Dean');

    // 5. The term.
    const term = demoTerm(schoolYearOf());
    const created = await vpaa.post('/academic-periods', term);
    if (created.status !== 201) throw new Error('Could not create the term: ' + ((created.json && created.json.message) || created.status));
    const period_id = created.json.id;
    console.log('[demo] term: ' + term.label + (term.end_date ? '' : ' (no end date: the sample one has passed)'));

    // 6. The sample files, in order.
    const d = await upload(vpaa, '/departments/upload', DEMO_FILES.departments, { period_id }, 'Department List');
    const f = await upload(dean, '/faculty/upload', DEMO_FILES.faculty, { period_id }, 'Faculty List');
    const p = await upload(dean, '/programs/upload', DEMO_FILES.programs, { period_id }, 'Program List');
    const programs = (await dean.get('/programs?period_id=' + period_id)).json || [];
    const program = programs.find((x) => x.code === DEMO_PROGRAM);
    if (!program) throw new Error('The program list has no ' + DEMO_PROGRAM + '.');
    // The Program Head signs in after the program list made them its head.
    const head = await signIn(base, 'Program Head');
    const c = await upload(head, '/courses/upload', DEMO_FILES.courses, { period_id, programId: program.id }, 'Program of Study');
    const a = await upload(head, '/course-offering-assignments/upload', DEMO_FILES.assignments, { period_id, program_id: program.id }, 'Course Assignment');
    const ic = await upload(head, '/industry-consultants/upload', DEMO_FILES.consultants, { period_id, program_id: program.id }, 'Industry Consultant');
    // The demo consultant gets a course that exists this term (theirs in the sample doesn't).
    const consultantDemo = DEMO_ACCOUNTS.find((x) => x.roles.includes('Industry Consultant'));
    const consultants = (await head.get('/industry-consultants?period_id=' + period_id)).json || [];
    const mine = (Array.isArray(consultants) ? consultants : consultants.rows || []).find((x) => String(x.name).toLowerCase().includes(consultantDemo.display_name.toLowerCase()));
    const courseRows = (await head.get('/courses?period_id=' + period_id)).json || [];
    const third = courseRows.filter((x) => /third/i.test(String(x.year_lvl)) && !x.archived).map((x) => x.course_no).sort()[0];
    if (mine && third) {
      const r = await head.patch('/industry-consultants/' + mine.id + '/assign?period_id=' + period_id, { assigned_course_codes: [third], status: 'Active' });
      heldTotal += await quiet(period_id);
      if (r.status !== 200) throw new Error('Could not give ' + consultantDemo.display_name + ' a course (' + r.status + '): ' + ((r.json && r.json.message) || ''));
      console.log('[demo] ' + consultantDemo.display_name + ' (Industry Consultant) consults on ' + third);
    }

    const held = heldTotal + await quiet(period_id);

    // 7. Summary.
    const count = (Model) => Model.count({ where: { period_id } });
    const counts = {
      departments: await count(db.Department), faculty: await count(db.Faculty), programs: await count(db.Program),
      courses: await count(db.Course), 'course assignments': await count(db.CourseOfferingAssignment),
      'industry consultants': await count(db.IndustryConsultant),
    };
    console.log('[demo] loaded into ' + term.label + ':');
    for (const [k, v] of Object.entries(counts)) console.log('  ' + k.padEnd(22) + v);
    console.log('  (uploads reported: ' + [d.inserted, f.inserted, p.inserted, c.inserted, a.inserted, ic.inserted].map((n) => n ?? '?').join(' · ') + ')');
    console.log('[demo] ' + held + ' invitation(s) from the uploads are waiting, not sent (Invite now sends one).');
    console.log('[demo] sign in as (passwords: server/utils/seedUsers.js; the admin: ADMIN_PASSWORD in server/.env):');
    for (const acc of DEMO_ACCOUNTS) console.log('  ' + acc.roles.join(' + ').padEnd(28) + acc.email);
    if (process.env.ADMIN_EMAIL) console.log('  ' + 'Admin (VPAA)'.padEnd(28) + process.env.ADMIN_EMAIL);
    return 0;
  } finally {
    await new Promise((r) => server.close(r));
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  let code = 1;
  try {
    code = await main();
  } catch (err) {
    console.error('[demo] ' + (err instanceof FreshStartError ? '' : 'failed: ') + err.message);
    code = 1;
  } finally {
    await db.sequelize.close().catch(() => {});
  }
  process.exit(code);
}
